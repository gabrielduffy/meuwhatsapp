const Queue = require('bull');
const { redis } = require('../config/redis');
const schedulerRepository = require('../repositories/schedulerRepository');
const whatsapp = require('../services/whatsapp');

// Criar fila de agendamento
// Criar fila de agendamento
const redisConfig = process.env.REDIS_URL || 'redis://:@412Trocar@redis:6379';
const schedulerQueue = new Queue('scheduler', redisConfig, {
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

// Processar jobs de mensagens agendadas
schedulerQueue.process(async (job) => {
  const { messageId } = job.data;

  console.log(`[SchedulerQueue] Processando mensagem agendada ID: ${messageId}`);

  try {
    // Buscar mensagem agendada
    const scheduledMessage = await schedulerRepository.getScheduledMessageById(messageId);

    if (!scheduledMessage) {
      throw new Error(`Mensagem agendada ${messageId} não encontrada`);
    }

    if (scheduledMessage.status !== 'pending') {
      console.log(`[SchedulerQueue] Mensagem ${messageId} já foi processada (status: ${scheduledMessage.status})`);
      return { skipped: true, reason: 'already_processed' };
    }

    // Verificar se a instância existe e está conectada
    const sock = whatsapp.getSocket(scheduledMessage.instance_name);
    if (!sock) {
      throw new Error(`Instância ${scheduledMessage.instance_name} não está conectada`);
    }

    // Enviar mensagem
    const jid = scheduledMessage.recipient.includes('@')
      ? scheduledMessage.recipient
      : `${scheduledMessage.recipient}@s.whatsapp.net`;

    let sentMessage;

    if (scheduledMessage.media_url) {
      // Enviar com mídia
      sentMessage = await sock.sendMessage(jid, {
        [scheduledMessage.media_type]: { url: scheduledMessage.media_url },
        caption: scheduledMessage.message
      });
    } else {
      // Enviar texto simples
      sentMessage = await sock.sendMessage(jid, {
        text: scheduledMessage.message
      });
    }

    // Atualizar status para enviada
    await schedulerRepository.updateScheduledMessageStatus(messageId, 'sent');

    console.log(`[SchedulerQueue] ✅ Mensagem ${messageId} enviada com sucesso`);

    return {
      success: true,
      messageId,
      sentAt: new Date().toISOString(),
      messageKey: sentMessage.key
    };

  } catch (error) {
    console.error(`[SchedulerQueue] ❌ Erro ao processar mensagem ${messageId}:`, error.message);

    // Incrementar contador de retry
    await schedulerRepository.incrementRetryCount(messageId);

    // Se excedeu tentativas, marcar como falha
    if (job.attemptsMade >= 2) {
      await schedulerRepository.updateScheduledMessageStatus(
        messageId,
        'failed',
        error.message
      );
    }

    throw error; // Re-throw para Bull processar retry
  }
});

// Eventos da fila
schedulerQueue.on('completed', (job, result) => {
  if (!result.skipped) {
    console.log(`[SchedulerQueue] Job ${job.id} completado:`, result);
  }
});

schedulerQueue.on('failed', (job, err) => {
  console.error(`[SchedulerQueue] Job ${job.id} falhou:`, err.message);
});

schedulerQueue.on('stalled', (job) => {
  console.warn(`[SchedulerQueue] Job ${job.id} travado, será reprocessado`);
});

// Função auxiliar para adicionar mensagem à fila
async function scheduleMessage(messageId, scheduledTime) {
  const delay = new Date(scheduledTime).getTime() - Date.now();

  if (delay < 0) {
    // Se já passou da hora, processar imediatamente
    return await schedulerQueue.add({ messageId }, { delay: 0 });
  }

  return await schedulerQueue.add({ messageId }, { delay });
}

// Função auxiliar para cancelar mensagem agendada
async function cancelScheduledMessage(messageId) {
  const jobs = await schedulerQueue.getJobs(['waiting', 'delayed']);

  for (const job of jobs) {
    if (job.data.messageId === messageId) {
      await job.remove();
      console.log(`[SchedulerQueue] Mensagem ${messageId} removida da fila`);
      return true;
    }
  }

  return false;
}

// Função para limpar jobs antigos
async function cleanSchedulerQueue() {
  await schedulerQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 horas
  await schedulerQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 dias
  console.log('[SchedulerQueue] Limpeza de jobs antigos concluída');
}

// Limpar automaticamente a cada 6 horas
setInterval(cleanSchedulerQueue, 6 * 60 * 60 * 1000);

module.exports = {
  schedulerQueue,
  scheduleMessage,
  cancelScheduledMessage,
  cleanSchedulerQueue
};
