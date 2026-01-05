const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');
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

const chatServico = require('../servicos/chat.servico');
const { query } = require('../config/database');

async function getEmpresaPadraoId() {
  try {
    // Cache simples em memória poderia ser usado aqui
    const res = await query('SELECT id FROM empresas ORDER BY criado_em ASC LIMIT 1');
    return res.rows[0]?.id;
  } catch (e) {
    console.error('Erro ao buscar empresa padrao:', e);
    return null;
  }
}

// Diretório para sessões
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const DATA_DIR = process.env.DATA_DIR || './data';

// Garantir que os diretórios existem
[SESSIONS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logger silencioso
const logger = pino({ level: 'silent' });

// ==================== FUNÇÕES DE INSTÂNCIA ====================

async function createInstance(instanceName, options = {}) {
  console.log(`[${instanceName}] Criando instância...`);

  const sessionPath = path.join(SESSIONS_DIR, instanceName);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

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
    printQRInTerminal: true, // Habilitar para ver logs no container
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: options.markOnline !== false,
    browser: options.browser || ['WhatsApp API', 'Chrome', '10.0.0'], // Browser mais genérico
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 250
  };

  if (agent) {
    socketConfig.agent = agent;
  }

  console.log(`[${instanceName}] Inicializando socket do Baileys...`);
  const socket = makeWASocket(socketConfig);

  // Gerar token único para a instância se não existir
  const instanceToken = options.token || uuidv4();

  // Inicializar objeto da instância
  instances[instanceName] = {
    socket,
    qrCode: null,
    qrCodeBase64: null,
    pairingCode: null,
    isConnected: false,
    user: null,
    proxy: options.proxy || null,
    token: instanceToken,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  // Salvar token
  instanceTokens[instanceName] = instanceToken;
  saveInstanceTokens();

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
        console.log(`[${instanceName}] QR Code convertido para Base64 com sucesso.`);
      } catch (err) {
        console.error(`[${instanceName}] Erro ao gerar QR base64:`, err);
      }

      sendWebhook(instanceName, {
        event: 'qrcode',
        qrcode: qr,
        qrcodeBase64: instances[instanceName].qrCodeBase64
      });
    }

    if (connection === 'connecting') {
      console.log(`[${instanceName}] Conectando...`);
      instances[instanceName].status = 'connecting';
    }

    if (connection === 'open') {
      console.log(`[${instanceName}] ✓ CONEXÃO ESTABELECIDA!`);
      instances[instanceName].isConnected = true;
      instances[instanceName].status = 'connected';
      instances[instanceName].qrCode = null;
      instances[instanceName].qrCodeBase64 = null;
      instances[instanceName].pairingCode = null;
      instances[instanceName].user = socket.user;
      instances[instanceName].lastActivity = new Date().toISOString();

      // Atualizar métricas de conexão
      updateConnectionStatus(instanceName, 'connected');

      sendWebhook(instanceName, {
        event: 'connection',
        status: 'connected',
        user: socket.user
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const errorMsg = lastDisconnect?.error?.message || 'Erro desconhecido';

      console.error(`[${instanceName}] ❌ Conexão fechada. Status: ${statusCode}. Erro: ${errorMsg}. Reconectar: ${shouldReconnect}`);

      instances[instanceName].isConnected = false;
      instances[instanceName].status = 'disconnected';

      // Atualizar métricas de conexão
      updateConnectionStatus(instanceName, 'disconnected');

      sendWebhook(instanceName, {
        event: 'connection',
        status: 'disconnected',
        statusCode,
        willReconnect: shouldReconnect
      });

      if (shouldReconnect) {
        const reconnectDelay = 5000;
        console.log(`[${instanceName}] Agendando reconexão em ${reconnectDelay}ms...`);
        setTimeout(() => {
          console.log(`[${instanceName}] Tentando reconectar agora...`);
          createInstance(instanceName, options);
        }, reconnectDelay);
      } else {
        console.warn(`[${instanceName}] Desconectado permanentemente (Logout). Limpando sessão.`);
        sendWebhook(instanceName, {
          event: 'connection',
          status: 'logged_out'
        });
        // Opcional: Auto-delete session?
        // deleteInstance(instanceName); 
      }
    }
  });

  // Salvar credenciais
  socket.ev.on('creds.update', saveCreds);

  // Receber mensagens
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    const empresaId = await getEmpresaPadraoId();

    for (const message of messages) {
      instances[instanceName].lastActivity = new Date().toISOString();

      // Processar persistência no Chat
      if (empresaId) {
        try {
          const isFromMe = message.key.fromMe;
          const remoteJid = message.key.remoteJid;
          const msgText = extractText(message);
          const msgType = getMessageType(message);

          // Preparar dados
          const dados = {
            contatoTelefone: remoteJid.replace('@s.whatsapp.net', ''),
            contatoNome: message.pushName || remoteJid.split('@')[0],
            whatsappMensagemId: message.key.id,
            tipoMensagem: msgType || 'text',
            conteudo: msgText || '',
            midiaUrl: null, // TODO: Processar download de mídia
            status: isFromMe ? 'enviada' : 'recebida',
            direcao: isFromMe ? 'enviada' : 'recebida',
            metadados: { raw: message }
          };

          // Usar o serviço de chat para persistir
          // Nota: chatServico.receberMensagem força 'recebida'. 
          // Precisamos de um método mais genérico ou chamar repositorios direto.
          // Por simplicidade, vou chamar receberMensagem e ajustar ele depois ou criar um wrapper aqui.
          // Para 'enviada', vamos ter que adaptar o chatServico ou chamar direto o repo se o serviço for rígido.

          // Vamos usar uma lógica customizada aqui que chama o receberMensagem mas passamos "direcao" se o serviço suportar, 
          // Ou melhor: Vamos injetar direto no banco se o serviço for limitado,
          // MAS o ideal é usar o serviço. Vou assumir que o usuário quer ver as recebidas principalmente.

          if (!isFromMe) {
            await chatServico.receberMensagem(empresaId, instanceName, dados);
          } else {
            // Para enviadas via celular, também queremos salvar
            // Passamos direcao: 'enviada' para o serviço registrar corretamente
            await chatServico.receberMensagem(empresaId, instanceName, { ...dados, direcao: 'enviada' });
          }

        } catch (err) {
          console.error(`[${instanceName}] Erro ao persistir mensagem chat:`, err.message);
        }
      }

      const messageData = {
        event: 'message',
        instanceName,
        data: {
          key: message.key,
          from: message.key.remoteJid,
          fromMe: message.key.fromMe,
          pushName: message.pushName,
          message: message.message,
          messageType: getMessageType(message),
          text: extractText(message),
          timestamp: message.messageTimestamp,
          isGroup: message.key.remoteJid?.endsWith('@g.us'),
          participant: message.key.participant
        }
      };

      if (!message.key.fromMe) {
        console.log(`[${instanceName}] Nova mensagem de ${message.key.remoteJid}`);

        // Incrementar contador de mensagens recebidas
        incrementMetric(instanceName, 'received');

        const text = extractText(message);

        // 1. Tentar Agente IA (SaaS)
        let processedByAI = false;
        if (empresaId && text) {
          try {
            // Import lazy para evitar circular dependencies se houver
            const agenteIAServico = require('../servicos/agente-ia.servico');
            const agenteIARepo = require('../repositorios/agente-ia.repositorio');

            const agente = await agenteIARepo.buscarPorInstancia(instanceName, empresaId);

            if (agente && agente.ativo) {
              console.log(`[${instanceName}] Agente IA ativo encontrado: ${agente.nome}`);

              // Simular digitando
              await socket.sendPresenceUpdate('composing', message.key.remoteJid);

              // Processar mensagem
              const resultadoIA = await agenteIAServico.processarMensagem(agente.id, empresaId, text, {
                nomeContato: message.pushName || 'Cliente',
                // TODO: Injetar histórico de mensagens aqui para contexto
              });

              if (resultadoIA && resultadoIA.resposta) {
                // Enviar resposta
                const sentMsg = await socket.sendMessage(message.key.remoteJid, { text: resultadoIA.resposta });

                // Persistir resposta da IA
                await chatServico.receberMensagem(empresaId, instanceName, {
                  contatoTelefone: message.key.remoteJid.replace('@s.whatsapp.net', ''),
                  contatoNome: message.pushName,
                  whatsappMensagemId: sentMsg.key.id,
                  tipoMensagem: 'texto',
                  conteudo: resultadoIA.resposta,
                  direcao: 'enviada',
                  status: 'enviada',
                  metadados: {
                    agenteId: agente.id,
                    modelo: resultadoIA.modelo,
                    tokens: resultadoIA.tokens_usados
                  }
                });

                processedByAI = true;
              }

              await socket.sendPresenceUpdate('paused', message.key.remoteJid);
            }
          } catch (aiErr) {
            console.error(`[${instanceName}] Erro ao processar Agente IA:`, aiErr.message);
          }
        }

        // 2. Auto-responder Legado (JSON) - Fallback
        if (!processedByAI && text) {
          handleIncomingMessage(instanceName, message.key.remoteJid, text).catch(err => {
            console.error(`[${instanceName}] Erro no auto-responder legado:`, err.message);
          });
        }
      }

      sendWebhook(instanceName, messageData);
    }
  });

  // Status de mensagem
  socket.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      sendWebhook(instanceName, {
        event: 'message.update',
        instanceName,
        data: update
      });
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

function getInstance(instanceName) {
  return instances[instanceName] || null;
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
    token: instance.token
  };

  if (instance.socket) {
    instance.socket.end();
  }

  await delay(2000);
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
  webhooks[instanceName] = {
    url: webhookUrl,
    events: events.length > 0 ? events : ['all'],
    createdAt: new Date().toISOString()
  };
  saveWebhooks();
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
    timestamp: new Date().toISOString()
  };

  // Se webhook avançado está configurado, usar retry automático
  if (isAdvancedEnabled) {
    // Enviar com retry e logging automático
    sendWebhookWithRetry(instanceName, webhook.url, payload).catch(err => {
      console.error(`[${instanceName}] Erro no webhook avançado:`, err.message);
    });
  } else {
    // Método básico (sem retry)
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[${instanceName}] Webhook falhou: ${response.status}`);
      }
    } catch (error) {
      console.error(`[${instanceName}] Erro no webhook:`, error.message);
    }
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

function getMessageType(message) {
  if (!message.message) return 'unknown';
  const types = Object.keys(message.message);
  return types[0] || 'unknown';
}

function extractText(message) {
  if (!message.message) return null;

  const msg = message.message;

  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId;

  return null;
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
      console.log(`Carregando sessão existente: ${sessionName}`);
      try {
        await createInstance(sessionName, { token: instanceTokens[sessionName] });
      } catch (error) {
        console.error(`Erro ao carregar sessão ${sessionName}:`, error);
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
  // Instância
  createInstance,
  getInstance,
  getAllInstances,
  deleteInstance,
  logoutInstance,
  restartInstance,
  getPairingCode,
  loadExistingSessions,
  setRejectCalls,
  instanceTokens,

  // Mensagens
  sendText,
  sendImage,
  sendDocument,
  sendAudio,
  sendVideo,
  sendSticker,
  sendLocation,
  sendContact,
  sendButtons,
  sendList,
  sendPoll,
  sendReaction,
  forwardMessage,
  deleteMessage,
  markAsRead,

  // Presença
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
  sendWebhook
};
