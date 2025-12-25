const Queue = require('bull');
const { redis } = require('../config/redis');
const broadcastRepository = require('../repositories/broadcastRepository');
const whatsapp = require('../services/whatsapp');

// Criar fila de broadcast
const broadcastQueue = new Queue('broadcast', {
  redis: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'redis',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379,
    password: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).password : '@412Trocar'
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Processar jobs de broadcast
broadcastQueue.process(async (job) => {
  const { campaignId } = job.data;

  console.log(`[BroadcastQueue] Processando campanha ID: ${campaignId}`);

  try {
    // Buscar campanha
    const campaign = await broadcastRepository.getBroadcastCampaignById(campaignId);

    if (!campaign) {
      throw new Error(`Campanha ${campaignId} não encontrada`);
    }

    if (campaign.status !== 'pending' && campaign.status !== 'running') {
      console.log(`[BroadcastQueue] Campanha ${campaignId} já foi processada (status: ${campaign.status})`);
      return { skipped: true, reason: 'already_processed' };
    }

    // Verificar se a instância existe e está conectada
    const sock = whatsapp.getSocket(campaign.instance_name);
    if (!sock) {
      throw new Error(`Instância ${campaign.instance_name} não está conectada`);
    }

    // Atualizar status para running
    if (campaign.status === 'pending') {
      await broadcastRepository.updateBroadcastStatus(campaignId, 'running');
    }

    const recipients = campaign.recipients;
    const delay = campaign.delay_between_messages || 1000;
    let sent = 0;
    let failed = 0;

    // Processar cada destinatário
    for (let i = campaign.sent_count + campaign.failed_count; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        // Formatar JID
        const jid = recipient.includes('@')
          ? recipient
          : `${recipient}@s.whatsapp.net`;

        // Enviar mensagem
        if (campaign.media_url) {
          await sock.sendMessage(jid, {
            [campaign.media_type]: { url: campaign.media_url },
            caption: campaign.message
          });
        } else {
          await sock.sendMessage(jid, {
            text: campaign.message
          });
        }

        sent++;
        console.log(`[BroadcastQueue] ✅ Enviado para ${recipient} (${i + 1}/${recipients.length})`);

        // Atualizar progresso a cada 10 mensagens
        if (sent % 10 === 0) {
          await broadcastRepository.updateBroadcastCounters(campaignId, sent, failed);
          sent = 0;
          failed = 0;
        }

        // Aguardar delay entre mensagens
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        failed++;
        console.error(`[BroadcastQueue] ❌ Erro ao enviar para ${recipient}:`, error.message);
      }

      // Atualizar progresso no job
      const progress = Math.round(((i + 1) / recipients.length) * 100);
      job.progress(progress);
    }

    // Atualizar contadores finais
    await broadcastRepository.updateBroadcastCounters(campaignId, sent, failed);

    // Marcar como completado
    await broadcastRepository.updateBroadcastStatus(campaignId, 'completed');

    console.log(`[BroadcastQueue] ✅ Campanha ${campaignId} concluída. Enviadas: ${campaign.sent_count + sent}, Falhas: ${campaign.failed_count + failed}`);

    return {
      success: true,
      campaignId,
      totalSent: campaign.sent_count + sent,
      totalFailed: campaign.failed_count + failed,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[BroadcastQueue] ❌ Erro ao processar campanha ${campaignId}:`, error.message);

    // Marcar como falha se excedeu tentativas
    if (job.attemptsMade >= 2) {
      await broadcastRepository.updateBroadcastStatus(campaignId, 'failed');
    }

    throw error;
  }
});

// Eventos da fila
broadcastQueue.on('completed', (job, result) => {
  if (!result.skipped) {
    console.log(`[BroadcastQueue] Job ${job.id} completado:`, result);
  }
});

broadcastQueue.on('failed', (job, err) => {
  console.error(`[BroadcastQueue] Job ${job.id} falhou:`, err.message);
});

broadcastQueue.on('progress', (job, progress) => {
  console.log(`[BroadcastQueue] Job ${job.id} progresso: ${progress}%`);
});

broadcastQueue.on('stalled', (job) => {
  console.warn(`[BroadcastQueue] Job ${job.id} travado, será reprocessado`);
});

// Função auxiliar para adicionar campanha à fila
async function startBroadcastCampaign(campaignId) {
  return await broadcastQueue.add({ campaignId });
}

// Função auxiliar para pausar campanha
async function pauseBroadcastCampaign(campaignId) {
  const jobs = await broadcastQueue.getJobs(['active', 'waiting']);

  for (const job of jobs) {
    if (job.data.campaignId === campaignId) {
      await job.remove();
      await broadcastRepository.updateBroadcastStatus(campaignId, 'paused');
      console.log(`[BroadcastQueue] Campanha ${campaignId} pausada`);
      return true;
    }
  }

  return false;
}

// Função auxiliar para cancelar campanha
async function cancelBroadcastCampaign(campaignId) {
  const jobs = await broadcastQueue.getJobs(['active', 'waiting', 'delayed']);

  for (const job of jobs) {
    if (job.data.campaignId === campaignId) {
      await job.remove();
      console.log(`[BroadcastQueue] Campanha ${campaignId} removida da fila`);
      return true;
    }
  }

  return false;
}

// Função para obter status da fila
async function getBroadcastQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    broadcastQueue.getWaitingCount(),
    broadcastQueue.getActiveCount(),
    broadcastQueue.getCompletedCount(),
    broadcastQueue.getFailedCount(),
    broadcastQueue.getDelayedCount()
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
async function cleanBroadcastQueue() {
  await broadcastQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 horas
  await broadcastQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 dias
  console.log('[BroadcastQueue] Limpeza de jobs antigos concluída');
}

// Limpar automaticamente a cada 6 horas
setInterval(cleanBroadcastQueue, 6 * 60 * 60 * 1000);

module.exports = {
  broadcastQueue,
  startBroadcastCampaign,
  pauseBroadcastCampaign,
  cancelBroadcastCampaign,
  getBroadcastQueueStatus,
  cleanBroadcastQueue
};
