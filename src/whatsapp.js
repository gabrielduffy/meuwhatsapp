const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Armazenamento das instâncias
const instances = {};

// Diretório para sessões
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';

// Garantir que o diretório existe
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Logger silencioso
const logger = pino({ level: 'silent' });

async function createInstance(instanceName) {
  console.log(`[${instanceName}] Criando instância...`);

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  
  // Criar diretório da sessão se não existir
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: true
  });

  // Inicializar objeto da instância
  instances[instanceName] = {
    socket,
    qrCode: null,
    qrCodeBase64: null,
    isConnected: false,
    user: null
  };

  // Eventos de conexão
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR Code gerado
    if (qr) {
      console.log(`[${instanceName}] QR Code gerado`);
      instances[instanceName].qrCode = qr;
      
      // Gerar QR Code em base64 para exibição em navegador
      try {
        const qrBase64 = await QRCode.toDataURL(qr);
        instances[instanceName].qrCodeBase64 = qrBase64;
      } catch (err) {
        console.error(`[${instanceName}] Erro ao gerar QR base64:`, err);
      }
    }

    // Conexão estabelecida
    if (connection === 'open') {
      console.log(`[${instanceName}] ✓ Conectado!`);
      instances[instanceName].isConnected = true;
      instances[instanceName].qrCode = null;
      instances[instanceName].qrCodeBase64 = null;
      instances[instanceName].user = socket.user;

      // Disparar webhook se configurado
      sendWebhook(instanceName, {
        event: 'connection',
        status: 'connected',
        user: socket.user
      });
    }

    // Conexão fechada
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[${instanceName}] Conexão fechada. Reconectar: ${shouldReconnect}`);

      instances[instanceName].isConnected = false;

      if (shouldReconnect) {
        // Reconectar automaticamente
        setTimeout(() => {
          console.log(`[${instanceName}] Tentando reconectar...`);
          createInstance(instanceName);
        }, 5000);
      } else {
        // Logout - limpar sessão
        console.log(`[${instanceName}] Logout detectado, limpando sessão...`);
        sendWebhook(instanceName, {
          event: 'connection',
          status: 'logged_out'
        });
      }
    }
  });

  // Salvar credenciais quando atualizadas
  socket.ev.on('creds.update', saveCreds);

  // Receber mensagens
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      // Ignorar mensagens enviadas por nós mesmos
      if (message.key.fromMe) continue;

      const messageData = {
        event: 'message',
        instanceName,
        data: {
          key: message.key,
          from: message.key.remoteJid,
          pushName: message.pushName,
          message: message.message,
          messageType: getMessageType(message),
          text: extractText(message),
          timestamp: message.messageTimestamp
        }
      };

      console.log(`[${instanceName}] Nova mensagem de ${message.key.remoteJid}`);
      sendWebhook(instanceName, messageData);
    }
  });

  // Status de mensagem (enviada, entregue, lida)
  socket.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      sendWebhook(instanceName, {
        event: 'message.update',
        instanceName,
        data: update
      });
    }
  });

  return {
    success: true,
    instanceName,
    message: 'Instância criada. Aguarde o QR Code.'
  };
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
      hasQrCode: !!instance.qrCode
    };
  }
  return result;
}

async function deleteInstance(instanceName) {
  const instance = instances[instanceName];
  
  if (instance) {
    // Desconectar
    if (instance.socket) {
      try {
        await instance.socket.logout();
      } catch (e) {
        // Ignorar erro se já desconectado
      }
      instance.socket.end();
    }
    
    delete instances[instanceName];
  }

  // Remover arquivos de sessão
  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  return { success: true, message: 'Instância deletada' };
}

// Funções auxiliares
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
  
  return null;
}

async function sendWebhook(instanceName, data) {
  try {
    // Importar função getWebhook do index.js (evitar dependência circular)
    const mainModule = require('./index');
    const webhookUrl = mainModule.getWebhook?.(instanceName);
    
    if (!webhookUrl) return;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error(`[${instanceName}] Webhook falhou: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${instanceName}] Erro no webhook:`, error.message);
  }
}

// Carregar sessões existentes ao iniciar
async function loadExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const sessions = fs.readdirSync(SESSIONS_DIR);
  
  for (const sessionName of sessions) {
    const sessionPath = path.join(SESSIONS_DIR, sessionName);
    if (fs.statSync(sessionPath).isDirectory()) {
      console.log(`Carregando sessão existente: ${sessionName}`);
      try {
        await createInstance(sessionName);
      } catch (error) {
        console.error(`Erro ao carregar sessão ${sessionName}:`, error);
      }
    }
  }
}

// Carregar sessões ao iniciar
loadExistingSessions();

module.exports = {
  createInstance,
  getInstance,
  getAllInstances,
  deleteInstance
};
