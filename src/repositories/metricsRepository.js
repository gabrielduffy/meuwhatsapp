const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CRUD BÁSICO ==========

// Adicionar métrica
async function addMetric(instanceName, metricType, value, metadata = null) {
  const result = await query(
    `INSERT INTO metrics (instance_name, metric_type, value, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [instanceName, metricType, value, metadata ? JSON.stringify(metadata) : null]
  );

  // Invalidar cache de métricas
  await cache.invalidatePattern(`metrics:${instanceName}:*`);

  return result.rows[0];
}

// Incrementar métrica (útil para contadores)
async function incrementMetric(instanceName, metricType, incrementBy = 1, metadata = null) {
  // Verificar se já existe uma métrica recente (última hora)
  const existing = await query(
    `SELECT * FROM metrics
     WHERE instance_name = $1 AND metric_type = $2
     AND created_at > NOW() - INTERVAL '1 hour'
     ORDER BY created_at DESC
     LIMIT 1`,
    [instanceName, metricType]
  );

  if (existing.rows.length > 0) {
    // Atualizar métrica existente
    const result = await query(
      `UPDATE metrics
       SET value = value + $3, metadata = $4
       WHERE id = $1
       RETURNING *`,
      [existing.rows[0].id, instanceName, incrementBy, metadata ? JSON.stringify(metadata) : existing.rows[0].metadata]
    );

    await cache.invalidatePattern(`metrics:${instanceName}:*`);
    return result.rows[0];
  } else {
    // Criar nova métrica
    return await addMetric(instanceName, metricType, incrementBy, metadata);
  }
}

// Buscar métricas por instância
async function getMetricsByInstance(instanceName, options = {}) {
  const { metricType, limit = 100, since } = options;

  let queryText = 'SELECT * FROM metrics WHERE instance_name = $1';
  const params = [instanceName];
  let paramIndex = 2;

  if (metricType) {
    queryText += ` AND metric_type = $${paramIndex}`;
    params.push(metricType);
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

// ========== ESTATÍSTICAS E AGREGAÇÕES ==========

// Obter resumo de métricas por período
async function getMetricsSummary(instanceName, period = 'day') {
  const cacheKey = `metrics:${instanceName}:summary:${period}`;
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
       metric_type,
       SUM(value) as total_value,
       COUNT(*) as count,
       AVG(value) as avg_value,
       MAX(value) as max_value,
       MIN(value) as min_value
     FROM metrics
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${interval}'
     GROUP BY metric_type`,
    [instanceName]
  );

  const summary = {};
  result.rows.forEach(row => {
    summary[row.metric_type] = {
      total: parseInt(row.total_value),
      count: parseInt(row.count),
      avg: parseFloat(row.avg_value),
      max: parseInt(row.max_value),
      min: parseInt(row.min_value)
    };
  });

  // Cachear por 5 minutos
  await cache.set(cacheKey, summary, 300);

  return summary;
}

// Obter total de uma métrica específica
async function getTotalMetric(instanceName, metricType, period = 'day') {
  const cacheKey = `metrics:${instanceName}:${metricType}:total:${period}`;
  const cached = await cache.get(cacheKey);
  if (cached !== null) return cached;

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
    case 'all':
      interval = null;
      break;
    default:
      interval = '1 day';
  }

  let queryText = `SELECT COALESCE(SUM(value), 0) as total
                   FROM metrics
                   WHERE instance_name = $1 AND metric_type = $2`;

  if (interval) {
    queryText += ` AND created_at >= NOW() - INTERVAL '${interval}'`;
  }

  const result = await query(queryText, [instanceName, metricType]);
  const total = parseInt(result.rows[0].total);

  // Cachear por 2 minutos
  await cache.set(cacheKey, total, 120);

  return total;
}

// Obter métricas agrupadas por data
async function getMetricsByDate(instanceName, metricType, days = 7) {
  const result = await query(
    `SELECT
       DATE(created_at) as date,
       SUM(value) as total,
       COUNT(*) as count
     FROM metrics
     WHERE instance_name = $1
       AND metric_type = $2
       AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [instanceName, metricType]
  );

  return result.rows;
}

// Obter top métricas
async function getTopMetrics(instanceName, limit = 10) {
  const result = await query(
    `SELECT
       metric_type,
       SUM(value) as total_value
     FROM metrics
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '7 days'
     GROUP BY metric_type
     ORDER BY total_value DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

// Limpar métricas antigas (manutenção)
async function cleanOldMetrics(daysToKeep = 90) {
  const result = await query(
    `DELETE FROM metrics
     WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('metrics:*');

  return result.rowCount;
}

// Exportar métricas para análise
async function exportMetrics(instanceName, startDate, endDate) {
  const result = await query(
    `SELECT * FROM metrics
     WHERE instance_name = $1
       AND created_at >= $2
       AND created_at <= $3
     ORDER BY created_at ASC`,
    [instanceName, startDate, endDate]
  );

  return result.rows;
}

module.exports = {
  addMetric,
  incrementMetric,
  getMetricsByInstance,
  getMetricsSummary,
  getTotalMetric,
  getMetricsByDate,
  getTopMetrics,
  cleanOldMetrics,
  exportMetrics
};
