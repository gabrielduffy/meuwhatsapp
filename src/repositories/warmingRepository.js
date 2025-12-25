const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CONFIGURAÇÕES ==========

// Criar ou atualizar configuração de warming
async function upsertWarmingConfig(instanceName, config) {
  const {
    enabled = false,
    dailyLimit = 50,
    warmupStage = 1
  } = config;

  const result = await query(
    `INSERT INTO warming_configs
     (instance_name, enabled, daily_limit, warmup_stage, current_daily_count, last_reset_date)
     VALUES ($1, $2, $3, $4, 0, CURRENT_DATE)
     ON CONFLICT (instance_name)
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       daily_limit = EXCLUDED.daily_limit,
       warmup_stage = EXCLUDED.warmup_stage,
       updated_at = NOW()
     RETURNING *`,
    [instanceName, enabled, dailyLimit, warmupStage]
  );

  // Invalidar cache
  await cache.del(`warming:config:${instanceName}`);

  return result.rows[0];
}

// Buscar configuração de warming
async function getWarmingConfig(instanceName) {
  // Tentar cache
  const cacheKey = `warming:config:${instanceName}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM warming_configs WHERE instance_name = $1',
    [instanceName]
  );

  const config = result.rows[0] || null;

  // Cachear por 2 minutos
  if (config) {
    await cache.set(cacheKey, config, 120);
  }

  return config;
}

// Habilitar/desabilitar warming
async function toggleWarming(instanceName, enabled) {
  const result = await query(
    `UPDATE warming_configs
     SET enabled = $2, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, enabled]
  );

  // Invalidar cache
  await cache.del(`warming:config:${instanceName}`);

  return result.rows[0];
}

// Atualizar estágio de warming
async function updateWarmupStage(instanceName, stage) {
  const result = await query(
    `UPDATE warming_configs
     SET warmup_stage = $2, updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName, stage]
  );

  // Invalidar cache
  await cache.del(`warming:config:${instanceName}`);

  return result.rows[0];
}

// Deletar configuração de warming
async function deleteWarmingConfig(instanceName) {
  const result = await query(
    'DELETE FROM warming_configs WHERE instance_name = $1 RETURNING *',
    [instanceName]
  );

  // Invalidar cache
  await cache.del(`warming:config:${instanceName}`);

  return result.rows[0];
}

// ========== CONTADORES E LIMITES ==========

// Incrementar contador diário
async function incrementDailyCount(instanceName) {
  // Primeiro resetar se necessário
  await resetDailyCountIfNeeded(instanceName);

  const result = await query(
    `UPDATE warming_configs
     SET current_daily_count = current_daily_count + 1,
         updated_at = NOW()
     WHERE instance_name = $1
     RETURNING *`,
    [instanceName]
  );

  // Invalidar cache
  await cache.del(`warming:config:${instanceName}`);

  return result.rows[0];
}

// Resetar contador diário se necessário
async function resetDailyCountIfNeeded(instanceName) {
  const result = await query(
    `UPDATE warming_configs
     SET current_daily_count = 0,
         last_reset_date = CURRENT_DATE
     WHERE instance_name = $1
       AND last_reset_date < CURRENT_DATE
     RETURNING *`,
    [instanceName]
  );

  if (result.rows.length > 0) {
    // Invalidar cache
    await cache.del(`warming:config:${instanceName}`);
  }

  return result.rows[0] || null;
}

// Verificar se pode enviar mensagem (não excedeu limite)
async function canSendMessage(instanceName) {
  const config = await getWarmingConfig(instanceName);

  if (!config || !config.enabled) {
    return true; // Se warming não está habilitado, pode enviar
  }

  // Resetar contador se necessário
  await resetDailyCountIfNeeded(instanceName);

  // Recarregar config após possível reset
  const updatedConfig = await getWarmingConfig(instanceName);

  return updatedConfig.current_daily_count < updatedConfig.daily_limit;
}

// Obter mensagens restantes no dia
async function getRemainingMessages(instanceName) {
  const config = await getWarmingConfig(instanceName);

  if (!config || !config.enabled) {
    return Infinity; // Se warming não está habilitado, ilimitado
  }

  // Resetar contador se necessário
  await resetDailyCountIfNeeded(instanceName);

  // Recarregar config após possível reset
  const updatedConfig = await getWarmingConfig(instanceName);

  const remaining = updatedConfig.daily_limit - updatedConfig.current_daily_count;
  return Math.max(0, remaining);
}

// ========== ESTATÍSTICAS ==========

// Adicionar estatística diária
async function addWarmingStat(instanceName, messagesSent, stage) {
  const result = await query(
    `INSERT INTO warming_stats
     (instance_name, stat_date, messages_sent, stage)
     VALUES ($1, CURRENT_DATE, $2, $3)
     ON CONFLICT (instance_name, stat_date)
     DO UPDATE SET
       messages_sent = warming_stats.messages_sent + EXCLUDED.messages_sent,
       stage = EXCLUDED.stage
     RETURNING *`,
    [instanceName, messagesSent, stage]
  );

  // Invalidar cache
  await cache.invalidatePattern(`warming:stats:${instanceName}:*`);

  return result.rows[0];
}

// Buscar estatísticas de warming
async function getWarmingStats(instanceName, days = 30) {
  const cacheKey = `warming:stats:${instanceName}:${days}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT * FROM warming_stats
     WHERE instance_name = $1
       AND stat_date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY stat_date DESC`,
    [instanceName]
  );

  // Cachear por 5 minutos
  await cache.set(cacheKey, result.rows, 300);

  return result.rows;
}

// Obter resumo de warming
async function getWarmingSummary(instanceName) {
  const cacheKey = `warming:summary:${instanceName}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const config = await getWarmingConfig(instanceName);

  if (!config) {
    return null;
  }

  // Estatísticas dos últimos 7 dias
  const stats7Days = await query(
    `SELECT
       SUM(messages_sent) as total_messages,
       AVG(messages_sent) as avg_messages_per_day,
       MAX(messages_sent) as max_messages_day,
       COUNT(*) as active_days
     FROM warming_stats
     WHERE instance_name = $1
       AND stat_date >= CURRENT_DATE - INTERVAL '7 days'`,
    [instanceName]
  );

  // Estatísticas dos últimos 30 dias
  const stats30Days = await query(
    `SELECT
       SUM(messages_sent) as total_messages,
       AVG(messages_sent) as avg_messages_per_day
     FROM warming_stats
     WHERE instance_name = $1
       AND stat_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [instanceName]
  );

  const summary = {
    config: {
      enabled: config.enabled,
      daily_limit: config.daily_limit,
      current_daily_count: config.current_daily_count,
      warmup_stage: config.warmup_stage,
      remaining_today: config.daily_limit - config.current_daily_count
    },
    last_7_days: {
      total_messages: parseInt(stats7Days.rows[0].total_messages) || 0,
      avg_per_day: Math.round(parseFloat(stats7Days.rows[0].avg_messages_per_day)) || 0,
      max_day: parseInt(stats7Days.rows[0].max_messages_day) || 0,
      active_days: parseInt(stats7Days.rows[0].active_days) || 0
    },
    last_30_days: {
      total_messages: parseInt(stats30Days.rows[0].total_messages) || 0,
      avg_per_day: Math.round(parseFloat(stats30Days.rows[0].avg_messages_per_day)) || 0
    }
  };

  // Cachear por 2 minutos
  await cache.set(cacheKey, summary, 120);

  return summary;
}

// Obter progresso de warming por estágio
async function getWarmingProgress(instanceName) {
  const stats = await getWarmingStats(instanceName, 90);
  const config = await getWarmingConfig(instanceName);

  if (!config) {
    return null;
  }

  // Calcular progresso baseado nos estágios de warming
  const stageGoals = {
    1: { days: 7, target: 20 },
    2: { days: 14, target: 50 },
    3: { days: 21, target: 100 },
    4: { days: 28, target: 200 },
    5: { days: 35, target: 500 }
  };

  const currentStage = config.warmup_stage;
  const goal = stageGoals[currentStage];

  if (!goal) {
    return {
      stage: currentStage,
      completed: currentStage > 5,
      progress: 100
    };
  }

  // Contar dias ativos no estágio atual
  const activeDays = stats.filter(s => s.stage === currentStage).length;
  const daysProgress = (activeDays / goal.days) * 100;

  // Verificar se atingiu o target diário consistentemente
  const recentStats = stats.slice(0, 7);
  const avgMessages = recentStats.reduce((sum, s) => sum + s.messages_sent, 0) / recentStats.length;
  const targetProgress = (avgMessages / goal.target) * 100;

  return {
    stage: currentStage,
    goal: goal,
    active_days: activeDays,
    days_progress: Math.min(100, Math.round(daysProgress)),
    avg_messages_per_day: Math.round(avgMessages),
    target_progress: Math.min(100, Math.round(targetProgress)),
    overall_progress: Math.min(100, Math.round((daysProgress + targetProgress) / 2))
  };
}

// Limpar estatísticas antigas
async function cleanOldWarmingStats(daysToKeep = 180) {
  const result = await query(
    `DELETE FROM warming_stats
     WHERE stat_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern('warming:*');

  return result.rowCount;
}

// Listar todas as configurações ativas
async function getAllActiveWarmingConfigs() {
  const result = await query(
    'SELECT * FROM warming_configs WHERE enabled = true ORDER BY instance_name'
  );

  return result.rows;
}

module.exports = {
  // Config
  upsertWarmingConfig,
  getWarmingConfig,
  toggleWarming,
  updateWarmupStage,
  deleteWarmingConfig,
  // Contadores
  incrementDailyCount,
  resetDailyCountIfNeeded,
  canSendMessage,
  getRemainingMessages,
  // Stats
  addWarmingStat,
  getWarmingStats,
  getWarmingSummary,
  getWarmingProgress,
  cleanOldWarmingStats,
  getAllActiveWarmingConfigs
};
