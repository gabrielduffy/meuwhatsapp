const path = require('path');
const cron = require('node-cron');
const os = require('os');

// Diretório de dados
const DATA_DIR = process.env.DATA_DIR || './data';
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');

// Armazenamento de métricas em memória
const metrics = {
  instances: {},
  global: {
    totalInstances: 0,
    connectedInstances: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    apiRequestsToday: 0,
    rateLimitHits: 0,
    startedAt: new Date().toISOString(),
    uptime: 0
  }
};

// Inicializar métricas
function initMetrics() {
  loadMetrics();

  // Salvar métricas a cada 5 minutos
  cron.schedule('*/5 * * * *', () => {
    saveMetrics();
  });

  // Resetar métricas diárias à meia-noite
  cron.schedule('0 0 * * *', () => {
    resetDailyMetrics();
  });

  // Atualizar uptime a cada minuto
  cron.schedule('* * * * *', () => {
    metrics.global.uptime = Math.floor(process.uptime());
  });

  console.log('[Metrics] Sistema de métricas inicializado');
}

// Criar métrica para nova instância
function createInstanceMetrics(instanceName) {
  if (!metrics.instances[instanceName]) {
    metrics.instances[instanceName] = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      uptime: 0,
      lastActivity: null,
      connectionStatus: 'disconnected',
      errorsToday: 0,
      messageTypes: {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        sticker: 0,
        location: 0,
        contact: 0,
        poll: 0,
        reaction: 0,
        other: 0
      },
      createdAt: new Date().toISOString()
    };

    metrics.global.totalInstances++;
    saveMetrics();
  }
}

// Remover métricas de instância
function removeInstanceMetrics(instanceName) {
  if (metrics.instances[instanceName]) {
    delete metrics.instances[instanceName];
    metrics.global.totalInstances = Math.max(0, metrics.global.totalInstances - 1);
    saveMetrics();
  }
}

// Incrementar métrica
function incrementMetric(instanceName, metric, value = 1, messageType = null) {
  // Criar métricas da instância se não existir
  if (!metrics.instances[instanceName]) {
    createInstanceMetrics(instanceName);
  }

  const instance = metrics.instances[instanceName];

  // Atualizar métrica específica
  switch (metric) {
    case 'sent':
      instance.messagesSent += value;
      metrics.global.totalMessagesSent += value;
      if (messageType && instance.messageTypes[messageType] !== undefined) {
        instance.messageTypes[messageType] += value;
      } else if (messageType) {
        instance.messageTypes.other += value;
      }
      break;

    case 'received':
      instance.messagesReceived += value;
      metrics.global.totalMessagesReceived += value;
      break;

    case 'failed':
      instance.messagesFailed += value;
      break;

    case 'error':
      instance.errorsToday += value;
      break;

    case 'api_request':
      metrics.global.apiRequestsToday += value;
      break;

    case 'rate_limit':
      metrics.global.rateLimitHits += value;
      break;
  }

  // Atualizar última atividade
  instance.lastActivity = new Date().toISOString();
}

// Atualizar status de conexão
function updateConnectionStatus(instanceName, status) {
  if (!metrics.instances[instanceName]) {
    createInstanceMetrics(instanceName);
  }

  const wasConnected = metrics.instances[instanceName].connectionStatus === 'connected';
  metrics.instances[instanceName].connectionStatus = status;

  // Atualizar contador de instâncias conectadas
  if (status === 'connected' && !wasConnected) {
    metrics.global.connectedInstances++;
  } else if (status !== 'connected' && wasConnected) {
    metrics.global.connectedInstances = Math.max(0, metrics.global.connectedInstances - 1);
  }

  saveMetrics();
}

// Obter métricas de uma instância
function getInstanceMetrics(instanceName) {
  return metrics.instances[instanceName] || null;
}

// Obter métricas globais
function getGlobalMetrics() {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  // Load average (1 min) como proxy para CPU
  const load = os.loadavg()[0];
  const cpus = os.cpus().length;
  const cpuPercent = Math.min(100, Math.round((load / cpus) * 100));

  return {
    ...metrics.global,
    uptime: Math.floor(process.uptime()),
    totalInstances: Object.keys(metrics.instances).length,
    connectedInstances: Object.values(metrics.instances).filter(
      i => i.connectionStatus === 'connected'
    ).length,
    system: {
      cpu: cpuPercent,
      memory: memPercent,
      memoryUsed: Math.round(usedMem / 1024 / 1024),
      memoryTotal: Math.round(totalMem / 1024 / 1024),
      load: load.toFixed(2)
    }
  };
}

// Obter todas as métricas
function getAllMetrics() {
  return {
    instances: metrics.instances,
    global: getGlobalMetrics(),
    timestamp: new Date().toISOString()
  };
}

// Resetar métricas diárias
function resetDailyMetrics() {
  console.log('[Metrics] Resetando métricas diárias...');

  // Resetar global
  metrics.global.apiRequestsToday = 0;
  metrics.global.rateLimitHits = 0;

  // Resetar por instância
  Object.keys(metrics.instances).forEach(instanceName => {
    metrics.instances[instanceName].errorsToday = 0;
  });

  saveMetrics();
}

// Resetar todas as métricas
function resetAllMetrics() {
  console.log('[Metrics] Resetando TODAS as métricas...');

  const instanceNames = Object.keys(metrics.instances);

  metrics.instances = {};
  metrics.global = {
    totalInstances: 0,
    connectedInstances: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    apiRequestsToday: 0,
    rateLimitHits: 0,
    startedAt: new Date().toISOString(),
    uptime: 0
  };

  // Recriar instâncias vazias
  instanceNames.forEach(name => {
    createInstanceMetrics(name);
  });

  saveMetrics();
}

// Exportar métricas em formato CSV
function exportMetricsCSV() {
  const lines = [];

  // Header
  lines.push('Instance,Sent,Received,Failed,Errors,Status,Last Activity');

  // Dados
  Object.keys(metrics.instances).forEach(instanceName => {
    const m = metrics.instances[instanceName];
    lines.push(
      `${instanceName},${m.messagesSent},${m.messagesReceived},${m.messagesFailed},${m.errorsToday},${m.connectionStatus},${m.lastActivity || 'Never'}`
    );
  });

  return lines.join('\n');
}

// Salvar métricas em arquivo
function saveMetrics() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('[Metrics] Erro ao salvar métricas:', error.message);
  }
}

// Carregar métricas do arquivo
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      const data = fs.readFileSync(METRICS_FILE, 'utf8');
      const loaded = JSON.parse(data);

      // Mesclar dados carregados
      if (loaded.instances) {
        metrics.instances = loaded.instances;
      }

      if (loaded.global) {
        metrics.global = {
          ...metrics.global,
          ...loaded.global,
          startedAt: new Date().toISOString() // Atualizar data de início
        };
      }

      console.log('[Metrics] Métricas carregadas:', {
        instances: Object.keys(metrics.instances).length,
        totalSent: metrics.global.totalMessagesSent,
        totalReceived: metrics.global.totalMessagesReceived
      });
    }
  } catch (error) {
    console.error('[Metrics] Erro ao carregar métricas:', error.message);
  }
}

// Obter estatísticas agregadas
function getAggregatedStats() {
  const instances = Object.keys(metrics.instances);
  const connected = instances.filter(i => metrics.instances[i].connectionStatus === 'connected');

  // Top 5 instâncias por mensagens enviadas
  const topSenders = instances
    .map(name => ({
      name,
      sent: metrics.instances[name].messagesSent
    }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 5);

  // Contagem de tipos de mensagem global
  const messageTypeStats = {};
  instances.forEach(name => {
    const types = metrics.instances[name].messageTypes;
    Object.keys(types).forEach(type => {
      messageTypeStats[type] = (messageTypeStats[type] || 0) + types[type];
    });
  });

  return {
    totalInstances: instances.length,
    connectedInstances: connected.length,
    disconnectedInstances: instances.length - connected.length,
    topSenders,
    messageTypeStats,
    global: getGlobalMetrics()
  };
}

module.exports = {
  initMetrics,
  createInstanceMetrics,
  removeInstanceMetrics,
  incrementMetric,
  updateConnectionStatus,
  getInstanceMetrics,
  getGlobalMetrics,
  getAllMetrics,
  resetDailyMetrics,
  resetAllMetrics,
  exportMetricsCSV,
  getAggregatedStats,
  saveMetrics
};
