const fs = require('fs');
const path = require('path');

// Armazenamento de configurações e logs de webhook
const webhookConfigs = {};
const webhookLogs = {};
const DATA_DIR = process.env.DATA_DIR || './data';
const WEBHOOK_LOGS_FILE = path.join(DATA_DIR, 'webhook-logs.json');
const WEBHOOK_CONFIG_FILE = path.join(DATA_DIR, 'webhook-configs.json');

// Garantir que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Carregar configurações e logs salvos
function loadWebhookData() {
  try {
    if (fs.existsSync(WEBHOOK_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(WEBHOOK_CONFIG_FILE, 'utf8'));
      Object.assign(webhookConfigs, data);
    }
  } catch (err) {
    console.error('Erro ao carregar configurações de webhook:', err.message);
  }

  try {
    if (fs.existsSync(WEBHOOK_LOGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(WEBHOOK_LOGS_FILE, 'utf8'));
      Object.assign(webhookLogs, data);
    }
  } catch (err) {
    console.error('Erro ao carregar logs de webhook:', err.message);
  }
}

// Salvar configurações
function saveWebhookConfigs() {
  try {
    fs.writeFileSync(WEBHOOK_CONFIG_FILE, JSON.stringify(webhookConfigs, null, 2));
  } catch (err) {
    console.error('Erro ao salvar configurações de webhook:', err.message);
  }
}

// Salvar logs (limitado aos últimos 1000 logs)
function saveWebhookLogs() {
  try {
    // Manter apenas os últimos 1000 logs de cada instância
    Object.keys(webhookLogs).forEach(instanceName => {
      if (webhookLogs[instanceName].length > 1000) {
        webhookLogs[instanceName] = webhookLogs[instanceName].slice(-1000);
      }
    });

    fs.writeFileSync(WEBHOOK_LOGS_FILE, JSON.stringify(webhookLogs, null, 2));
  } catch (err) {
    console.error('Erro ao salvar logs de webhook:', err.message);
  }
}

// Configurar webhook avançado para uma instância
function configureWebhook(instanceName, config) {
  webhookConfigs[instanceName] = {
    url: config.url,
    enabled: config.enabled !== false,
    retryConfig: {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000, // 5 segundos
      backoffMultiplier: config.backoffMultiplier || 2
    },
    eventTypes: [
      'messages.upsert',
      'messages.update',
      'connection.update',
      'message.update',
      'qrcode',
      'connection'
    ],
    headers: config.headers || {},
    timeout: config.timeout || 60000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveWebhookConfigs();
  console.log(`[Webhook] Configuração avançada salva para ${instanceName}`);

  return webhookConfigs[instanceName];
}

// Obter configuração de webhook
function getWebhookConfig(instanceName) {
  return webhookConfigs[instanceName] || null;
}

// Deletar configuração de webhook
function deleteWebhookConfig(instanceName) {
  delete webhookConfigs[instanceName];
  saveWebhookConfigs();
}

// Adicionar log de webhook
function addWebhookLog(instanceName, logEntry) {
  if (!webhookLogs[instanceName]) {
    webhookLogs[instanceName] = [];
  }

  const log = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...logEntry
  };

  webhookLogs[instanceName].push(log);

  // Salvar periodicamente (a cada 10 logs)
  if (webhookLogs[instanceName].length % 10 === 0) {
    saveWebhookLogs();
  }

  return log;
}

// Obter logs de webhook
function getWebhookLogs(instanceName, options = {}) {
  const logs = webhookLogs[instanceName] || [];
  let filtered = [...logs];

  // Filtrar por tipo de evento
  if (options.eventType) {
    filtered = filtered.filter(log => log.eventType === options.eventType);
  }

  // Filtrar por status
  if (options.status) {
    filtered = filtered.filter(log => log.status === options.status);
  }

  // Filtrar por período
  if (options.since) {
    const sinceDate = new Date(options.since);
    filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
  }

  // Limitar quantidade
  const limit = options.limit || 100;
  filtered = filtered.slice(-limit);

  return filtered.reverse(); // Mais recentes primeiro
}

// Limpar logs de uma instância
function clearWebhookLogs(instanceName) {
  webhookLogs[instanceName] = [];
  saveWebhookLogs();
}

// Função para enviar webhook com retry automático
async function sendWebhookWithRetry(instanceName, webhookUrl, payload, config = {}) {
  const webhookConfig = getWebhookConfig(instanceName);
  const retryConfig = webhookConfig?.retryConfig || {
    maxRetries: 3,
    retryDelay: 5000,
    backoffMultiplier: 2
  };

  const timeout = webhookConfig?.timeout || 30000;
  const headers = webhookConfig?.headers || {};

  let attempt = 0;
  let lastError = null;

  while (attempt <= retryConfig.maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const startTime = Date.now();

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsBenemax/2.1',
          'apikey': instanceTokens[instanceName] || '',
          'X-API-Key': instanceTokens[instanceName] || '',
          'Authorization': instanceTokens[instanceName] ? `Bearer ${instanceTokens[instanceName]}` : '',
          ...headers
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      // Log de sucesso
      if (response.ok) {
        addWebhookLog(instanceName, {
          eventType: payload.event,
          status: 'success',
          statusCode: response.status,
          url: webhookUrl,
          attempt: attempt + 1,
          duration,
          responseBody: responseText.substring(0, 500) // Limitar tamanho
        });

        console.log(`[Webhook] ${instanceName} - Enviado com sucesso (${duration}ms)`);
        return { success: true, statusCode: response.status, duration };
      }

      // Resposta não OK
      lastError = new Error(`HTTP ${response.status}: ${responseText}`);

      addWebhookLog(instanceName, {
        eventType: payload.event,
        status: 'error',
        statusCode: response.status,
        url: webhookUrl,
        attempt: attempt + 1,
        duration,
        error: lastError.message,
        responseBody: responseText.substring(0, 500)
      });

      console.error(`[Webhook] ${instanceName} - Erro ${response.status} na tentativa ${attempt + 1}`);

    } catch (error) {
      lastError = error;

      const errorType = error.name === 'AbortError' ? 'timeout' : 'network_error';

      addWebhookLog(instanceName, {
        eventType: payload.event,
        status: 'error',
        statusCode: 0,
        url: webhookUrl,
        attempt: attempt + 1,
        duration: 0,
        error: error.message,
        errorType
      });

      console.error(`[Webhook] ${instanceName} - ${errorType} na tentativa ${attempt + 1}: ${error.message}`);
    }

    attempt++;

    // Se não for a última tentativa, aguardar antes de retry com backoff exponencial
    if (attempt <= retryConfig.maxRetries) {
      // 5s, 10s, 20s... até o multiplicador
      const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
      const jitter = Math.random() * 1000; // Adicionar jitter de 1s para evitar thundering herd
      const finalDelay = Math.min(delay + jitter, 60000); // No máximo 1 minuto entre tentativas de webhook

      console.log(`[Webhook] ${instanceName} - Aguardando ${Math.round(finalDelay)}ms antes de retry ${attempt}/${retryConfig.maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  // Todas as tentativas falharam
  addWebhookLog(instanceName, {
    eventType: payload.event,
    status: 'failed',
    statusCode: 0,
    url: webhookUrl,
    attempt: retryConfig.maxRetries + 1,
    duration: 0,
    error: `Falhou após ${retryConfig.maxRetries + 1} tentativas: ${lastError?.message}`
  });

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    attempts: retryConfig.maxRetries + 1
  };
}

// Verificar se um tipo de evento está habilitado
function isEventTypeEnabled(instanceName, eventType) {
  const config = getWebhookConfig(instanceName);
  if (!config || !config.enabled) return false;

  return config.eventTypes.includes(eventType);
}

// Testar webhook (enviar payload de teste)
async function testWebhook(instanceName, webhookUrl) {
  const testPayload = {
    event: 'webhook.test',
    instanceName,
    timestamp: new Date().toISOString(),
    data: {
      message: 'Este é um webhook de teste do WhatsBenemax',
      version: '2.1.0'
    }
  };

  console.log(`[Webhook] Testando webhook para ${instanceName}: ${webhookUrl}`);

  return await sendWebhookWithRetry(instanceName, webhookUrl, testPayload);
}

// Obter estatísticas de webhook
function getWebhookStats(instanceName, period = 'day') {
  const logs = webhookLogs[instanceName] || [];

  const now = new Date();
  let since;

  switch (period) {
    case 'hour':
      since = new Date(now - 60 * 60 * 1000);
      break;
    case 'day':
      since = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      since = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      since = new Date(now - 24 * 60 * 60 * 1000);
  }

  const recentLogs = logs.filter(log => new Date(log.timestamp) >= since);

  const stats = {
    total: recentLogs.length,
    success: recentLogs.filter(log => log.status === 'success').length,
    error: recentLogs.filter(log => log.status === 'error').length,
    failed: recentLogs.filter(log => log.status === 'failed').length,
    byEventType: {},
    avgDuration: 0,
    successRate: 0
  };

  // Calcular por tipo de evento
  recentLogs.forEach(log => {
    if (!stats.byEventType[log.eventType]) {
      stats.byEventType[log.eventType] = { total: 0, success: 0, error: 0 };
    }
    stats.byEventType[log.eventType].total++;
    if (log.status === 'success') {
      stats.byEventType[log.eventType].success++;
    } else {
      stats.byEventType[log.eventType].error++;
    }
  });

  // Calcular duração média
  const successLogs = recentLogs.filter(log => log.status === 'success' && log.duration);
  if (successLogs.length > 0) {
    stats.avgDuration = Math.round(
      successLogs.reduce((sum, log) => sum + log.duration, 0) / successLogs.length
    );
  }

  // Calcular taxa de sucesso
  if (stats.total > 0) {
    stats.successRate = Math.round((stats.success / stats.total) * 100);
  }

  return stats;
}

// Listar todas as configurações de webhook
function getAllWebhookConfigs() {
  return webhookConfigs;
}

// Inicializar o módulo
function initWebhookAdvanced() {
  loadWebhookData();
  console.log('[Webhook Advanced] Sistema de webhook avançado inicializado');

  // Salvar logs periodicamente (a cada 5 minutos)
  setInterval(() => {
    saveWebhookLogs();
  }, 5 * 60 * 1000);
}

module.exports = {
  initWebhookAdvanced,
  configureWebhook,
  getWebhookConfig,
  deleteWebhookConfig,
  sendWebhookWithRetry,
  isEventTypeEnabled,
  testWebhook,
  getWebhookLogs,
  clearWebhookLogs,
  getWebhookStats,
  getAllWebhookConfigs,
  addWebhookLog
};
