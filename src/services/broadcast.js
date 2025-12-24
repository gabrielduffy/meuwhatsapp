const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { sendText, sendImage, sendDocument, sendVideo } = require('./whatsapp');

// Diretório de dados
const DATA_DIR = process.env.DATA_DIR || './data';
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');

// Armazenamento de campanhas
let campaigns = {};
let campaignJobs = {};

// Inicializar broadcast
function initBroadcast() {
  loadCampaigns();

  // Processar campanhas a cada 30 segundos
  cron.schedule('*/30 * * * * *', () => {
    processCampaigns();
  });

  console.log('[Broadcast] Sistema de disparo em massa inicializado');
}

// Criar campanha
function createCampaign(data) {
  const {
    name,
    instanceName,
    recipients, // Array de {number, name, vars}
    messageType,
    messageTemplate,
    imageUrl,
    caption,
    delayBetweenMessages,
    messagesPerHour,
    randomizeOrder,
    humanizeTyping,
    startAt,
    endAt
  } = data;

  // Validações
  if (!name || !instanceName || !recipients || !messageType) {
    throw new Error('Parâmetros obrigatórios faltando');
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Lista de destinatários inválida');
  }

  const campaignId = uuidv4();
  const campaign = {
    id: campaignId,
    name,
    instanceName,
    recipients: randomizeOrder ? shuffleArray([...recipients]) : recipients,
    messageType,
    messageTemplate,
    imageUrl,
    caption,
    delayBetweenMessages: delayBetweenMessages || { min: 30, max: 60 },
    messagesPerHour: messagesPerHour || 20,
    randomizeOrder: randomizeOrder !== false,
    humanizeTyping: humanizeTyping !== false,
    startAt: startAt || new Date().toISOString(),
    endAt: endAt || null,
    status: 'draft', // draft, running, paused, completed, failed
    progress: {
      total: recipients.length,
      sent: 0,
      failed: 0,
      pending: recipients.length,
      currentIndex: 0,
      currentRecipient: null,
      lastSentAt: null
    },
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    errors: []
  };

  campaigns[campaignId] = campaign;
  saveCampaigns();

  return {
    success: true,
    campaignId,
    campaign
  };
}

// Iniciar campanha
function startCampaign(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  if (campaign.status === 'running') {
    throw new Error('Campanha já está rodando');
  }

  campaign.status = 'running';
  campaign.startedAt = new Date().toISOString();
  saveCampaigns();

  return {
    success: true,
    message: 'Campanha iniciada'
  };
}

// Pausar campanha
function pauseCampaign(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  campaign.status = 'paused';
  saveCampaigns();

  return {
    success: true,
    message: 'Campanha pausada'
  };
}

// Retomar campanha
function resumeCampaign(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  campaign.status = 'running';
  saveCampaigns();

  return {
    success: true,
    message: 'Campanha retomada'
  };
}

// Cancelar campanha
function cancelCampaign(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  campaign.status = 'cancelled';
  campaign.completedAt = new Date().toISOString();
  saveCampaigns();

  return {
    success: true,
    message: 'Campanha cancelada'
  };
}

// Obter campanha
function getCampaign(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  return campaign;
}

// Listar campanhas de uma instância
function listCampaigns(instanceName, status = null) {
  let campaignList = Object.values(campaigns)
    .filter(c => c.instanceName === instanceName);

  if (status) {
    campaignList = campaignList.filter(c => c.status === status);
  }

  campaignList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return campaignList;
}

// Processar campanhas ativas
async function processCampaigns() {
  const now = new Date();

  for (const campaignId in campaigns) {
    const campaign = campaigns[campaignId];

    // Só processar campanhas em execução
    if (campaign.status !== 'running') continue;

    // Verificar se está dentro do horário
    const startAt = new Date(campaign.startAt);
    if (now < startAt) continue;

    if (campaign.endAt) {
      const endAt = new Date(campaign.endAt);
      if (now > endAt) {
        campaign.status = 'completed';
        campaign.completedAt = now.toISOString();
        saveCampaigns();
        continue;
      }
    }

    // Verificar se todos foram enviados
    if (campaign.progress.currentIndex >= campaign.recipients.length) {
      campaign.status = 'completed';
      campaign.completedAt = now.toISOString();
      saveCampaigns();
      continue;
    }

    // Verificar intervalo desde última mensagem
    if (campaign.progress.lastSentAt) {
      const lastSent = new Date(campaign.progress.lastSentAt);
      const delayMs = getRandomDelay(campaign.delayBetweenMessages) * 1000;
      const nextSendTime = new Date(lastSent.getTime() + delayMs);

      if (now < nextSendTime) {
        continue; // Ainda não é hora de enviar
      }
    }

    // Verificar limite de mensagens por hora
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentMessages = campaign.errors.filter(e =>
      e.timestamp && new Date(e.timestamp) > oneHourAgo && e.type === 'sent'
    ).length;

    if (recentMessages >= campaign.messagesPerHour) {
      continue; // Limite atingido
    }

    // Enviar próxima mensagem
    await sendNextMessage(campaignId);
  }
}

// Enviar próxima mensagem da campanha
async function sendNextMessage(campaignId) {
  const campaign = campaigns[campaignId];

  if (!campaign || campaign.progress.currentIndex >= campaign.recipients.length) {
    return;
  }

  const recipient = campaign.recipients[campaign.progress.currentIndex];
  campaign.progress.currentRecipient = recipient.name || recipient.number;

  try {
    // Substituir variáveis no template
    let message = campaign.messageTemplate;
    if (recipient.vars) {
      Object.keys(recipient.vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, recipient.vars[key]);
      });
    }

    // Substituir variável de nome
    message = message.replace(/{{name}}/g, recipient.name || '');
    message = message.replace(/{{nome}}/g, recipient.name || '');

    // Enviar conforme tipo
    let result;

    switch (campaign.messageType) {
      case 'text':
        result = await sendText(
          campaign.instanceName,
          recipient.number,
          message,
          {
            simulateTyping: campaign.humanizeTyping,
            typingTime: getRandomDelay({ min: 2, max: 5 }) * 1000
          }
        );
        break;

      case 'image':
        result = await sendImage(
          campaign.instanceName,
          recipient.number,
          campaign.imageUrl,
          message,
          {
            simulateTyping: campaign.humanizeTyping
          }
        );
        break;

      case 'video':
        result = await sendVideo(
          campaign.instanceName,
          recipient.number,
          campaign.imageUrl, // Usar imageUrl como videoUrl
          message,
          {}
        );
        break;

      case 'document':
        result = await sendDocument(
          campaign.instanceName,
          recipient.number,
          campaign.imageUrl, // Usar imageUrl como documentUrl
          'documento.pdf',
          'application/pdf',
          message,
          {}
        );
        break;

      default:
        throw new Error(`Tipo de mensagem não suportado: ${campaign.messageType}`);
    }

    // Atualizar progresso
    campaign.progress.sent++;
    campaign.progress.pending--;
    campaign.progress.lastSentAt = new Date().toISOString();
    campaign.errors.push({
      type: 'sent',
      recipient: recipient.number,
      timestamp: new Date().toISOString()
    });

    console.log(`[Broadcast] ${campaign.name}: Enviado para ${recipient.number} (${campaign.progress.sent}/${campaign.progress.total})`);

  } catch (error) {
    console.error(`[Broadcast] Erro ao enviar para ${recipient.number}:`, error.message);

    campaign.progress.failed++;
    campaign.progress.pending--;
    campaign.errors.push({
      type: 'error',
      recipient: recipient.number,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Avançar para próximo
  campaign.progress.currentIndex++;
  saveCampaigns();
}

// Obter delay aleatório
function getRandomDelay(config) {
  const min = config.min || 30;
  const max = config.max || 60;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Embaralhar array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Salvar campanhas
function saveCampaigns() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
  } catch (error) {
    console.error('[Broadcast] Erro ao salvar campanhas:', error.message);
  }
}

// Carregar campanhas
function loadCampaigns() {
  try {
    if (fs.existsSync(CAMPAIGNS_FILE)) {
      const data = fs.readFileSync(CAMPAIGNS_FILE, 'utf8');
      campaigns = JSON.parse(data);

      const active = Object.values(campaigns).filter(c => c.status === 'running').length;
      console.log('[Broadcast] Campanhas carregadas:', {
        total: Object.keys(campaigns).length,
        running: active
      });
    }
  } catch (error) {
    console.error('[Broadcast] Erro ao carregar campanhas:', error.message);
    campaigns = {};
  }
}

module.exports = {
  initBroadcast,
  createCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getCampaign,
  listCampaigns
};
