const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const {
  sendText,
  sendImage,
  sendDocument,
  sendAudio,
  sendVideo,
  sendSticker,
  sendLocation,
  sendContact,
  sendPoll
} = require('./whatsapp');

// Diretório de dados
const DATA_DIR = process.env.DATA_DIR || './data';
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');

// Armazenamento de mensagens agendadas
let scheduledMessages = {};

// Inicializar scheduler
function initScheduler() {
  loadScheduledMessages();

  // Verificar mensagens agendadas a cada minuto
  cron.schedule('* * * * *', () => {
    processScheduledMessages();
  });

  console.log('[Scheduler] Sistema de agendamento inicializado');
}

// Agendar nova mensagem
function scheduleMessage(data) {
  const {
    instanceName,
    to,
    type,
    content,
    scheduledAt
  } = data;

  // Validações
  if (!instanceName || !to || !type || !content || !scheduledAt) {
    throw new Error('Parâmetros obrigatórios faltando');
  }

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();

  if (scheduledDate <= now) {
    throw new Error('Data de agendamento deve ser no futuro');
  }

  // Criar mensagem agendada
  const messageId = uuidv4();
  const scheduledMessage = {
    id: messageId,
    instanceName,
    to,
    type,
    content,
    scheduledAt: scheduledDate.toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    sentAt: null,
    error: null
  };

  scheduledMessages[messageId] = scheduledMessage;
  saveScheduledMessages();

  return {
    success: true,
    messageId,
    scheduledMessage
  };
}

// Cancelar mensagem agendada
function cancelScheduledMessage(messageId) {
  if (!scheduledMessages[messageId]) {
    throw new Error('Mensagem agendada não encontrada');
  }

  if (scheduledMessages[messageId].status === 'sent') {
    throw new Error('Mensagem já foi enviada');
  }

  scheduledMessages[messageId].status = 'cancelled';
  scheduledMessages[messageId].cancelledAt = new Date().toISOString();
  saveScheduledMessages();

  return {
    success: true,
    message: 'Agendamento cancelado'
  };
}

// Obter mensagens agendadas de uma instância
function getScheduledMessages(instanceName, status = null) {
  let messages = Object.values(scheduledMessages)
    .filter(msg => msg.instanceName === instanceName);

  if (status) {
    messages = messages.filter(msg => msg.status === status);
  }

  // Ordenar por data de agendamento
  messages.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return messages;
}

// Obter status de uma mensagem agendada
function getScheduledMessageStatus(messageId) {
  const message = scheduledMessages[messageId];

  if (!message) {
    throw new Error('Mensagem agendada não encontrada');
  }

  return message;
}

// Processar mensagens agendadas
async function processScheduledMessages() {
  const now = new Date();

  for (const messageId in scheduledMessages) {
    const message = scheduledMessages[messageId];

    // Só processar mensagens pendentes
    if (message.status !== 'pending') continue;

    const scheduledDate = new Date(message.scheduledAt);

    // Verificar se chegou a hora de enviar
    if (scheduledDate <= now) {
      await sendScheduledMessage(messageId);
    }
  }
}

// Enviar mensagem agendada
async function sendScheduledMessage(messageId) {
  const message = scheduledMessages[messageId];

  try {
    console.log(`[Scheduler] Enviando mensagem agendada ${messageId}...`);

    let result;

    // Enviar conforme o tipo
    switch (message.type) {
      case 'text':
        result = await sendText(
          message.instanceName,
          message.to,
          message.content.text,
          message.content.options || {}
        );
        break;

      case 'image':
        result = await sendImage(
          message.instanceName,
          message.to,
          message.content.imageUrl,
          message.content.caption || '',
          message.content.options || {}
        );
        break;

      case 'document':
        result = await sendDocument(
          message.instanceName,
          message.to,
          message.content.documentUrl,
          message.content.fileName,
          message.content.mimetype,
          message.content.caption || '',
          message.content.options || {}
        );
        break;

      case 'audio':
        result = await sendAudio(
          message.instanceName,
          message.to,
          message.content.audioUrl,
          message.content.ptt !== false,
          message.content.options || {}
        );
        break;

      case 'video':
        result = await sendVideo(
          message.instanceName,
          message.to,
          message.content.videoUrl,
          message.content.caption || '',
          message.content.options || {}
        );
        break;

      case 'sticker':
        result = await sendSticker(
          message.instanceName,
          message.to,
          message.content.stickerUrl,
          message.content.options || {}
        );
        break;

      case 'location':
        result = await sendLocation(
          message.instanceName,
          message.to,
          message.content.latitude,
          message.content.longitude,
          message.content.name || '',
          message.content.address || '',
          message.content.options || {}
        );
        break;

      case 'contact':
        result = await sendContact(
          message.instanceName,
          message.to,
          message.content.contactName,
          message.content.contactNumber,
          message.content.options || {}
        );
        break;

      case 'poll':
        result = await sendPoll(
          message.instanceName,
          message.to,
          message.content.name,
          message.content.values,
          message.content.selectableCount || 1,
          message.content.options || {}
        );
        break;

      default:
        throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
    }

    // Atualizar status
    updateMessageStatus(messageId, 'sent', null, result);

    console.log(`[Scheduler] ✓ Mensagem ${messageId} enviada com sucesso`);

  } catch (error) {
    console.error(`[Scheduler] ✗ Erro ao enviar mensagem ${messageId}:`, error.message);
    updateMessageStatus(messageId, 'failed', error.message);
  }
}

// Atualizar status de mensagem
function updateMessageStatus(messageId, status, error = null, result = null) {
  if (!scheduledMessages[messageId]) return;

  scheduledMessages[messageId].status = status;
  scheduledMessages[messageId].error = error;

  if (status === 'sent') {
    scheduledMessages[messageId].sentAt = new Date().toISOString();
    scheduledMessages[messageId].result = result;
  }

  saveScheduledMessages();
}

// Limpar mensagens antigas
function cleanupOldMessages() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let cleaned = 0;

  for (const messageId in scheduledMessages) {
    const message = scheduledMessages[messageId];

    // Remover mensagens enviadas há mais de 7 dias
    if (message.status === 'sent' && message.sentAt) {
      const sentDate = new Date(message.sentAt);
      if (sentDate < sevenDaysAgo) {
        delete scheduledMessages[messageId];
        cleaned++;
      }
    }

    // Remover mensagens falhadas há mais de 7 dias
    if (message.status === 'failed') {
      const scheduledDate = new Date(message.scheduledAt);
      if (scheduledDate < sevenDaysAgo) {
        delete scheduledMessages[messageId];
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    saveScheduledMessages();
    console.log(`[Scheduler] Limpeza: ${cleaned} mensagens antigas removidas`);
  }

  return cleaned;
}

// Salvar mensagens agendadas
function saveScheduledMessages() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(scheduledMessages, null, 2));
  } catch (error) {
    console.error('[Scheduler] Erro ao salvar mensagens agendadas:', error.message);
  }
}

// Carregar mensagens agendadas
function loadScheduledMessages() {
  try {
    if (fs.existsSync(SCHEDULED_FILE)) {
      const data = fs.readFileSync(SCHEDULED_FILE, 'utf8');
      scheduledMessages = JSON.parse(data);

      console.log('[Scheduler] Mensagens agendadas carregadas:', {
        total: Object.keys(scheduledMessages).length,
        pending: Object.values(scheduledMessages).filter(m => m.status === 'pending').length
      });
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao carregar mensagens agendadas:', error.message);
    scheduledMessages = {};
  }
}

// Agendar limpeza automática (diariamente às 3h)
cron.schedule('0 3 * * *', () => {
  cleanupOldMessages();
});

module.exports = {
  initScheduler,
  scheduleMessage,
  cancelScheduledMessage,
  getScheduledMessages,
  getScheduledMessageStatus,
  cleanupOldMessages
};
