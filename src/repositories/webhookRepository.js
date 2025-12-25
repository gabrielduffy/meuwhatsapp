const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CONFIGURAÇÕES ==========

// Criar ou atualizar configuração de webhook
async function upsertWebhookConfig(instanceName, config) {
  const {
    url,
    enabled = true,
    eventTypes = ['all'],
    headers = {},
    maxRetries = 3,
    retryDelay = 5000,
    backoffMultiplier = 2.0,
    timeout = 30000
  } = config;

  const result = await query(
    `INSERT INTO webhook_configs
     (instance_name, url, enabled, event_types, headers, max_retries,
      retry_delay, backoff_multiplier, timeout)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (instance_name)
     DO UPDATE SET
       url = EXCLUDED.url,
       enabled = EXCLUDED.enabled,
       event_types = EXCLUDED.event_types,
       headers = EXCLUDED.headers,
       max_retries = EXCLUDED.max_retries,
       retry_delay = EXCLUDED.retry_delay,
       backoff_multiplier = EXCLUDED.backoff_multiplier,
       timeout = EXCLUDED.timeout,
       updated_at = NOW()
     RETURNING *`,
    [
      instanceName,
      url,
      enabled,
      JSON.stringify(eventTypes),
      JSON.stringify(headers),
      maxRetries,
      retryDelay,
      backoffMultiplier,
      timeout
    ]
  );

  // Invalidar cache
  await cache.del(`webhook:config:${instanceName}`);

  return result.rows[0];
}

// Buscar configuração de webhook
async function getWebhookConfig(instanceName) {
  // Tentar cache
  const cacheKey = `webhook:config:${instanceName}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM webhook_configs WHERE instance_name = $1',
    [instanceName]
  );

  const config = result.rows[0] || null;

  // Cachear por 5 minutos
  if (config) {
    await cache.set(cacheKey, config, 300);
  }

  return config;
}

// Habilitar/desabilitar webhook
async function toggleWebhook(instanceName, enabled) {
  const result = await query(
    `UPDATE webhook_configs
     SET enabled = $2, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, enabled]
  );

  // Invalidar cache
  await cache.del(`webhook:config:${instanceName}`);

  return result.rows[0];
}

// Deletar configuração de webhook
async function deleteWebhookConfig(instanceName) {
  const result = await query(
    'DELETE FROM webhook_configs WHERE instance_name = $1 RETURNING *',
    [instanceName]
  );

  // Invalidar cache
  await cache.del(`webhook:config:${instanceName}`);

  return result.rows[0];
}

// Listar todas as configurações de webhook
async function getAllWebhookConfigs() {
  const result = await query(
    'SELECT * FROM webhook_configs ORDER BY instance_name'
  );

  return result.rows;
}

// Buscar webhooks ativos
async function getActiveWebhookConfigs() {
  const result = await query(
    'SELECT * FROM webhook_configs WHERE enabled = true ORDER BY instance_name'
  );

  return result.rows;
}

// ========== LOGS ==========

// Adicionar log de webhook
async function addWebhookLog(logData) {
  const {
    instanceName,
    eventType,
    url,
    status,
    statusCode = null,
    attempt = 1,
    durationMs = null,
    errorMessage = null,
    errorType = null,
    responseBody = null
  } = logData;

  const result = await query(
    `INSERT INTO webhook_logs
     (instance_name, event_type, url, status, status_code, attempt,
      duration_ms, error_message, error_type, response_body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      instanceName,
      eventType,
      url,
      status,
      statusCode,
      attempt,
      durationMs,
      errorMessage,
      errorType,
      responseBody
    ]
  );

  // Invalidar cache de logs
  await cache.invalidatePattern(`webhook:logs:${instanceName}:*`);

  return result.rows[0];
}

// Buscar logs de webhook
async function getWebhookLogs(instanceName, options = {}) {
  const { eventType, status, since, limit = 100 } = options;

  let queryText = 'SELECT * FROM webhook_logs WHERE instance_name = $1';
  const params = [instanceName];
  let paramIndex = 2;

  if (eventType) {
    queryText += ` AND event_type = $${paramIndex}`;
    params.push(eventType);
    paramIndex++;
  }

  if (status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (since) {
    queryText += ` AND created_at >= $${paramIndex}`;
    params.push(since);
    paramIndex++;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(queryText, params);
  return result.rows;
}

// Limpar logs de webhook
async function clearWebhookLogs(instanceName) {
  const result = await query(
    'DELETE FROM webhook_logs WHERE instance_name = $1 RETURNING COUNT(*)',
    [instanceName]
  );

  // Invalidar cache
  await cache.invalidatePattern(`webhook:logs:${instanceName}:*`);

  return result.rowCount;
}

// Limpar logs antigos
async function cleanOldWebhookLogs(daysToKeep = 30) {
  const result = await query(
    `DELETE FROM webhook_logs
     WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('webhook:logs:*');

  return result.rowCount;
}

// ========== ESTATÍSTICAS ==========

// Obter estatísticas de webhook
async function getWebhookStats(instanceName, period = 'day') {
  const cacheKey = `webhook:stats:${instanceName}:${period}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  let interval;
  switch (period) {
    case 'hour':
      interval = '1 hour';
      break;
    case 'day':
      interval = '1 day';
      break;
    case 'week':
      interval = '7 days';
      break;
    case 'month':
      interval = '30 days';
      break;
    default:
      interval = '1 day';
  }

  const result = await query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       AVG(duration_ms) as avg_duration,
       MAX(duration_ms) as max_duration,
       MIN(duration_ms) as min_duration
     FROM webhook_logs
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${interval}'`,
    [instanceName]
  );

  const stats = result.rows[0];

  // Converter para números
  stats.total = parseInt(stats.total) || 0;
  stats.success = parseInt(stats.success) || 0;
  stats.error = parseInt(stats.error) || 0;
  stats.failed = parseInt(stats.failed) || 0;
  stats.avg_duration = Math.round(parseFloat(stats.avg_duration)) || 0;
  stats.max_duration = parseInt(stats.max_duration) || 0;
  stats.min_duration = parseInt(stats.min_duration) || 0;

  // Calcular taxa de sucesso
  if (stats.total > 0) {
    stats.success_rate = Math.round((stats.success / stats.total) * 100);
  } else {
    stats.success_rate = 0;
  }

  // Estatísticas por tipo de evento
  const byEventTypeResult = await query(
    `SELECT
       event_type,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
       SUM(CASE WHEN status = 'error' OR status = 'failed' THEN 1 ELSE 0 END) as errors
     FROM webhook_logs
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${interval}'
     GROUP BY event_type`,
    [instanceName]
  );

  stats.by_event_type = {};
  byEventTypeResult.rows.forEach(row => {
    stats.by_event_type[row.event_type] = {
      total: parseInt(row.total),
      success: parseInt(row.success),
      errors: parseInt(row.errors)
    };
  });

  // Cachear por 5 minutos
  await cache.set(cacheKey, stats, 300);

  return stats;
}

// Obter logs com erro
async function getFailedWebhookLogs(instanceName, limit = 50) {
  const result = await query(
    `SELECT * FROM webhook_logs
     WHERE instance_name = $1
       AND (status = 'error' OR status = 'failed')
     ORDER BY created_at DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

// Estatísticas agregadas por data
async function getWebhookStatsByDate(instanceName, days = 7) {
  const result = await query(
    `SELECT
       DATE(created_at) as date,
       COUNT(*) as total_calls,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls,
       SUM(CASE WHEN status = 'error' OR status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
       AVG(duration_ms) as avg_duration_ms
     FROM webhook_logs
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [instanceName]
  );

  return result.rows;
}

module.exports = {
  // Configs
  upsertWebhookConfig,
  getWebhookConfig,
  toggleWebhook,
  deleteWebhookConfig,
  getAllWebhookConfigs,
  getActiveWebhookConfigs,
  // Logs
  addWebhookLog,
  getWebhookLogs,
  clearWebhookLogs,
  cleanOldWebhookLogs,
  // Stats
  getWebhookStats,
  getFailedWebhookLogs,
  getWebhookStatsByDate
};
