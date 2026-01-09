const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { v4: uuidv4 } = require('uuid');
const { incrementMetric, updateConnectionStatus, createInstanceMetrics, removeInstanceMetrics } = require('./metrics');
const { handleIncomingMessage } = require('./autoresponder');
const { sendWebhookWithRetry, isEventTypeEnabled } = require('./webhook-advanced');

// Armazenamento das instâncias
const instances = {};
const webhooks = {};
const instanceTokens = {};
const recentEvents = []; // Cache para debug de eventos recentes

function addRecentEvent(instanceName, event, data) {
  recentEvents.unshift({
    timestamp: new Date().toISOString(),
    instanceName,
    event,
    dataPreview: typeof data === 'object' ? { ...data, metadados: undefined, raw: undefined } : data
  });
  if (recentEvents.length > 100) recentEvents.pop();
}

// Socket.io instance reference
let io = null;

function configurarSocketIO(socketIO) {
  io = socketIO;
  console.log('[WhatsApp] Socket.io configurado');
}

const chatServico = require('../servicos/chat.servico');
const { query } = require('../config/database');

async function getEmpresaPadraoId() {
  try {
    // Buscar a empresa mais recente (fallback single-tenant)
    let res = await query('SELECT id FROM empresas WHERE status = \'ativo\' ORDER BY criado_em DESC LIMIT 1');
    if (res.rows.length === 0) {
      res = await query('SELECT id FROM empresas ORDER BY criado_em DESC LIMIT 1');
    }
    const id = res.rows[0]?.id;
    if (id) {
      console.log(`[Empresa] Resolvido ID: ${id}`);
    } else {
      console.warn('[Empresa] ⚠️ Nenhuma empresa encontrada no banco!');
    }
    return id;
  } catch (e) {
    console.error('[Empresa] ❌ Erro ao buscar:', e);
    return null;
  }
}

// Diretório para sessões
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = process.env.UPLOAD_DIR || './uploads';

// Garantir que os diretórios existem
[SESSIONS_DIR, DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logger principal (pode ser configurado via env)
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ==================== FUNÇÕES DE INSTÂNCIA ====================

async function createInstance(instanceNameRaw, options = {}) {
  const instanceName = instanceNameRaw ? instanceNameRaw.trim() : null;
  if (!instanceName) throw new Error('Nome da instância é obrigatório');

  console.log(`[${instanceName}] Criando instância...`);

  const sessionPath = path.join(SESSIONS_DIR, instanceName);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  let version = [2, 3000, 1017531287]; // Fallback para uma versão estável e recente (2.3xxx)
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
    console.log(`[${instanceName}] Baileys v${version.join('.')} detectada.`);
  } catch (err) {
    console.warn(`[${instanceName}] Falha ao buscar versão do Baileys, usando fallback:`, err.message);
  }

  // Configurar proxy se fornecido
  let agent = undefined;
  if (options.proxy) {
    const { host, port, username, password, protocol } = options.proxy;
    const proxyUrl = username && password
      ? `${protocol || 'http'}://${username}:${password}@${host}:${port}`
      : `${protocol || 'http'}://${host}:${port}`;

    if (protocol === 'socks5' || protocol === 'socks4') {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }
    console.log(`[${instanceName}] Usando proxy: ${host}:${port}`);
  }

  // Logger personalizado para debug
  const socketLogger = logger.child({ instance: instanceName });

  const socketConfig = {
    version,
    logger: socketLogger,
    auth: {
      creds: state.creds,
      keys: state.keys // Usar state.keys diretamente para evitar problemas de cache no pareamento inicial
    },
    printQRInTerminal: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: options.markOnline !== false,
    browser: ['Windows', 'Chrome', '125.0.0.0'], // Identificação extremamente comum e segura
    connectTimeoutMs: 120000,
    defaultQueryTimeoutMs: 120000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 2000,
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        message.templateMessage ||
        message.listMessage
      );
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              ...message
            }
          }
        };
      }
      return message;
    }
  };

  if (agent) {
    socketConfig.agent = agent;
  }

  console.log(`[${instanceName}] Inicializando socket do Baileys...`);
  const socket = makeWASocket(socketConfig);

  // Configurar Webhook se fornecido nas opções (comum no Lovable)
  if (options.webhookUrl || options.webhook) {
    const url = options.webhookUrl || options.webhook;
    console.log(`[${instanceName}] 🔗 Configurando webhook automático: ${url}`);
    setWebhook(instanceName, url, options.webhookEvents || ['all']);
  }

  // Gerar token único para a instância se não existir
  const instanceToken = options.token || uuidv4();

  // Inicializar objeto da instância
  const empresaId = options.empresaId || await getEmpresaPadraoId();

  instances[instanceName] = {
    socket,
    qrCode: null,
    qrCodeBase64: null,
    pairingCode: null,
    isConnected: false,
    user: null,
    proxy: options.proxy || null,
    token: instanceToken,
    empresaId, // Guardar em memória para acesso rápido
    webhookUrl: options.webhookUrl || options.webhook || null, // Guardar para persistência em restarts
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  // Salvar token em memória e arquivo
  instanceTokens[instanceName] = instanceToken;
  saveInstanceTokens();

  // Salvar no banco (SaaS / Multi-tenant) para persistência robusta
  try {
    await query(`
      INSERT INTO instances (instance_name, token, empresa_id, status, webhook_url, proxy_config)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (instance_name) DO UPDATE 
      SET token = EXCLUDED.token, 
          status = EXCLUDED.status, 
          webhook_url = COALESCE(EXCLUDED.webhook_url, instances.webhook_url),
          proxy_config = COALESCE(EXCLUDED.proxy_config, instances.proxy_config),
          updated_at = NOW()
    `, [instanceName, instanceToken, empresaId, 'connecting', options.webhookUrl || options.webhook, options.proxy ? JSON.stringify(options.proxy) : null]);
  } catch (err) {
    console.warn(`[${instanceName}] Falha ao persistir no banco (ignorado):`, err.message);
  }

  // Inicializar métricas (soft fail)
  try {
    createInstanceMetrics(instanceName);
  } catch (err) {
    console.warn(`[${instanceName}] Falha ao iniciar métricas (ignorado):`, err.message);
  }

  // Eventos de conexão
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Log detalhado de atualização
    // console.log(`[${instanceName}] Connection update:`, JSON.stringify(update, null, 2));

    if (qr) {
      console.log(`[${instanceName}] QR Code recebido do Baileys!`);
      instances[instanceName].qrCode = qr;
      instances[instanceName].status = 'qr'; // Estado explícito

      try {
        const qrBase64 = await QRCode.toDataURL(qr);
        instances[instanceName].qrCodeBase64 = qrBase64;
        console.log(`[${instanceName}] ✓ QR Code convertido para Base64 com sucesso. Pronto para exibição.`);
      } catch (err) {
        console.error(`[${instanceName}] ❌ Erro ao gerar QR base64:`, err);
      }

      addRecentEvent(instanceName, 'qrcode', { qr });

      sendWebhook(instanceName, {
        event: 'qrcode',
        qrcode: qr,
        qrcodeBase64: instances[instanceName].qrCodeBase64
      });

      // Persistir QR no banco
      query('UPDATE instances SET qr_code = $1, status = $2, updated_at = NOW() WHERE instance_name = $3',
        [qr, 'qr', instanceName]).catch(e => console.error('Erro ao salvar QR no banco:', e.message));
    }

    if (connection === 'connecting') {
      console.log(`[${instanceName}] 🔥 Iniciando negociação (handshake)...`);
      instances[instanceName].status = 'connecting';
    }

    if (connection === 'open') {
      console.log(`[${instanceName}] ✅ INSTÂNCIA CONECTADA E PRONTA!`);
      instances[instanceName].isConnected = true;
      instances[instanceName].status = 'connected';
      instances[instanceName].qrCode = null;
      instances[instanceName].qrCodeBase64 = null;
      instances[instanceName].pairingCode = null;
      instances[instanceName].user = socket.user;
      instances[instanceName].lastActivity = new Date().toISOString();

      addRecentEvent(instanceName, 'connection_open', { user: socket.user });

      // Forçar atualização do estado no banco imediatamente
      try {
        await query('UPDATE instances SET status = $1, phone_number = $2, qr_code = NULL, last_connected_at = NOW(), updated_at = NOW() WHERE instance_name = $3',
          ['connected', socket.user?.id?.split(':')[0], instanceName]);
      } catch (e) {
        console.error(`[${instanceName}] Erro ao salvar status conectado:`, e.message);
      }

      sendWebhook(instanceName, {
        event: 'connection',
        status: 'connected',
        user: socket.user
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const errorMsg = lastDisconnect?.error?.message || 'Conexão encerrada';

      console.error(`[${instanceName}] ❌ Falha na conexão. Código: ${statusCode}. Erro: ${errorMsg}`);

      instances[instanceName].isConnected = false;
      instances[instanceName].status = shouldReconnect ? 'reconnecting' : 'disconnected';

      // Limpar cache se for erro de autenticação (401)
      if (statusCode === 401 || statusCode === 403 || errorMsg.includes('authorized')) {
        console.warn(`[${instanceName}] 🧹 Autenticação falhou. Limpando sessão para recomeçar...`);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }

      if (shouldReconnect) {
        const delayMs = 5000;
        console.log(`[${instanceName}] 🔄 Tentando reconectar em ${delayMs}ms...`);
        setTimeout(() => createInstance(instanceName, options), delayMs);
      }
    }
  });

  // Salvar credenciais
  socket.ev.on('creds.update', saveCreds);

  // Receber mensagens
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (const message of messages) {
      if (!message.message) continue;

      let empresaId = instances[instanceName]?.empresaId;

      // Fallback: se não tiver empresa_id em memória, tenta recuperar agora
      if (!empresaId) {
        console.warn(`[${instanceName}] ⚠️ empresaId está nulo. Tentando recuperar...`);
        empresaId = await getEmpresaPadraoId();
        if (instances[instanceName]) instances[instanceName].empresaId = empresaId;
      }

      instances[instanceName].lastActivity = new Date().toISOString();

      const isFromMe = message.key.fromMe;
      const remoteJid = message.key.remoteJid;

      const realMessage = getMessageBody(message);
      const msgType = getMessageType(message);
      const msgText = extractText(message);

      // Processar Mídia se houver
      let midiaUrl = null;
      let midiaTipo = null;
      let midiaNomeArquivo = null;

      const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
      if (mediaTypes.includes(msgType)) {
        try {
          console.log(`[${instanceName}] Baixando mídia type: ${msgType}...`);
          const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger });

          const extension = {
            imageMessage: 'png',
            videoMessage: 'mp4',
            audioMessage: 'ogg',
            documentMessage: 'bin',
            stickerMessage: 'webp'
          }[msgType] || 'bin';

          const ptType = {
            imageMessage: 'imagem',
            videoMessage: 'video',
            audioMessage: 'audio',
            documentMessage: 'documento',
            stickerMessage: 'sticker'
          }[msgType] || 'texto';

          const fileName = `${instanceName}_${message.key.id}_${Date.now()}.${extension}`;
          const fullPath = path.join(UPLOADS_DIR, fileName);

          fs.writeFileSync(fullPath, buffer);
          midiaUrl = `/uploads/${fileName}`;
          midiaTipo = ptType; // 'imagem', 'video', etc
          midiaNomeArquivo = realMessage[msgType]?.fileName || fileName;

          console.log(`[${instanceName}] ✓ Mídia salva em: ${midiaUrl} Tipo: ${midiaTipo}`);
        } catch (err) {
          console.error(`[${instanceName}] ❌ Erro ao baixar mídia ou msg aninhada:`, err.message);
        }
      }

      const isGroup = remoteJid.endsWith('@g.us');
      let contatoNome = message.pushName || remoteJid.split('@')[0];

      // Se for grupo, tentar pegar o nome do grupo do cache
      if (isGroup) {
        try {
          const groupMeta = instances[instanceName].socket.groupMetadata ? await instances[instanceName].socket.groupMetadata(remoteJid).catch(() => null) : null;
          if (groupMeta?.subject) {
            contatoNome = groupMeta.subject;
          }
        } catch (e) {
          // Fallback silencioso
        }
      }

      // Preparar dados para o Chat (Garantir tipos em Português para o Repo)
      const dadosChat = {
        contatoTelefone: remoteJid.replace('@s.whatsapp.net', ''),
        contatoNome,
        whatsappMensagemId: message.key.id,
        tipoMensagem: midiaTipo || 'texto',
        conteudo: msgText || (midiaTipo ? `[Mídia: ${midiaTipo}]` : ''),
        midiaUrl,
        midiaTipo,
        midiaNomeArquivo,
        status: isFromMe ? 'enviada' : 'recebida',
        direcao: isFromMe ? 'enviada' : 'recebida',
        metadados: {
          raw: message,
          fromParticipant: isGroup ? message.key.participant : null,
          senderName: message.pushName
        }
      };

      // Persistir no Banco via ChatService
      if (empresaId) {
        try {
          await chatServico.receberMensagem(empresaId, instanceName, dadosChat);
        } catch (err) {
          console.error(`[${instanceName}] Erro ao persistir no chat:`, err.message);
        }
      }

      // Preparar Webhook Payload (Formato IDENTICO à Evolution API para Lovable)
      const messageData = {
        event: isFromMe ? 'messages.sent' : 'messages.upsert',
        instance: instanceName,
        owner: instanceName,
        data: {
          instanceId: instanceName,
          instance_id: instanceName,
          instance: instanceName,
          messages: [
            {
              key: {
                remoteJid,
                fromMe: isFromMe,
                id: message.key.id,
                participant: isGroup ? message.key.participant : undefined
              },
              message: message.message,
              pushName: message.pushName,
              messageTimestamp: message.messageTimestamp,
              sender: remoteJid.split('@')[0],
              fromMe: isFromMe,
              status: isFromMe ? 2 : 1 // Evolution API standard status
            }
          ],
          type: 'notify',
          source: 'ios',
          // Manter campos flat para compatibilidade
          ...dadosChat,
          fromMe: isFromMe,
          remoteJid
        }
      };

      // Disparar Webhook (Padrão Lowercase)
      sendWebhook(instanceName, messageData);

      // Fallback para Maiúsculas (Muito comum em sistemas legados ou Supabase templates)
      const upperEvent = (isFromMe ? 'messages.sent' : 'messages.upsert').toUpperCase().replace('.', '_');
      sendWebhook(instanceName, { ...messageData, event: upperEvent });

      // Se for enviado, forçar um 'upsert' também (muitos sistemas só ouvem esse)
      if (isFromMe) {
        sendWebhook(instanceName, { ...messageData, event: 'messages.upsert' });
        sendWebhook(instanceName, { ...messageData, event: 'MESSAGES_UPSERT' });
      }

      addRecentEvent(instanceName, isFromMe ? 'message_sent' : 'message_received', {
        id: message.key.id,
        text: msgText,
        from: remoteJid,
        isFromMe
      });

      // Agente IA (apenas para recebidas e se não for de grupo para não floodar)
      if (!isFromMe && !remoteJid.endsWith('@g.us')) {
        incrementMetric(instanceName, 'received');

        // Lógica de IA...
        if (empresaId && msgText) {
          try {
            const agenteIARepo = require('../repositorios/agente-ia.repositorio');
            const agenteIAServico = require('../servicos/agente-ia.servico');
            const agente = await agenteIARepo.buscarPorInstancia(instanceName, empresaId);

            if (agente && agente.ativo) {
              await socket.sendPresenceUpdate('composing', remoteJid);
              const result = await agenteIAServico.processarMensagem(agente.id, empresaId, msgText, {
                nomeContato: message.pushName || 'Cliente'
              });

              if (result?.resposta) {
                // Apenas envia, o evento 'upsert' cuidará da persistência e webhooks
                await socket.sendMessage(remoteJid, { text: result.resposta });
              }
            }
          } catch (e) { console.error('Erro IA:', e.message); }
        }
      }
    }
  });

  // Status de mensagem (entregue, lida, etc)
  socket.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      // Notificar Webhook
      sendWebhook(instanceName, {
        event: 'message.update',
        instanceName,
        data: update
      });

      // Se houver status novo, atualizar no chat interno
      if (update.update?.status && update.key?.id) {
        try {
          const statusMap = {
            2: 'enviada',   // Sended
            3: 'entregue',  // Delivered
            4: 'lida',      // Read
            5: 'lida'       // Played? (audio)
          };
          const novoStatus = statusMap[update.update.status];
          if (novoStatus && instances[instanceName].empresaId) {
            await chatServico.atualizarStatusMensagem(instances[instanceName].empresaId, update.key.id, novoStatus);
          }
        } catch (e) {
          console.error(`[${instanceName}] Erro ao atualizar status:`, e.message);
        }
      }
    }
  });

  // Recibos de leitura
  socket.ev.on('message-receipt.update', (updates) => {
    for (const update of updates) {
      sendWebhook(instanceName, {
        event: 'message.receipt',
        instanceName,
        data: update
      });
    }
  });

  // Presença (online/offline/digitando)
  socket.ev.on('presence.update', (update) => {
    sendWebhook(instanceName, {
      event: 'presence',
      instanceName,
      data: update
    });
  });

  // Atualizações de grupo
  socket.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      sendWebhook(instanceName, {
        event: 'group.update',
        instanceName,
        data: update
      });
    }
  });

  // Participantes de grupo
  socket.ev.on('group-participants.update', (update) => {
    sendWebhook(instanceName, {
      event: 'group.participants',
      instanceName,
      data: update
    });
  });

  // Chamadas
  socket.ev.on('call', async (calls) => {
    for (const call of calls) {
      sendWebhook(instanceName, {
        event: 'call',
        instanceName,
        data: call
      });

      // Rejeitar chamada automaticamente se configurado
      if (instances[instanceName].rejectCalls) {
        await socket.rejectCall(call.id, call.from);
        console.log(`[${instanceName}] Chamada rejeitada de ${call.from}`);
      }
    }
  });

  // Contatos atualizados
  socket.ev.on('contacts.update', (updates) => {
    sendWebhook(instanceName, {
      event: 'contacts.update',
      instanceName,
      data: updates
    });
  });

  return {
    success: true,
    instanceName,
    token: instanceToken,
    message: 'Instância criada. Aguarde o QR Code.'
  };
}

// Obter código de pareamento (alternativa ao QR)
async function getPairingCode(instanceName, phoneNumber) {
  const instance = instances[instanceName];
  if (!instance) {
    throw new Error('Instância não encontrada');
  }

  if (instance.isConnected) {
    throw new Error('Instância já está conectada');
  }

  try {
    const code = await instance.socket.requestPairingCode(phoneNumber);
    instance.pairingCode = code;
    return code;
  } catch (error) {
    throw new Error('Erro ao gerar código de pareamento: ' + error.message);
  }
}

function getInstance(instanceNameRaw) {
  if (!instanceNameRaw) return null;
  const instanceName = instanceNameRaw.trim();

  // Try exact match first
  if (instances[instanceName]) return instances[instanceName];

  // Fallback to case-insensitive search
  const nameLower = instanceName.toLowerCase();
  const foundName = Object.keys(instances).find(k => k.toLowerCase() === nameLower);

  return foundName ? instances[foundName] : null;
}

function getRecentEvents() {
  return recentEvents;
}

function getAllInstances() {
  const result = {};
  for (const [name, instance] of Object.entries(instances)) {
    result[name] = {
      isConnected: instance.isConnected,
      user: instance.user || null,
      hasQrCode: !!instance.qrCode,
      hasPairingCode: !!instance.pairingCode,
      proxy: instance.proxy ? `${instance.proxy.host}:${instance.proxy.port}` : null,
      webhookUrl: instance.webhookUrl || webhooks[name]?.url || null,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity
    };
  }
  return result;
}

async function deleteInstance(instanceName) {
  const instance = instances[instanceName];

  if (instance) {
    if (instance.socket) {
      try {
        await instance.socket.logout();
      } catch (e) { }
      instance.socket.end();
    }

    delete instances[instanceName];
    delete instanceTokens[instanceName];
    delete webhooks[instanceName];
    saveInstanceTokens();

    // Remover métricas da instância
    removeInstanceMetrics(instanceName);
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  return { success: true, message: 'Instância deletada' };
}

async function logoutInstance(instanceName) {
  const instance = instances[instanceName];
  if (!instance) {
    throw new Error('Instância não encontrada');
  }

  if (instance.socket) {
    await instance.socket.logout();
  }

  return { success: true, message: 'Logout realizado' };
}

async function restartInstance(instanceName) {
  const instance = instances[instanceName];
  if (!instance) {
    throw new Error('Instância não encontrada');
  }

  const options = {
    proxy: instance.proxy,
    token: instance.token,
    webhookUrl: instance.webhookUrl,
    empresaId: instance.empresaId
  };

  // Se estiver desconectado, vamos limpar a pasta por segurança para forçar novo QR
  if (!instance.isConnected) {
    console.log(`[${instanceName}] 🛠️ Auto-reparo agressivo: Limpando sessão para forçar novo QR.`);
    const sessionPath = path.join(SESSIONS_DIR, instanceName);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[${instanceName}] 📂 Pasta de sessão deletada com sucesso.`);
      } catch (err) {
        console.error(`[${instanceName}] ❌ Erro ao deletar pasta de sessão:`, err.message);
      }
    }
  }

  if (instance.socket) {
    try {
      instance.socket.end();
      console.log(`[${instanceName}] 🔌 Socket antigo encerrado.`);
    } catch (e) { }
  }

  // Limpar objeto em memória para garantir reinicialização limpa
  instances[instanceName].qrCode = null;
  instances[instanceName].qrCodeBase64 = null;
  instances[instanceName].status = 'connecting';

  await delay(1000);
  return createInstance(instanceName, options);
}

// ==================== FUNÇÕES DE MENSAGEM ====================

async function sendText(instanceName, to, text, options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);

  // Simular digitação se configurado
  if (options.simulateTyping) {
    await instance.socket.sendPresenceUpdate('composing', jid);
    await delay(options.typingTime || 2000);
    await instance.socket.sendPresenceUpdate('paused', jid);
  }

  // Delay antes de enviar
  if (options.delay) {
    await delay(options.delay);
  }

  const messageOptions = { text };

  // Responder mensagem específica
  if (options.quotedMessageId) {
    messageOptions.quoted = {
      key: {
        remoteJid: jid,
        id: options.quotedMessageId
      }
    };
  }

  // Mencionar usuários
  if (options.mentions && options.mentions.length > 0) {
    messageOptions.mentions = options.mentions.map(m => formatJid(m));
  }

  const result = await instance.socket.sendMessage(jid, messageOptions);
  instance.lastActivity = new Date().toISOString();

  // Incrementar métrica de mensagem enviada
  incrementMetric(instanceName, 'sent', 1, 'text');

  return { success: true, messageId: result.key.id, key: result.key };
}

async function sendImage(instanceName, to, imageUrl, caption = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);

  if (options.delay) await delay(options.delay);

  const messageOptions = {
    image: { url: imageUrl },
    caption
  };

  if (options.quotedMessageId) {
    messageOptions.quoted = { key: { remoteJid: jid, id: options.quotedMessageId } };
  }

  if (options.mentions) {
    messageOptions.mentions = options.mentions.map(m => formatJid(m));
  }

  const result = await instance.socket.sendMessage(jid, messageOptions);
  instance.lastActivity = new Date().toISOString();

  // Incrementar métrica
  incrementMetric(instanceName, 'sent', 1, 'image');

  return { success: true, messageId: result.key.id };
}

async function sendDocument(instanceName, to, documentUrl, fileName, mimetype, caption = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const result = await instance.socket.sendMessage(jid, {
    document: { url: documentUrl },
    fileName: fileName || 'documento',
    mimetype: mimetype || 'application/octet-stream',
    caption
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'document');
  return { success: true, messageId: result.key.id };
}

async function sendAudio(instanceName, to, audioUrl, ptt = true, options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  // Simular gravando áudio
  if (options.simulateRecording) {
    await instance.socket.sendPresenceUpdate('recording', jid);
    await delay(options.recordingTime || 3000);
    await instance.socket.sendPresenceUpdate('paused', jid);
  }

  const result = await instance.socket.sendMessage(jid, {
    audio: { url: audioUrl },
    ptt
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'audio');
  return { success: true, messageId: result.key.id };
}

async function sendVideo(instanceName, to, videoUrl, caption = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const result = await instance.socket.sendMessage(jid, {
    video: { url: videoUrl },
    caption,
    gifPlayback: options.gif || false
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'video');
  return { success: true, messageId: result.key.id };
}

async function sendSticker(instanceName, to, stickerUrl, options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const result = await instance.socket.sendMessage(jid, {
    sticker: { url: stickerUrl }
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'sticker');
  return { success: true, messageId: result.key.id };
}

async function sendLocation(instanceName, to, latitude, longitude, name = '', address = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const result = await instance.socket.sendMessage(jid, {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      name,
      address
    }
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'location');
  return { success: true, messageId: result.key.id };
}

async function sendContact(instanceName, to, contactName, contactNumber, options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL;type=CELL;type=VOICE;waid=${contactNumber}:+${contactNumber}\nEND:VCARD`;

  const result = await instance.socket.sendMessage(jid, {
    contacts: {
      displayName: contactName,
      contacts: [{ vcard }]
    }
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'contact');
  return { success: true, messageId: result.key.id };
}

async function sendButtons(instanceName, to, text, buttons, footer = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const buttonMessage = {
    text,
    footer,
    buttons: buttons.map((btn, i) => ({
      buttonId: btn.id || `btn_${i}`,
      buttonText: { displayText: btn.text },
      type: 1
    })),
    headerType: 1
  };

  const result = await instance.socket.sendMessage(jid, buttonMessage);
  instance.lastActivity = new Date().toISOString();
  return { success: true, messageId: result.key.id };
}

async function sendList(instanceName, to, title, description, buttonText, sections, footer = '', options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const listMessage = {
    text: description,
    footer,
    title,
    buttonText,
    sections
  };

  const result = await instance.socket.sendMessage(jid, listMessage);
  instance.lastActivity = new Date().toISOString();
  return { success: true, messageId: result.key.id };
}

async function sendPoll(instanceName, to, name, values, selectableCount = 1, options = {}) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);
  if (options.delay) await delay(options.delay);

  const result = await instance.socket.sendMessage(jid, {
    poll: {
      name,
      values,
      selectableCount
    }
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'poll');
  return { success: true, messageId: result.key.id };
}

async function sendReaction(instanceName, to, messageId, emoji) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);

  const result = await instance.socket.sendMessage(jid, {
    react: {
      text: emoji,
      key: {
        remoteJid: jid,
        id: messageId
      }
    }
  });

  instance.lastActivity = new Date().toISOString();
  incrementMetric(instanceName, 'sent', 1, 'reaction');
  return { success: true };
}

async function forwardMessage(instanceName, to, messageToForward) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(to);

  const result = await instance.socket.sendMessage(jid, { forward: messageToForward });
  instance.lastActivity = new Date().toISOString();
  return { success: true, messageId: result.key.id };
}

async function deleteMessage(instanceName, remoteJid, messageId, forEveryone = true) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);

  const key = {
    remoteJid: jid,
    id: messageId,
    fromMe: true
  };

  if (forEveryone) {
    await instance.socket.sendMessage(jid, { delete: key });
  } else {
    await instance.socket.chatModify({ clear: { messages: [{ id: messageId, fromMe: true }] } }, jid);
  }

  return { success: true };
}

async function markAsRead(instanceName, remoteJid, messageIds) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);

  const keys = messageIds.map(id => ({
    remoteJid: jid,
    id
  }));

  await instance.socket.readMessages(keys);
  return { success: true };
}

// ==================== FUNÇÕES DE PRESENÇA ====================

async function updatePresence(instanceName, remoteJid, presence) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  // presence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'
  await instance.socket.sendPresenceUpdate(presence, jid);
  return { success: true };
}

async function setProfileStatus(instanceName, status) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.updateProfileStatus(status);
  return { success: true };
}

async function setProfileName(instanceName, name) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.updateProfileName(name);
  return { success: true };
}

async function setProfilePicture(instanceName, imageUrl) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.updateProfilePicture(instance.user.id, { url: imageUrl });
  return { success: true };
}

// ==================== FUNÇÕES DE GRUPO ====================

async function createGroup(instanceName, groupName, participants) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jids = participants.map(p => formatJid(p));
  const result = await instance.socket.groupCreate(groupName, jids);

  return { success: true, groupId: result.id, groupName: result.subject };
}

async function getGroups(instanceName) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const groups = await instance.socket.groupFetchAllParticipating();
  return Object.values(groups).map(g => ({
    id: g.id,
    name: g.subject,
    owner: g.owner,
    creation: g.creation,
    participantsCount: g.participants?.length || 0,
    desc: g.desc,
    restrict: g.restrict,
    announce: g.announce
  }));
}

async function getGroupInfo(instanceName, groupId) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const metadata = await instance.socket.groupMetadata(groupId);
  return metadata;
}

async function getGroupInviteCode(instanceName, groupId) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const code = await instance.socket.groupInviteCode(groupId);
  return { code, link: `https://chat.whatsapp.com/${code}` };
}

async function revokeGroupInvite(instanceName, groupId) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const newCode = await instance.socket.groupRevokeInvite(groupId);
  return { code: newCode, link: `https://chat.whatsapp.com/${newCode}` };
}

async function joinGroupByCode(instanceName, inviteCode) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  // Remove o prefixo do link se houver
  const code = inviteCode.replace('https://chat.whatsapp.com/', '');
  const groupId = await instance.socket.groupAcceptInvite(code);
  return { success: true, groupId };
}

async function leaveGroup(instanceName, groupId) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.groupLeave(groupId);
  return { success: true };
}

async function updateGroupParticipants(instanceName, groupId, participants, action) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jids = participants.map(p => formatJid(p));
  // action: 'add' | 'remove' | 'promote' | 'demote'
  const result = await instance.socket.groupParticipantsUpdate(groupId, jids, action);
  return { success: true, result };
}

async function updateGroupSettings(instanceName, groupId, setting, value) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  // setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
  await instance.socket.groupSettingUpdate(groupId, setting);
  return { success: true };
}

async function updateGroupSubject(instanceName, groupId, subject) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.groupUpdateSubject(groupId, subject);
  return { success: true };
}

async function updateGroupDescription(instanceName, groupId, description) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.groupUpdateDescription(groupId, description);
  return { success: true };
}

async function updateGroupPicture(instanceName, groupId, imageUrl) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  await instance.socket.updateProfilePicture(groupId, { url: imageUrl });
  return { success: true };
}

// ==================== FUNÇÕES DE CHAT ====================

async function getChats(instanceName) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const chats = await instance.socket.groupFetchAllParticipating();
  // Nota: Baileys não tem método direto para listar todos os chats
  // Retornamos os grupos como exemplo
  return Object.keys(chats).map(id => ({
    id,
    isGroup: true,
    name: chats[id].subject
  }));
}

async function getContacts(instanceName) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  // Baileys não tem método direto para listar contatos
  // Isso seria preenchido por eventos de contacts.update
  return [];
}

async function archiveChat(instanceName, remoteJid, archive = true) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  await instance.socket.chatModify({ archive }, jid);
  return { success: true };
}

async function pinChat(instanceName, remoteJid, pin = true) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  await instance.socket.chatModify({ pin }, jid);
  return { success: true };
}

async function muteChat(instanceName, remoteJid, duration) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  // duration em segundos, null para desmutar
  await instance.socket.chatModify({ mute: duration ? Date.now() + duration * 1000 : null }, jid);
  return { success: true };
}

async function blockContact(instanceName, remoteJid) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  await instance.socket.updateBlockStatus(jid, 'block');
  return { success: true };
}

async function unblockContact(instanceName, remoteJid) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  await instance.socket.updateBlockStatus(jid, 'unblock');
  return { success: true };
}

// ==================== FUNÇÕES UTILITÁRIAS ====================

async function checkNumberExists(instanceName, number) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(number);
  const [result] = await instance.socket.onWhatsApp(jid.replace('@s.whatsapp.net', ''));

  return {
    exists: !!result?.exists,
    jid: result?.jid || null
  };
}

async function getProfilePicture(instanceName, remoteJid) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);

  try {
    const url = await instance.socket.profilePictureUrl(jid, 'image');
    return { url };
  } catch {
    return { url: null };
  }
}

async function getBusinessProfile(instanceName, remoteJid) {
  const instance = getInstance(instanceName);
  if (!instance || !instance.isConnected) {
    throw new Error('Instância não encontrada ou não conectada');
  }

  const jid = formatJid(remoteJid);
  const profile = await instance.socket.getBusinessProfile(jid);
  return profile;
}

// ==================== WEBHOOKS ====================

function setWebhook(instanceName, webhookUrl, events = []) {
  const eventsList = events.length > 0 ? events : ['all'];
  webhooks[instanceName] = {
    url: webhookUrl,
    events: eventsList,
    createdAt: new Date().toISOString()
  };

  // Atualizar também no objeto da instância em memória se existir
  const instance = instances[instanceName];
  if (instance) {
    instance.webhookUrl = webhookUrl;
  }

  // Persistir no arquivo JSON legado
  saveWebhooks();

  // Persistir no Banco de Dados (SaaS)
  query('UPDATE instances SET webhook_url = $1, webhook_events = $2, updated_at = NOW() WHERE instance_name = $3',
    [webhookUrl, JSON.stringify(eventsList), instanceName])
    .catch(e => console.error(`[Webhook] Erro ao persistir no banco para ${instanceName}:`, e.message));

  return { success: true };
}

function getWebhook(instanceName) {
  return webhooks[instanceName] || null;
}

function deleteWebhook(instanceName) {
  delete webhooks[instanceName];
  saveWebhooks();
  return { success: true };
}

async function sendWebhook(instanceName, data) {
  const webhook = webhooks[instanceName];
  if (!webhook || !webhook.url) return;

  // Verificar se o evento está na lista de eventos permitidos (compatibilidade)
  if (webhook.events[0] !== 'all' && !webhook.events.includes(data.event)) {
    return;
  }

  // Verificar se o tipo de evento está habilitado no webhook avançado
  const isAdvancedEnabled = isEventTypeEnabled(instanceName, data.event);

  const payload = {
    ...data,
    instance: instanceName,
    instanceName,
    apikey: instanceTokens[instanceName], // Incluir na payload pra garantir
    timestamp: new Date().toISOString()
  };

  const headers = {
    'Content-Type': 'application/json',
    'apikey': instanceTokens[instanceName],
    'X-API-Key': instanceTokens[instanceName],
    'Authorization': `Bearer ${instanceTokens[instanceName]}`, // Alguns edge functions usam Bearer
    'User-Agent': 'WhatsBenemax/2.1'
  };

  console.log(`[Webhook] Enviando evento '${data.event}' para: ${webhook.url}`);

  // Se webhook avançado está configurado, usar retry automático
  if (isAdvancedEnabled) {
    // Enviar com retry e logging automático
    sendWebhookWithRetry(instanceName, webhook.url, payload).catch(err => {
      console.error(`[${instanceName}] Erro no webhook avançado:`, err.message);
    });
  } else {
    // Método básico usando axios
    const axios = require('axios');
    axios.post(webhook.url, payload, { headers, timeout: 15000 })
      .then(res => {
        console.log(`[Webhook] ✓ Sucesso (${instanceName}): ${res.status}`);
        addRecentEvent(instanceName, 'webhook_success', { url: webhook.url, status: res.status });
      })
      .catch(err => {
        const status = err.response ? err.response.status : 'N/A';
        const errorData = err.response ? JSON.stringify(err.response.data) : '';
        console.error(`[Webhook] ❌ Falha (${instanceName}): ${status} - ${err.message} ${errorData}`);
        addRecentEvent(instanceName, 'webhook_error', { url: webhook.url, error: err.message, status, response: errorData });
      });
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatJid(number) {
  let cleaned = String(number).replace(/\D/g, '');

  if (cleaned.includes('@')) {
    return cleaned;
  }

  if (cleaned.endsWith('@g.us') || cleaned.endsWith('@s.whatsapp.net')) {
    return cleaned;
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extrai o corpo real da mensagem, lidando com aninhamento (view-once, ephemeral, etc)
 */
function getMessageBody(message) {
  if (!message || !message.message) return null;

  let msg = message.message;

  // Desembrulhar tipos comuns de containers
  while (msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.ephemeralMessage || msg.documentWithCaptionMessage || msg.editMessage) {
    msg = msg.viewOnceMessage?.message ||
      msg.viewOnceMessageV2?.message ||
      msg.ephemeralMessage?.message ||
      msg.documentWithCaptionMessage?.message ||
      msg.editMessage?.message ||
      msg;
  }

  return msg;
}

function getMessageType(message) {
  const msg = getMessageBody(message);
  if (!msg) return 'unknown';
  const types = Object.keys(msg);
  return types[0] || 'unknown';
}

function extractText(message) {
  const msg = getMessageBody(message);
  if (!msg) return null;

  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;
  if (msg.templateButtonReplyMessage?.selectedId) return msg.templateButtonReplyMessage.selectedId;
  if (msg.interactiveResponseMessage?.body?.text) return msg.interactiveResponseMessage.body.text;

  // Polls
  if (msg.pollCreationMessage?.name) return `[Votação: ${msg.pollCreationMessage.name}]`;

  // Fallback para qualquer campo que contenha texto
  return msg.text || msg.caption || null;
}

function saveWebhooks() {
  const filePath = path.join(DATA_DIR, 'webhooks.json');
  fs.writeFileSync(filePath, JSON.stringify(webhooks, null, 2));
}

function loadWebhooks() {
  const filePath = path.join(DATA_DIR, 'webhooks.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      Object.assign(webhooks, data);
    } catch (e) {
      console.error('Erro ao carregar webhooks:', e);
    }
  }
}

function saveInstanceTokens() {
  const filePath = path.join(DATA_DIR, 'tokens.json');
  fs.writeFileSync(filePath, JSON.stringify(instanceTokens, null, 2));
}

function loadInstanceTokens() {
  const filePath = path.join(DATA_DIR, 'tokens.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      Object.assign(instanceTokens, data);
    } catch (e) {
      console.error('Erro ao carregar tokens:', e);
    }
  }
}

async function loadExistingSessions() {
  loadWebhooks();
  loadInstanceTokens();

  if (!fs.existsSync(SESSIONS_DIR)) return;

  const sessions = fs.readdirSync(SESSIONS_DIR);

  for (const sessionName of sessions) {
    const sessionPath = path.join(SESSIONS_DIR, sessionName);
    if (fs.statSync(sessionPath).isDirectory()) {
      console.log(`[Startup] Carregando sessão existente: ${sessionName}`);
      try {
        // Tentar carregar configurações do banco para esta instância
        const res = await query('SELECT * FROM instances WHERE instance_name = $1', [sessionName]);
        const dbConfig = res.rows[0];

        const options = {
          token: dbConfig?.token || instanceTokens[sessionName],
          webhookUrl: dbConfig?.webhook_url,
          empresaId: dbConfig?.empresa_id
        };

        await createInstance(sessionName, options);
      } catch (error) {
        console.error(`[Startup] Erro ao carregar sessão ${sessionName}:`, error.message);
      }
    }
  }
}

// Configurar rejeição automática de chamadas
function setRejectCalls(instanceName, reject = true) {
  const instance = getInstance(instanceName);
  if (instance) {
    instance.rejectCalls = reject;
    return { success: true };
  }
  throw new Error('Instância não encontrada');
}

module.exports = {
  instances,
  instanceTokens,
  webhooks,
  createInstance,
  getPairingCode,
  getInstance,
  getAllInstances,
  getRecentEvents,
  deleteInstance,
  restartInstance,
  logoutInstance,
  sendText,
  sendImage,
  sendAudio,
  sendVideo,
  sendDocument,
  sendSticker,
  sendLocation,
  sendContact,
  sendPoll,
  sendButtons,
  sendList,
  sendReaction,
  forwardMessage,
  deleteMessage,
  markAsRead,
  updatePresence,
  setProfileStatus,
  setProfileName,
  setProfilePicture,

  // Grupos
  createGroup,
  getGroups,
  getGroupInfo,
  getGroupInviteCode,
  revokeGroupInvite,
  joinGroupByCode,
  leaveGroup,
  updateGroupParticipants,
  updateGroupSettings,
  updateGroupSubject,
  updateGroupDescription,
  updateGroupPicture,

  // Chat
  getChats,
  getContacts,
  archiveChat,
  pinChat,
  muteChat,
  blockContact,
  unblockContact,

  // Utilitários
  checkNumberExists,
  getProfilePicture,
  getBusinessProfile,
  formatJid,

  // Webhooks
  setWebhook,
  getWebhook,
  deleteWebhook,
  sendWebhook,
  setRejectCalls,
  loadExistingSessions,
  configurarSocketIO
};
