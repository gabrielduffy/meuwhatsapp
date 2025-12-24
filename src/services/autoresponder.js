const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const { sendText, updatePresence } = require('./whatsapp');

// Diretório de dados
const DATA_DIR = process.env.DATA_DIR || './data';
const AUTORESPONDER_FILE = path.join(DATA_DIR, 'autoresponders.json');

// Armazenamento de configurações
let autoresponders = {};
let conversationHistory = {}; // {instanceName: {contactNumber: [messages]}}
let dailyLimits = {}; // {instanceName: {contactNumber: count}}

// Inicializar auto-resposta
function initAutoResponder() {
  loadAutoResponders();
  console.log('[AutoResponder] Sistema de auto-resposta inicializado');
}

// Configurar auto-resposta para instância
function configureAutoResponder(instanceName, config) {
  const {
    enabled,
    groqApiKey,
    model,
    respondTo,
    whitelist,
    blacklist,
    personality,
    businessContext,
    language,
    maxResponseLength,
    maxResponsesPerContact,
    responseDelay,
    activeHoursStart,
    activeHoursEnd,
    weekendEnabled
  } = config;

  if (!groqApiKey) {
    throw new Error('Groq API Key é obrigatória');
  }

  autoresponders[instanceName] = {
    enabled: enabled !== false,
    groqApiKey,
    model: model || 'llama-3.1-8b-instant',
    respondTo: respondTo || 'all', // all, contacts, groups, specific
    whitelist: whitelist || [],
    blacklist: blacklist || [],
    personality: personality || 'Atendente prestativo e amigável',
    businessContext: businessContext || 'Sou um assistente virtual',
    language: language || 'pt-BR',
    maxResponseLength: maxResponseLength || 500,
    maxResponsesPerContact: maxResponsesPerContact || 5,
    responseDelay: responseDelay || { min: 2, max: 5 },
    activeHoursStart: activeHoursStart || 0,
    activeHoursEnd: activeHoursEnd || 23,
    weekendEnabled: weekendEnabled !== false,
    stats: {
      responsesGiven: 0,
      conversationsHandled: 0,
      lastResponseAt: null
    },
    createdAt: new Date().toISOString()
  };

  saveAutoResponders();

  return {
    success: true,
    message: 'Auto-resposta configurada'
  };
}

// Desativar auto-resposta
function disableAutoResponder(instanceName) {
  if (autoresponders[instanceName]) {
    autoresponders[instanceName].enabled = false;
    saveAutoResponders();
  }

  return {
    success: true,
    message: 'Auto-resposta desativada'
  };
}

// Ativar auto-resposta
function enableAutoResponder(instanceName) {
  if (!autoresponders[instanceName]) {
    throw new Error('Auto-resposta não configurada');
  }

  autoresponders[instanceName].enabled = true;
  saveAutoResponders();

  return {
    success: true,
    message: 'Auto-resposta ativada'
  };
}

// Obter configuração
function getAutoResponderConfig(instanceName) {
  return autoresponders[instanceName] || null;
}

// Verificar se deve responder
function shouldRespond(instanceName, from, message) {
  const config = autoresponders[instanceName];

  if (!config || !config.enabled) {
    return false;
  }

  // Verificar horário
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  if (hour < config.activeHoursStart || hour > config.activeHoursEnd) {
    return false;
  }

  if (!config.weekendEnabled && (day === 0 || day === 6)) {
    return false;
  }

  // Verificar blacklist
  if (config.blacklist.includes(from)) {
    return false;
  }

  // Verificar whitelist (se configurado)
  if (config.whitelist.length > 0 && !config.whitelist.includes(from)) {
    return false;
  }

  // Verificar limite diário
  const today = now.toISOString().split('T')[0];
  if (!dailyLimits[instanceName]) {
    dailyLimits[instanceName] = {};
  }

  const key = `${from}-${today}`;
  const count = dailyLimits[instanceName][key] || 0;

  if (count >= config.maxResponsesPerContact) {
    return false;
  }

  // Verificar tipo de conversa
  const isGroup = from.includes('@g.us');

  if (config.respondTo === 'contacts' && isGroup) {
    return false;
  }

  if (config.respondTo === 'groups' && !isGroup) {
    return false;
  }

  return true;
}

// Processar mensagem recebida
async function handleIncomingMessage(instanceName, from, message) {
  const config = autoresponders[instanceName];

  if (!shouldRespond(instanceName, from, message)) {
    return;
  }

  try {
    console.log(`[AutoResponder] ${instanceName}: Processando mensagem de ${from}`);

    // Simular digitação
    await updatePresence(instanceName, from, 'composing');

    // Delay aleatório
    const delay = getRandomDelay(config.responseDelay);
    await sleep(delay * 1000);

    // Gerar resposta com IA
    const response = await generateResponse(instanceName, from, message, config);

    // Enviar resposta
    await sendText(instanceName, from, response, {
      simulateTyping: false // Já simulamos acima
    });

    // Atualizar estatísticas
    config.stats.responsesGiven++;
    config.stats.lastResponseAt = new Date().toISOString();

    // Atualizar limite diário
    const today = new Date().toISOString().split('T')[0];
    const key = `${from}-${today}`;
    if (!dailyLimits[instanceName]) {
      dailyLimits[instanceName] = {};
    }
    dailyLimits[instanceName][key] = (dailyLimits[instanceName][key] || 0) + 1;

    saveAutoResponders();

    await updatePresence(instanceName, from, 'paused');

    console.log(`[AutoResponder] ${instanceName}: Resposta enviada para ${from}`);

  } catch (error) {
    console.error(`[AutoResponder] Erro ao processar mensagem:`, error.message);
    await updatePresence(instanceName, from, 'paused');
  }
}

// Gerar resposta com IA
async function generateResponse(instanceName, from, message, config) {
  try {
    const groq = new Groq({ apiKey: config.groqApiKey });

    // Obter histórico de conversa
    if (!conversationHistory[instanceName]) {
      conversationHistory[instanceName] = {};
    }

    if (!conversationHistory[instanceName][from]) {
      conversationHistory[instanceName][from] = [];
    }

    const history = conversationHistory[instanceName][from];

    // Adicionar mensagem atual
    history.push({
      role: 'user',
      content: message
    });

    // Manter apenas últimas 10 mensagens
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    // Criar prompt do sistema
    const systemPrompt = `Você é ${config.personality}.

Contexto do negócio: ${config.businessContext}

Regras importantes:
- Responda em ${config.language}
- Seja natural, amigável e útil
- Mantenha respostas curtas (máximo ${config.maxResponseLength} caracteres)
- Se não souber algo, seja honesto
- Não invente informações
- Use emojis moderadamente quando apropriado

Responda de forma conversacional e útil.`;

    // Criar mensagens para API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5) // Últimas 5 mensagens
    ];

    // Chamar Groq
    const completion = await groq.chat.completions.create({
      messages,
      model: config.model,
      temperature: 0.7,
      max_tokens: Math.min(200, Math.floor(config.maxResponseLength / 2)),
    });

    let response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    // Limitar tamanho da resposta
    if (response.length > config.maxResponseLength) {
      response = response.substring(0, config.maxResponseLength) + '...';
    }

    // Adicionar resposta ao histórico
    history.push({
      role: 'assistant',
      content: response
    });

    return response;

  } catch (error) {
    console.error('[AutoResponder] Erro ao gerar resposta:', error.message);
    return 'Desculpe, estou com dificuldades técnicas no momento. Tente novamente em breve.';
  }
}

// Limpar histórico de conversa
function clearConversationHistory(instanceName, contactNumber = null) {
  if (contactNumber) {
    if (conversationHistory[instanceName]) {
      delete conversationHistory[instanceName][contactNumber];
    }
  } else {
    delete conversationHistory[instanceName];
  }

  return {
    success: true,
    message: 'Histórico limpo'
  };
}

// Obter estatísticas
function getAutoResponderStats(instanceName) {
  const config = autoresponders[instanceName];

  if (!config) {
    throw new Error('Auto-resposta não configurada');
  }

  const today = new Date().toISOString().split('T')[0];
  let responsesToday = 0;

  if (dailyLimits[instanceName]) {
    Object.keys(dailyLimits[instanceName]).forEach(key => {
      if (key.includes(today)) {
        responsesToday += dailyLimits[instanceName][key];
      }
    });
  }

  return {
    enabled: config.enabled,
    responsesGiven: config.stats.responsesGiven,
    responsesToday,
    lastResponseAt: config.stats.lastResponseAt,
    activeConversations: conversationHistory[instanceName] ? Object.keys(conversationHistory[instanceName]).length : 0
  };
}

// Utilitários
function getRandomDelay(config) {
  const min = config.min || 2;
  const max = config.max || 5;
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Salvar configurações
function saveAutoResponders() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(AUTORESPONDER_FILE, JSON.stringify(autoresponders, null, 2));
  } catch (error) {
    console.error('[AutoResponder] Erro ao salvar:', error.message);
  }
}

// Carregar configurações
function loadAutoResponders() {
  try {
    if (fs.existsSync(AUTORESPONDER_FILE)) {
      const data = fs.readFileSync(AUTORESPONDER_FILE, 'utf8');
      autoresponders = JSON.parse(data);

      const active = Object.values(autoresponders).filter(a => a.enabled).length;
      console.log('[AutoResponder] Configurações carregadas:', {
        total: Object.keys(autoresponders).length,
        active
      });
    }
  } catch (error) {
    console.error('[AutoResponder] Erro ao carregar:', error.message);
    autoresponders = {};
  }
}

module.exports = {
  initAutoResponder,
  configureAutoResponder,
  enableAutoResponder,
  disableAutoResponder,
  getAutoResponderConfig,
  handleIncomingMessage,
  clearConversationHistory,
  getAutoResponderStats
};
