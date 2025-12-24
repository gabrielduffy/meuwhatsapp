const Groq = require('groq-sdk');
const cron = require('node-cron');
const { getInstance, sendText, updatePresence, joinGroupByCode } = require('./whatsapp');

// Armazenamento das configurações de aquecimento
const warmingConfigs = {};
const warmingStats = {};
const warmingJobs = {};

// Tópicos padrão para conversas
const DEFAULT_TOPICS = [
  'trabalho',
  'tecnologia',
  'futebol',
  'séries e filmes',
  'música',
  'viagens',
  'comida',
  'notícias do dia',
  'hobbies',
  'família',
  'fim de semana',
  'clima'
];

// Personalidades para variar o estilo de conversa
const PERSONALITIES = [
  { name: 'casual', style: 'informal, usa gírias, emojis frequentes' },
  { name: 'profissional', style: 'educado, formal mas amigável' },
  { name: 'animado', style: 'muito entusiasmado, usa muitos emojis e exclamações' },
  { name: 'tranquilo', style: 'calmo, respostas mais curtas e diretas' }
];

// Iniciar aquecimento
async function startWarming(instanceName, config) {
  const instance = getInstance(instanceName);
  if (!instance) {
    throw new Error('Instância não encontrada');
  }

  if (!config.groqApiKey) {
    throw new Error('Chave da API Groq é obrigatória');
  }

  // Configuração padrão
  const warmingConfig = {
    instanceName,
    partnerInstance: config.partnerInstance || null,
    partnerNumber: config.partnerNumber || null,
    groqApiKey: config.groqApiKey,
    messagesPerDay: config.messagesPerDay || 20,
    minIntervalMinutes: config.minIntervalMinutes || 30,
    maxIntervalMinutes: config.maxIntervalMinutes || 120,
    topics: config.topics || DEFAULT_TOPICS,
    joinGroups: config.joinGroups || false,
    groupLinks: config.groupLinks || [],
    activeHoursStart: config.activeHoursStart || 8,
    activeHoursEnd: config.activeHoursEnd || 22,
    simulateTyping: config.simulateTyping !== false,
    personality: config.personality || 'casual',
    enabled: true,
    createdAt: new Date().toISOString()
  };

  warmingConfigs[instanceName] = warmingConfig;
  
  // Inicializar estatísticas
  warmingStats[instanceName] = {
    messagesSentToday: 0,
    messagesReceivedToday: 0,
    lastMessageAt: null,
    conversationHistory: [],
    groupsJoined: [],
    errors: [],
    startedAt: new Date().toISOString()
  };

  // Agendar job de aquecimento
  scheduleWarmingJob(instanceName);

  // Entrar em grupos se configurado
  if (warmingConfig.joinGroups && warmingConfig.groupLinks.length > 0) {
    await joinWarmingGroups(instanceName);
  }

  return {
    success: true,
    message: 'Aquecimento iniciado',
    config: warmingConfig
  };
}

// Parar aquecimento
function stopWarming(instanceName) {
  if (warmingJobs[instanceName]) {
    warmingJobs[instanceName].stop();
    delete warmingJobs[instanceName];
  }

  if (warmingConfigs[instanceName]) {
    warmingConfigs[instanceName].enabled = false;
  }

  return { success: true, message: 'Aquecimento parado' };
}

// Obter status do aquecimento
function getWarmingStatus(instanceName) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  if (!config) {
    return { active: false };
  }

  return {
    active: config.enabled,
    config: {
      messagesPerDay: config.messagesPerDay,
      minIntervalMinutes: config.minIntervalMinutes,
      maxIntervalMinutes: config.maxIntervalMinutes,
      topics: config.topics,
      activeHours: `${config.activeHoursStart}h - ${config.activeHoursEnd}h`,
      personality: config.personality
    },
    stats: stats || {}
  };
}

// Atualizar configuração
function updateWarmingConfig(instanceName, newConfig) {
  if (!warmingConfigs[instanceName]) {
    throw new Error('Aquecimento não iniciado para esta instância');
  }

  Object.assign(warmingConfigs[instanceName], newConfig);
  
  // Reagendar se necessário
  if (warmingJobs[instanceName]) {
    warmingJobs[instanceName].stop();
    scheduleWarmingJob(instanceName);
  }

  return { success: true, config: warmingConfigs[instanceName] };
}

// Agendar job de aquecimento
function scheduleWarmingJob(instanceName) {
  const config = warmingConfigs[instanceName];
  
  // Executar a cada minuto e decidir aleatoriamente se envia mensagem
  const job = cron.schedule('* * * * *', async () => {
    try {
      await processWarming(instanceName);
    } catch (error) {
      console.error(`[Warming ${instanceName}] Erro:`, error.message);
      if (warmingStats[instanceName]) {
        warmingStats[instanceName].errors.push({
          time: new Date().toISOString(),
          error: error.message
        });
      }
    }
  });

  warmingJobs[instanceName] = job;
}

// Processar aquecimento
async function processWarming(instanceName) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  if (!config || !config.enabled) return;

  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) return;

  // Verificar horário ativo
  const currentHour = new Date().getHours();
  if (currentHour < config.activeHoursStart || currentHour >= config.activeHoursEnd) {
    return;
  }

  // Verificar limite diário
  if (stats.messagesSentToday >= config.messagesPerDay) {
    return;
  }

  // Verificar intervalo mínimo
  if (stats.lastMessageAt) {
    const lastMessage = new Date(stats.lastMessageAt);
    const minInterval = config.minIntervalMinutes * 60 * 1000;
    if (Date.now() - lastMessage.getTime() < minInterval) {
      return;
    }
  }

  // Decidir aleatoriamente se envia mensagem agora
  // Baseado no intervalo máximo configurado
  const maxInterval = config.maxIntervalMinutes;
  const probability = 1 / maxInterval; // Probabilidade por minuto
  
  if (Math.random() > probability) {
    return;
  }

  // Decidir para quem enviar
  let targetJid;
  let isPartnerConversation = false;

  if (config.partnerInstance) {
    // Conversa entre instâncias
    const partnerInstance = getInstance(config.partnerInstance);
    if (partnerInstance && partnerInstance.isConnected && partnerInstance.user) {
      targetJid = partnerInstance.user.id;
      isPartnerConversation = true;
    }
  } else if (config.partnerNumber) {
    targetJid = config.partnerNumber;
    isPartnerConversation = true;
  }

  if (!targetJid) {
    return;
  }

  // Gerar e enviar mensagem
  await sendWarmingMessage(instanceName, targetJid, isPartnerConversation);
}

// Enviar mensagem de aquecimento
async function sendWarmingMessage(instanceName, targetJid, isPartnerConversation) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  // Gerar mensagem com IA
  const message = await generateMessage(instanceName, targetJid);

  if (!message) return;

  // Simular digitação
  if (config.simulateTyping) {
    await updatePresence(instanceName, targetJid, 'composing');
    // Delay baseado no tamanho da mensagem (aproximadamente 50ms por caractere)
    const typingTime = Math.min(message.length * 50, 5000);
    await new Promise(resolve => setTimeout(resolve, typingTime));
    await updatePresence(instanceName, targetJid, 'paused');
  }

  // Delay aleatório adicional (1-3 segundos)
  const extraDelay = Math.random() * 2000 + 1000;
  await new Promise(resolve => setTimeout(resolve, extraDelay));

  // Enviar mensagem
  await sendText(instanceName, targetJid, message);

  // Atualizar estatísticas
  stats.messagesSentToday++;
  stats.lastMessageAt = new Date().toISOString();
  stats.conversationHistory.push({
    time: stats.lastMessageAt,
    direction: 'sent',
    message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    to: targetJid
  });

  // Limitar histórico a 50 mensagens
  if (stats.conversationHistory.length > 50) {
    stats.conversationHistory = stats.conversationHistory.slice(-50);
  }

  console.log(`[Warming ${instanceName}] Mensagem enviada para ${targetJid}`);
}

// Gerar mensagem com Groq
async function generateMessage(instanceName, targetJid) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  const groq = new Groq({ apiKey: config.groqApiKey });

  // Escolher tópico aleatório
  const topic = config.topics[Math.floor(Math.random() * config.topics.length)];
  
  // Escolher personalidade
  const personality = PERSONALITIES.find(p => p.name === config.personality) || PERSONALITIES[0];

  // Construir contexto da conversa
  const recentMessages = stats.conversationHistory.slice(-5);
  const conversationContext = recentMessages.length > 0
    ? `\nMensagens recentes da conversa:\n${recentMessages.map(m => `${m.direction === 'sent' ? 'Você' : 'Outro'}: ${m.message}`).join('\n')}`
    : '';

  const prompt = `Você é uma pessoa real conversando pelo WhatsApp. Seu estilo é: ${personality.style}.

Gere UMA ÚNICA mensagem curta e natural sobre o tópico: "${topic}"

Regras importantes:
- Mensagem deve ter entre 5 e 50 palavras
- Use linguagem coloquial brasileira
- Pode usar emojis (1-2 no máximo)
- Pode fazer perguntas para manter a conversa
- NÃO use formatação markdown
- NÃO comece com "Oi" ou "Olá" a menos que seja início de conversa
- Seja natural, como se estivesse conversando com um amigo
${conversationContext}

Responda APENAS com a mensagem, sem explicações ou contexto adicional.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      temperature: 0.9
    });

    const message = completion.choices[0]?.message?.content?.trim();
    
    // Validar mensagem
    if (!message || message.length < 5 || message.length > 500) {
      return null;
    }

    return message;
  } catch (error) {
    console.error(`[Warming ${instanceName}] Erro ao gerar mensagem:`, error.message);
    return null;
  }
}

// Processar resposta recebida (chamado pelo webhook)
async function processIncomingWarmingMessage(instanceName, from, message) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  if (!config || !config.enabled) return;

  // Verificar se é do parceiro de aquecimento
  const isFromPartner = (config.partnerNumber && from.includes(config.partnerNumber.replace(/\D/g, ''))) ||
    (config.partnerInstance && getInstance(config.partnerInstance)?.user?.id === from);

  if (!isFromPartner) return;

  // Registrar mensagem recebida
  stats.messagesReceivedToday++;
  stats.conversationHistory.push({
    time: new Date().toISOString(),
    direction: 'received',
    message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    from
  });

  // Responder após delay aleatório (30 segundos a 5 minutos)
  const responseDelay = Math.random() * 270000 + 30000;
  
  setTimeout(async () => {
    try {
      await sendWarmingMessage(instanceName, from, true);
    } catch (error) {
      console.error(`[Warming ${instanceName}] Erro ao responder:`, error.message);
    }
  }, responseDelay);
}

// Entrar em grupos de aquecimento
async function joinWarmingGroups(instanceName) {
  const config = warmingConfigs[instanceName];
  const stats = warmingStats[instanceName];

  for (const link of config.groupLinks) {
    try {
      // Delay entre entradas em grupos (1-3 minutos)
      const delay = Math.random() * 120000 + 60000;
      await new Promise(resolve => setTimeout(resolve, delay));

      const result = await joinGroupByCode(instanceName, link);
      stats.groupsJoined.push({
        link,
        groupId: result.groupId,
        joinedAt: new Date().toISOString()
      });
      
      console.log(`[Warming ${instanceName}] Entrou no grupo: ${result.groupId}`);
    } catch (error) {
      console.error(`[Warming ${instanceName}] Erro ao entrar no grupo ${link}:`, error.message);
    }
  }
}

// Resetar estatísticas diárias (chamar todo dia à meia-noite)
function resetDailyStats() {
  for (const instanceName of Object.keys(warmingStats)) {
    warmingStats[instanceName].messagesSentToday = 0;
    warmingStats[instanceName].messagesReceivedToday = 0;
  }
}

// Agendar reset diário
cron.schedule('0 0 * * *', () => {
  console.log('[Warming] Resetando estatísticas diárias');
  resetDailyStats();
});

// Obter todas as configurações de aquecimento
function getAllWarmingConfigs() {
  return Object.keys(warmingConfigs).map(name => ({
    instanceName: name,
    ...getWarmingStatus(name)
  }));
}

module.exports = {
  startWarming,
  stopWarming,
  getWarmingStatus,
  updateWarmingConfig,
  processIncomingWarmingMessage,
  getAllWarmingConfigs,
  resetDailyStats
};
