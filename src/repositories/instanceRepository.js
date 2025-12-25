const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CRUD BÁSICO ==========

// Criar nova instância
async function createInstance(instanceData) {
  const {
    instanceName,
    webhookUrl = null,
    webhookEvents = ['all'],
    proxyConfig = null
  } = instanceData;

  const result = await query(
    `INSERT INTO instances (instance_name, webhook_url, webhook_events, proxy_config, status)
     VALUES ($1, $2, $3, $4, 'disconnected')
     RETURNING *`,
    [instanceName, webhookUrl, JSON.stringify(webhookEvents), proxyConfig ? JSON.stringify(proxyConfig) : null]
  );

  // Invalidar cache
  await cache.del(`instance:${instanceName}`);
  await cache.invalidatePattern('instances:*');

  return result.rows[0];
}

// Buscar instância por nome
async function getInstanceByName(instanceName) {
  // Tentar cache primeiro
  const cached = await cache.get(`instance:${instanceName}`);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM instances WHERE instance_name = $1',
    [instanceName]
  );

  const instance = result.rows[0] || null;

  // Cachear por 5 minutos
  if (instance) {
    await cache.set(`instance:${instanceName}`, instance, 300);
  }

  return instance;
}

// Listar todas as instâncias
async function getAllInstances() {
  // Tentar cache
  const cached = await cache.get('instances:all');
  if (cached) return cached;

  const result = await query('SELECT * FROM instances ORDER BY created_at DESC');

  // Cachear por 2 minutos
  await cache.set('instances:all', result.rows, 120);

  return result.rows;
}

// Atualizar status da instância
async function updateInstanceStatus(instanceName, status, additionalData = {}) {
  const updates = ['status = $2', 'updated_at = NOW()'];
  const params = [instanceName, status];
  let paramIndex = 3;

  if (status === 'connected') {
    updates.push(`last_connected_at = NOW()`);
  }

  if (additionalData.qrCode !== undefined) {
    updates.push(`qr_code = $${paramIndex}`);
    params.push(additionalData.qrCode);
    paramIndex++;
  }

  if (additionalData.phoneNumber !== undefined) {
    updates.push(`phone_number = $${paramIndex}`);
    params.push(additionalData.phoneNumber);
    paramIndex++;
  }

  if (additionalData.sessionData !== undefined) {
    updates.push(`session_data = $${paramIndex}`);
    params.push(JSON.stringify(additionalData.sessionData));
    paramIndex++;
  }

  const result = await query(
    `UPDATE instances SET ${updates.join(', ')} WHERE instance_name = $1 RETURNING *`,
    params
  );

  // Invalidar cache
  await cache.del(`instance:${instanceName}`);
  await cache.invalidatePattern('instances:*');

  return result.rows[0];
}

// Atualizar webhook da instância
async function updateInstanceWebhook(instanceName, webhookUrl, webhookEvents = ['all']) {
  const result = await query(
    `UPDATE instances
     SET webhook_url = $2, webhook_events = $3, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, webhookUrl, JSON.stringify(webhookEvents)]
  );

  // Invalidar cache
  await cache.del(`instance:${instanceName}`);
  await cache.invalidatePattern('instances:*');

  return result.rows[0];
}

// Deletar instância
async function deleteInstance(instanceName) {
  const result = await query(
    'DELETE FROM instances WHERE instance_name = $1 RETURNING *',
    [instanceName]
  );

  // Invalidar cache
  await cache.del(`instance:${instanceName}`);
  await cache.invalidatePattern('instances:*');

  return result.rows[0];
}

// ========== CONSULTAS ESPECIALIZADAS ==========

// Buscar instâncias por status
async function getInstancesByStatus(status) {
  const result = await query(
    'SELECT * FROM instances WHERE status = $1 ORDER BY created_at DESC',
    [status]
  );

  return result.rows;
}

// Contar instâncias por status
async function countInstancesByStatus() {
  const result = await query(
    `SELECT status, COUNT(*) as count
     FROM instances
     GROUP BY status`
  );

  const counts = {};
  result.rows.forEach(row => {
    counts[row.status] = parseInt(row.count);
  });

  return counts;
}

// Verificar se instância existe
async function instanceExists(instanceName) {
  const result = await query(
    'SELECT EXISTS(SELECT 1 FROM instances WHERE instance_name = $1)',
    [instanceName]
  );

  return result.rows[0].exists;
}

// Atualizar dados da sessão
async function updateSessionData(instanceName, sessionData) {
  const result = await query(
    `UPDATE instances
     SET session_data = $2, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, JSON.stringify(sessionData)]
  );

  // Invalidar cache
  await cache.del(`instance:${instanceName}`);

  return result.rows[0];
}

// Buscar instâncias com webhook configurado
async function getInstancesWithWebhook() {
  const result = await query(
    'SELECT * FROM instances WHERE webhook_url IS NOT NULL AND webhook_url != \'\''
  );

  return result.rows;
}

module.exports = {
  createInstance,
  getInstanceByName,
  getAllInstances,
  updateInstanceStatus,
  updateInstanceWebhook,
  deleteInstance,
  getInstancesByStatus,
  countInstancesByStatus,
  instanceExists,
  updateSessionData,
  getInstancesWithWebhook
};
