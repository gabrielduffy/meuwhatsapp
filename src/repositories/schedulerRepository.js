const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CRUD BÁSICO ==========

// Criar mensagem agendada
async function createScheduledMessage(messageData) {
  const {
    instanceName,
    recipient,
    message,
    scheduledTime,
    mediaUrl = null,
    mediaType = null
  } = messageData;

  const result = await query(
    `INSERT INTO scheduled_messages
     (instance_name, recipient, message, scheduled_time, media_url, media_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [instanceName, recipient, message, scheduledTime, mediaUrl, mediaType]
  );

  // Invalidar cache
  await cache.invalidatePattern(`scheduled:${instanceName}:*`);

  return result.rows[0];
}

// Buscar mensagem agendada por ID
async function getScheduledMessageById(id) {
  const result = await query(
    'SELECT * FROM scheduled_messages WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

// Listar mensagens agendadas por instância
async function getScheduledMessagesByInstance(instanceName, options = {}) {
  const { status, limit = 100 } = options;

  let queryText = 'SELECT * FROM scheduled_messages WHERE instance_name = $1';
  const params = [instanceName];

  if (status) {
    queryText += ' AND status = $2';
    params.push(status);
  }

  queryText += ' ORDER BY scheduled_time ASC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(queryText, params);
  return result.rows;
}

// Atualizar status da mensagem agendada
async function updateScheduledMessageStatus(id, status, errorMessage = null) {
  const updates = ['status = $2'];
  const params = [id, status];
  let paramIndex = 3;

  if (status === 'sent') {
    updates.push('sent_at = NOW()');
  }

  if (errorMessage) {
    updates.push(`error_message = $${paramIndex}`);
    params.push(errorMessage);
    paramIndex++;
  }

  const result = await query(
    `UPDATE scheduled_messages
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`scheduled:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Incrementar contador de retry
async function incrementRetryCount(id) {
  const result = await query(
    `UPDATE scheduled_messages
     SET retry_count = retry_count + 1
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
}

// Deletar mensagem agendada
async function deleteScheduledMessage(id) {
  const result = await query(
    'DELETE FROM scheduled_messages WHERE id = $1 RETURNING *',
    [id]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`scheduled:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// ========== CONSULTAS ESPECIALIZADAS ==========

// Buscar mensagens pendentes para envio
async function getPendingMessages(limit = 50) {
  const result = await query(
    `SELECT * FROM scheduled_messages
     WHERE status = 'pending'
       AND scheduled_time <= NOW()
       AND retry_count < 3
     ORDER BY scheduled_time ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

// Buscar mensagens a enviar em breve (próximos N minutos)
async function getUpcomingMessages(instanceName, minutesAhead = 60) {
  const result = await query(
    `SELECT * FROM scheduled_messages
     WHERE instance_name = $1
       AND status = 'pending'
       AND scheduled_time > NOW()
       AND scheduled_time <= NOW() + INTERVAL '${minutesAhead} minutes'
     ORDER BY scheduled_time ASC`,
    [instanceName]
  );

  return result.rows;
}

// Cancelar mensagens agendadas por instância
async function cancelScheduledMessagesByInstance(instanceName) {
  const result = await query(
    `UPDATE scheduled_messages
     SET status = 'cancelled'
     WHERE instance_name = $1
       AND status = 'pending'
     RETURNING *`,
    [instanceName]
  );

  // Invalidar cache
  await cache.invalidatePattern(`scheduled:${instanceName}:*`);

  return result.rows;
}

// Estatísticas de mensagens agendadas
async function getScheduledStats(instanceName) {
  const cacheKey = `scheduled:${instanceName}:stats`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT
       status,
       COUNT(*) as count
     FROM scheduled_messages
     WHERE instance_name = $1
     GROUP BY status`,
    [instanceName]
  );

  const stats = {
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0
  };

  result.rows.forEach(row => {
    stats[row.status] = parseInt(row.count);
  });

  // Cachear por 2 minutos
  await cache.set(cacheKey, stats, 120);

  return stats;
}

// Limpar mensagens antigas (já enviadas ou canceladas)
async function cleanOldScheduledMessages(daysToKeep = 30) {
  const result = await query(
    `DELETE FROM scheduled_messages
     WHERE (status = 'sent' OR status = 'cancelled' OR status = 'failed')
       AND created_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('scheduled:*');

  return result.rowCount;
}

// Reagendar mensagem
async function rescheduleMessage(id, newScheduledTime) {
  const result = await query(
    `UPDATE scheduled_messages
     SET scheduled_time = $2, status = 'pending', retry_count = 0, error_message = NULL
     WHERE id = $1
     RETURNING *`,
    [id, newScheduledTime]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`scheduled:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Buscar histórico de mensagens enviadas
async function getSentMessagesHistory(instanceName, limit = 100) {
  const result = await query(
    `SELECT * FROM scheduled_messages
     WHERE instance_name = $1
       AND status = 'sent'
     ORDER BY sent_at DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

module.exports = {
  createScheduledMessage,
  getScheduledMessageById,
  getScheduledMessagesByInstance,
  updateScheduledMessageStatus,
  incrementRetryCount,
  deleteScheduledMessage,
  getPendingMessages,
  getUpcomingMessages,
  cancelScheduledMessagesByInstance,
  getScheduledStats,
  cleanOldScheduledMessages,
  rescheduleMessage,
  getSentMessagesHistory
};
