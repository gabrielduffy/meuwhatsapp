const Queue = require('bull');
const { redis } = require('../config/redis');
const webhookRepository = require('../repositories/webhookRepository');

// Criar fila de webhooks
const webhookQueue = new Queue('webhook', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'redis',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
    password: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).password : '@412Trocar'
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Processar jobs de webhook
webhookQueue.process(async (job) => {
  const { instanceName, url, payload, config } = job.data;

  console.log(`[WebhookQueue] Enviando webhook para ${instanceName}: ${payload.event}`);

  const startTime = Date.now();
  let lastError = null;

  try {
    // Buscar configuração de webhook
    const webhookConfig = config || await webhookRepository.getWebhookConfig(instanceName);

    if (!webhookConfig || !webhookConfig.enabled) {
      console.log(`[WebhookQueue] Webhook desabilitado para ${instanceName}`);
      return { skipped: true, reason: 'webhook_disabled' };
    }

    const timeout = webhookConfig.timeout || 30000;
    const headers = webhookConfig.headers || {};

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsBenemax/2.1',
          ...headers
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      // Adicionar log
      await webhookRepository.addWebhookLog({
        instanceName,
        eventType: payload.event,
        url,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        attempt: job.attemptsMade + 1,
        durationMs: duration,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        responseBody: responseText.substring(0, 500)
      });

      if (response.ok) {
        console.log(`[WebhookQueue] ✅ Webhook enviado com sucesso para ${instanceName} (${duration}ms)`);

        return {
          success: true,
          statusCode: response.status,
          duration,
          responseBody: responseText.substring(0, 200)
        };
      } else {
        lastError = new Error(`HTTP ${response.status}: ${responseText}`);
        throw lastError;
      }

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const errorType = error.name === 'AbortError' ? 'timeout' : 'network_error';
      const duration = Date.now() - startTime;

      await webhookRepository.addWebhookLog({
        instanceName,
        eventType: payload.event,
        url,
        status: 'error',
        statusCode: 0,
        attempt: job.attemptsMade + 1,
        durationMs: duration,
        errorMessage: error.message,
        errorType
      });

      console.error(`[WebhookQueue] ❌ Erro ${errorType} ao enviar webhook para ${instanceName}:`, error.message);

      throw error;
    }

  } catch (error) {
    console.error(`[WebhookQueue] ❌ Erro ao processar webhook para ${instanceName}:`, error.message);

    // Se excedeu tentativas, registrar falha final
    if (job.attemptsMade >= 2) {
      await webhookRepository.addWebhookLog({
        instanceName,
        eventType: payload.event,
        url,
        status: 'failed',
        statusCode: 0,
        attempt: job.attemptsMade + 1,
        durationMs: Date.now() - startTime,
        errorMessage: `Falhou após ${job.attemptsMade + 1} tentativas: ${error.message}`
      });
    }

    throw error;
  }
});

// Eventos da fila
webhookQueue.on('completed', (job, result) => {
  if (!result.skipped) {
    console.log(`[WebhookQueue] Job ${job.id} completado para ${job.data.instanceName}`);
  }
});

webhookQueue.on('failed', (job, err) => {
  console.error(`[WebhookQueue] Job ${job.id} falhou:`, err.message);
});

webhookQueue.on('stalled', (job) => {
  console.warn(`[WebhookQueue] Job ${job.id} travado, será reprocessado`);
});

// Função auxiliar para enviar webhook
async function sendWebhook(instanceName, url, payload, config = null) {
  return await webhookQueue.add(
    { instanceName, url, payload, config },
    {
      priority: payload.event === 'qr' ? 1 : 5, // QR codes têm prioridade
      attempts: config?.maxRetries || 3
    }
  );
}

// Função auxiliar para enviar webhook em massa
async function sendWebhookBatch(webhooks) {
  const jobs = webhooks.map(webhook =>
    webhookQueue.add(webhook, { attempts: webhook.config?.maxRetries || 3 })
  );

  return await Promise.all(jobs);
}

// Função para obter status da fila
async function getWebhookQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookQueue.getWaitingCount(),
    webhookQueue.getActiveCount(),
    webhookQueue.getCompletedCount(),
    webhookQueue.getFailedCount(),
    webhookQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed
  };
}

// Função para limpar jobs antigos
async function cleanWebhookQueue() {
  await webhookQueue.clean(6 * 60 * 60 * 1000, 'completed'); // 6 horas
  await webhookQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 dias
  console.log('[WebhookQueue] Limpeza de jobs antigos concluída');
}

// Limpar automaticamente a cada 6 horas
setInterval(cleanWebhookQueue, 6 * 60 * 60 * 1000);

// Função para pausar processamento de webhooks
async function pauseWebhookQueue() {
  await webhookQueue.pause();
  console.log('[WebhookQueue] Fila pausada');
}

// Função para retomar processamento
async function resumeWebhookQueue() {
  await webhookQueue.resume();
  console.log('[WebhookQueue] Fila retomada');
}

// Função para limpar todos os webhooks pendentes de uma instância
async function clearInstanceWebhooks(instanceName) {
  const jobs = await webhookQueue.getJobs(['waiting', 'delayed', 'active']);
  let removed = 0;

  for (const job of jobs) {
    if (job.data.instanceName === instanceName) {
      await job.remove();
      removed++;
    }
  }

  console.log(`[WebhookQueue] ${removed} webhooks removidos para ${instanceName}`);
  return removed;
}

module.exports = {
  webhookQueue,
  sendWebhook,
  sendWebhookBatch,
  getWebhookQueueStatus,
  cleanWebhookQueue,
  pauseWebhookQueue,
  resumeWebhookQueue,
  clearInstanceWebhooks
};
