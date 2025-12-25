const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CONFIGURAÇÕES ==========

// Criar ou atualizar configuração de autoresponder
async function upsertAutoresponderConfig(instanceName, config) {
  const {
    enabled = true,
    triggerType = 'all',
    keywords = [],
    aiModel = 'mixtral-8x7b-32768',
    systemPrompt = null,
    temperature = 0.7,
    maxTokens = 500,
    contextWindow = 10
  } = config;

  const result = await query(
    `INSERT INTO autoresponder_configs
     (instance_name, enabled, trigger_type, keywords, ai_model, system_prompt,
      temperature, max_tokens, context_window)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (instance_name)
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       trigger_type = EXCLUDED.trigger_type,
       keywords = EXCLUDED.keywords,
       ai_model = EXCLUDED.ai_model,
       system_prompt = EXCLUDED.system_prompt,
       temperature = EXCLUDED.temperature,
       max_tokens = EXCLUDED.max_tokens,
       context_window = EXCLUDED.context_window,
       updated_at = NOW()
     RETURNING *`,
    [
      instanceName,
      enabled,
      triggerType,
      JSON.stringify(keywords),
      aiModel,
      systemPrompt,
      temperature,
      maxTokens,
      contextWindow
    ]
  );

  // Invalidar cache
  await cache.del(`autoresponder:config:${instanceName}`);

  return result.rows[0];
}

// Buscar configuração de autoresponder
async function getAutoresponderConfig(instanceName) {
  // Tentar cache
  const cacheKey = `autoresponder:config:${instanceName}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM autoresponder_configs WHERE instance_name = $1',
    [instanceName]
  );

  const config = result.rows[0] || null;

  // Cachear por 5 minutos
  if (config) {
    await cache.set(cacheKey, config, 300);
  }

  return config;
}

// Habilitar/desabilitar autoresponder
async function toggleAutoresponder(instanceName, enabled) {
  const result = await query(
    `UPDATE autoresponder_configs
     SET enabled = $2, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, enabled]
  );

  // Invalidar cache
  await cache.del(`autoresponder:config:${instanceName}`);

  return result.rows[0];
}

// Deletar configuração
async function deleteAutoresponderConfig(instanceName) {
  const result = await query(
    'DELETE FROM autoresponder_configs WHERE instance_name = $1 RETURNING *',
    [instanceName]
  );

  // Invalidar cache
  await cache.del(`autoresponder:config:${instanceName}`);

  return result.rows[0];
}

// ========== HISTÓRICO ==========

// Adicionar entrada no histórico
async function addAutoresponderHistory(historyData) {
  const {
    instanceName,
    chatId,
    userMessage,
    aiResponse,
    modelUsed,
    tokensUsed,
    responseTimeMs
  } = historyData;

  const result = await query(
    `INSERT INTO autoresponder_history
     (instance_name, chat_id, user_message, ai_response, model_used, tokens_used, response_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [instanceName, chatId, userMessage, aiResponse, modelUsed, tokensUsed, responseTimeMs]
  );

  // Invalidar cache de histórico
  await cache.invalidatePattern(`autoresponder:history:${instanceName}:*`);

  return result.rows[0];
}

// Buscar histórico por instância
async function getAutoresponderHistory(instanceName, options = {}) {
  const { chatId, limit = 100, offset = 0 } = options;

  let queryText = 'SELECT * FROM autoresponder_history WHERE instance_name = $1';
  const params = [instanceName];

  if (chatId) {
    queryText += ' AND chat_id = $2';
    params.push(chatId);
  }

  queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  queryText += ' OFFSET $' + (params.length + 1);
  params.push(offset);

  const result = await query(queryText, params);
  return result.rows;
}

// Buscar histórico de conversa (contexto)
async function getChatContext(instanceName, chatId, limit = 10) {
  const cacheKey = `autoresponder:history:${instanceName}:${chatId}:context`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT user_message, ai_response, created_at
     FROM autoresponder_history
     WHERE instance_name = $1 AND chat_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [instanceName, chatId, limit]
  );

  const context = result.rows.reverse(); // Mais antigo primeiro

  // Cachear por 1 minuto
  await cache.set(cacheKey, context, 60);

  return context;
}

// ========== ESTATÍSTICAS ==========

// Obter estatísticas de autoresponder
async function getAutoresponderStats(instanceName, period = 'day') {
  const cacheKey = `autoresponder:stats:${instanceName}:${period}`;
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
       COUNT(*) as total_interactions,
       COUNT(DISTINCT chat_id) as unique_chats,
       SUM(tokens_used) as total_tokens,
       AVG(tokens_used) as avg_tokens,
       AVG(response_time_ms) as avg_response_time_ms
     FROM autoresponder_history
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${interval}'`,
    [instanceName]
  );

  const stats = result.rows[0];

  // Converter para números
  stats.total_interactions = parseInt(stats.total_interactions) || 0;
  stats.unique_chats = parseInt(stats.unique_chats) || 0;
  stats.total_tokens = parseInt(stats.total_tokens) || 0;
  stats.avg_tokens = Math.round(parseFloat(stats.avg_tokens)) || 0;
  stats.avg_response_time_ms = Math.round(parseFloat(stats.avg_response_time_ms)) || 0;

  // Cachear por 5 minutos
  await cache.set(cacheKey, stats, 300);

  return stats;
}

// Buscar chats mais ativos
async function getTopChats(instanceName, limit = 10) {
  const result = await query(
    `SELECT
       chat_id,
       COUNT(*) as interaction_count,
       MAX(created_at) as last_interaction
     FROM autoresponder_history
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '7 days'
     GROUP BY chat_id
     ORDER BY interaction_count DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

// Uso de tokens por dia
async function getTokenUsageByDate(instanceName, days = 7) {
  const result = await query(
    `SELECT
       DATE(created_at) as date,
       SUM(tokens_used) as total_tokens,
       COUNT(*) as interaction_count,
       AVG(tokens_used) as avg_tokens
     FROM autoresponder_history
     WHERE instance_name = $1
       AND created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [instanceName]
  );

  return result.rows;
}

// Limpar histórico antigo
async function cleanOldHistory(daysToKeep = 90) {
  const result = await query(
    `DELETE FROM autoresponder_history
     WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('autoresponder:*');

  return result.rowCount;
}

// Listar todas as configurações ativas
async function getAllActiveConfigs() {
  const result = await query(
    'SELECT * FROM autoresponder_configs WHERE enabled = true ORDER BY instance_name'
  );

  return result.rows;
}

module.exports = {
  upsertAutoresponderConfig,
  getAutoresponderConfig,
  toggleAutoresponder,
  deleteAutoresponderConfig,
  addAutoresponderHistory,
  getAutoresponderHistory,
  getChatContext,
  getAutoresponderStats,
  getTopChats,
  getTokenUsageByDate,
  cleanOldHistory,
  getAllActiveConfigs
};
