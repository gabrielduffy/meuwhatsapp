const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CRUD BÁSICO ==========

// Criar campanha de broadcast
async function createBroadcastCampaign(campaignData) {
  const {
    instanceName,
    campaignName,
    message,
    recipients,
    delayBetweenMessages = 1000,
    mediaUrl = null,
    mediaType = null
  } = campaignData;

  const result = await query(
    `INSERT INTO broadcast_campaigns
     (instance_name, campaign_name, message, recipients, total_recipients,
      delay_between_messages, media_url, media_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      instanceName,
      campaignName,
      message,
      JSON.stringify(recipients),
      recipients.length,
      delayBetweenMessages,
      mediaUrl,
      mediaType
    ]
  );

  // Invalidar cache
  await cache.invalidatePattern(`broadcast:${instanceName}:*`);

  return result.rows[0];
}

// Buscar campanha por ID
async function getBroadcastCampaignById(id) {
  const result = await query(
    'SELECT * FROM broadcast_campaigns WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

// Listar campanhas por instância
async function getBroadcastCampaignsByInstance(instanceName, options = {}) {
  const { status, limit = 100 } = options;

  let queryText = 'SELECT * FROM broadcast_campaigns WHERE instance_name = $1';
  const params = [instanceName];

  if (status) {
    queryText += ' AND status = $2';
    params.push(status);
  }

  queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(queryText, params);
  return result.rows;
}

// Atualizar status da campanha
async function updateBroadcastStatus(id, status) {
  const updates = ['status = $2'];
  const params = [id, status];

  if (status === 'running') {
    updates.push('started_at = NOW()');
  } else if (status === 'completed' || status === 'failed') {
    updates.push('completed_at = NOW()');
  }

  const result = await query(
    `UPDATE broadcast_campaigns
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Atualizar contadores de envio
async function updateBroadcastCounters(id, sentIncrement = 0, failedIncrement = 0) {
  const result = await query(
    `UPDATE broadcast_campaigns
     SET sent_count = sent_count + $2,
         failed_count = failed_count + $3
     WHERE id = $1
     RETURNING *`,
    [id, sentIncrement, failedIncrement]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Deletar campanha
async function deleteBroadcastCampaign(id) {
  const result = await query(
    'DELETE FROM broadcast_campaigns WHERE id = $1 RETURNING *',
    [id]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// ========== CONSULTAS ESPECIALIZADAS ==========

// Buscar campanhas pendentes
async function getPendingCampaigns(limit = 10) {
  const result = await query(
    `SELECT * FROM broadcast_campaigns
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

// Buscar campanhas em execução
async function getRunningCampaigns() {
  const result = await query(
    `SELECT * FROM broadcast_campaigns
     WHERE status = 'running'
     ORDER BY started_at ASC`
  );

  return result.rows;
}

// Obter progresso da campanha
async function getCampaignProgress(id) {
  const result = await query(
    `SELECT
       id,
       campaign_name,
       status,
       total_recipients,
       sent_count,
       failed_count,
       ROUND((sent_count::DECIMAL / NULLIF(total_recipients, 0)) * 100, 2) as progress_percentage,
       ROUND((failed_count::DECIMAL / NULLIF(sent_count + failed_count, 0)) * 100, 2) as failure_rate
     FROM broadcast_campaigns
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

// Estatísticas de broadcast
async function getBroadcastStats(instanceName) {
  const cacheKey = `broadcast:${instanceName}:stats`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT
       COUNT(*) as total_campaigns,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_campaigns,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_campaigns,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_campaigns,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_campaigns,
       SUM(sent_count) as total_messages_sent,
       SUM(failed_count) as total_messages_failed,
       SUM(total_recipients) as total_recipients
     FROM broadcast_campaigns
     WHERE instance_name = $1`,
    [instanceName]
  );

  const stats = result.rows[0];

  // Converter para inteiros
  Object.keys(stats).forEach(key => {
    stats[key] = parseInt(stats[key]) || 0;
  });

  // Calcular taxa de sucesso
  if (stats.total_messages_sent > 0) {
    stats.success_rate = Math.round(
      (stats.total_messages_sent / (stats.total_messages_sent + stats.total_messages_failed)) * 100
    );
  } else {
    stats.success_rate = 0;
  }

  // Cachear por 3 minutos
  await cache.set(cacheKey, stats, 180);

  return stats;
}

// Buscar campanhas recentes
async function getRecentCampaigns(instanceName, days = 7, limit = 50) {
  const result = await query(
    `SELECT * FROM broadcast_campaigns
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
     ORDER BY created_at DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

// Cancelar campanha pendente
async function cancelCampaign(id) {
  const result = await query(
    `UPDATE broadcast_campaigns
     SET status = 'cancelled', completed_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Pausar campanha em execução
async function pauseCampaign(id) {
  const result = await query(
    `UPDATE broadcast_campaigns
     SET status = 'paused'
     WHERE id = $1 AND status = 'running'
     RETURNING *`,
    [id]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Retomar campanha pausada
async function resumeCampaign(id) {
  const result = await query(
    `UPDATE broadcast_campaigns
     SET status = 'running'
     WHERE id = $1 AND status = 'paused'
     RETURNING *`,
    [id]
  );

  // Invalidar cache
  if (result.rows[0]) {
    await cache.invalidatePattern(`broadcast:${result.rows[0].instance_name}:*`);
  }

  return result.rows[0];
}

// Limpar campanhas antigas
async function cleanOldCampaigns(daysToKeep = 90) {
  const result = await query(
    `DELETE FROM broadcast_campaigns
     WHERE (status = 'completed' OR status = 'failed' OR status = 'cancelled')
       AND completed_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('broadcast:*');

  return result.rowCount;
}

module.exports = {
  createBroadcastCampaign,
  getBroadcastCampaignById,
  getBroadcastCampaignsByInstance,
  updateBroadcastStatus,
  updateBroadcastCounters,
  deleteBroadcastCampaign,
  getPendingCampaigns,
  getRunningCampaigns,
  getCampaignProgress,
  getBroadcastStats,
  getRecentCampaigns,
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
  cleanOldCampaigns
};
