const express = require('express');
const { createInstance, getInstance, getAllInstances, deleteInstance } = require('./whatsapp');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' });
  }
  next();
};

// Aplicar autenticação em todas as rotas exceto health check
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  authMiddleware(req, res, next);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== INSTÂNCIAS ====================

// Criar nova instância
app.post('/instance/create', async (req, res) => {
  try {
    const { instanceName } = req.body;
    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    const existing = getInstance(instanceName);
    if (existing) {
      return res.status(400).json({ error: 'Instância já existe' });
    }

    const result = await createInstance(instanceName);
    res.json(result);
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter QR Code da instância
app.get('/instance/:instanceName/qrcode', (req, res) => {
  const { instanceName } = req.params;
  const instance = getInstance(instanceName);

  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  if (instance.isConnected) {
    return res.json({ status: 'connected', message: 'Já conectado' });
  }

  if (!instance.qrCode) {
    return res.json({ status: 'waiting', message: 'QR Code ainda não gerado, aguarde...' });
  }

  res.json({ 
    status: 'pending',
    qrcode: instance.qrCode,
    qrcodeBase64: instance.qrCodeBase64
  });
});

// Status da instância
app.get('/instance/:instanceName/status', (req, res) => {
  const { instanceName } = req.params;
  const instance = getInstance(instanceName);

  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  res.json({
    instanceName,
    isConnected: instance.isConnected,
    user: instance.user || null
  });
});

// Listar todas as instâncias
app.get('/instances', (req, res) => {
  const instances = getAllInstances();
  res.json(instances);
});

// Deletar instância
app.delete('/instance/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = await deleteInstance(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desconectar instância (logout)
app.post('/instance/:instanceName/logout', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const instance = getInstance(instanceName);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    if (instance.socket) {
      await instance.socket.logout();
    }

    res.json({ success: true, message: 'Logout realizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MENSAGENS ====================

// Enviar mensagem de texto
app.post('/message/send-text', async (req, res) => {
  try {
    const { instanceName, to, text } = req.body;

    if (!instanceName || !to || !text) {
      return res.status(400).json({ error: 'instanceName, to e text são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    if (!instance.isConnected) {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    // Formatar número
    const jid = formatPhoneNumber(to);
    
    const result = await instance.socket.sendMessage(jid, { text });
    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar imagem
app.post('/message/send-image', async (req, res) => {
  try {
    const { instanceName, to, imageUrl, caption } = req.body;

    if (!instanceName || !to || !imageUrl) {
      return res.status(400).json({ error: 'instanceName, to e imageUrl são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(to);
    
    const result = await instance.socket.sendMessage(jid, {
      image: { url: imageUrl },
      caption: caption || ''
    });

    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar documento/arquivo
app.post('/message/send-document', async (req, res) => {
  try {
    const { instanceName, to, documentUrl, fileName, mimetype } = req.body;

    if (!instanceName || !to || !documentUrl) {
      return res.status(400).json({ error: 'instanceName, to e documentUrl são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(to);
    
    const result = await instance.socket.sendMessage(jid, {
      document: { url: documentUrl },
      fileName: fileName || 'documento',
      mimetype: mimetype || 'application/octet-stream'
    });

    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar áudio
app.post('/message/send-audio', async (req, res) => {
  try {
    const { instanceName, to, audioUrl, ptt } = req.body;

    if (!instanceName || !to || !audioUrl) {
      return res.status(400).json({ error: 'instanceName, to e audioUrl são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(to);
    
    const result = await instance.socket.sendMessage(jid, {
      audio: { url: audioUrl },
      ptt: ptt !== false // push-to-talk (áudio como mensagem de voz)
    });

    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar localização
app.post('/message/send-location', async (req, res) => {
  try {
    const { instanceName, to, latitude, longitude, name, address } = req.body;

    if (!instanceName || !to || !latitude || !longitude) {
      return res.status(400).json({ error: 'instanceName, to, latitude e longitude são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(to);
    
    const result = await instance.socket.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: name || '',
        address: address || ''
      }
    });

    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar contato
app.post('/message/send-contact', async (req, res) => {
  try {
    const { instanceName, to, contactName, contactNumber } = req.body;

    if (!instanceName || !to || !contactName || !contactNumber) {
      return res.status(400).json({ error: 'instanceName, to, contactName e contactNumber são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(to);
    
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL;type=CELL;type=VOICE;waid=${contactNumber}:+${contactNumber}\nEND:VCARD`;
    
    const result = await instance.socket.sendMessage(jid, {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard }]
      }
    });

    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GRUPOS ====================

// Criar grupo
app.post('/group/create', async (req, res) => {
  try {
    const { instanceName, groupName, participants } = req.body;

    if (!instanceName || !groupName || !participants || !participants.length) {
      return res.status(400).json({ error: 'instanceName, groupName e participants são obrigatórios' });
    }

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jids = participants.map(p => formatPhoneNumber(p));
    const result = await instance.socket.groupCreate(groupName, jids);

    res.json({ success: true, groupId: result.id, groupName: result.subject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar participantes ao grupo
app.post('/group/:groupId/add', async (req, res) => {
  try {
    const { instanceName, participants } = req.body;
    const { groupId } = req.params;

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jids = participants.map(p => formatPhoneNumber(p));
    await instance.socket.groupParticipantsUpdate(groupId, jids, 'add');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover participantes do grupo
app.post('/group/:groupId/remove', async (req, res) => {
  try {
    const { instanceName, participants } = req.body;
    const { groupId } = req.params;

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jids = participants.map(p => formatPhoneNumber(p));
    await instance.socket.groupParticipantsUpdate(groupId, jids, 'remove');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WEBHOOK ====================

// Configurar webhook (armazenado em memória - em produção use banco de dados)
const webhooks = {};

app.post('/webhook/set', (req, res) => {
  const { instanceName, webhookUrl } = req.body;

  if (!instanceName || !webhookUrl) {
    return res.status(400).json({ error: 'instanceName e webhookUrl são obrigatórios' });
  }

  webhooks[instanceName] = webhookUrl;
  res.json({ success: true, message: 'Webhook configurado' });
});

app.get('/webhook/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  res.json({ webhookUrl: webhooks[instanceName] || null });
});

// Exportar webhooks para uso no módulo whatsapp
module.exports.getWebhook = (instanceName) => webhooks[instanceName];

// ==================== UTILITÁRIOS ====================

function formatPhoneNumber(number) {
  // Remove caracteres não numéricos
  let cleaned = number.replace(/\D/g, '');
  
  // Adiciona @s.whatsapp.net se não tiver
  if (!cleaned.includes('@')) {
    cleaned = `${cleaned}@s.whatsapp.net`;
  }
  
  return cleaned;
}

// Verificar se número existe no WhatsApp
app.get('/check-number/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(number);
    const [result] = await instance.socket.onWhatsApp(jid.replace('@s.whatsapp.net', ''));

    res.json({
      exists: !!result?.exists,
      jid: result?.jid || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter foto de perfil
app.get('/profile-picture/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;

    const instance = getInstance(instanceName);
    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const jid = formatPhoneNumber(number);
    const url = await instance.socket.profilePictureUrl(jid, 'image');

    res.json({ url });
  } catch (error) {
    res.json({ url: null });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║        WhatsApp API Multi-Instância                       ║
║        Rodando na porta ${PORT}                              ║
╚══════════════════════════════════════════════════════════╝

Endpoints disponíveis:
  POST /instance/create          - Criar instância
  GET  /instance/:name/qrcode    - Obter QR Code
  GET  /instance/:name/status    - Status da instância
  GET  /instances                - Listar instâncias
  DELETE /instance/:name         - Deletar instância
  POST /instance/:name/logout    - Desconectar
  
  POST /message/send-text        - Enviar texto
  POST /message/send-image       - Enviar imagem
  POST /message/send-document    - Enviar documento
  POST /message/send-audio       - Enviar áudio
  POST /message/send-location    - Enviar localização
  POST /message/send-contact     - Enviar contato
  
  POST /group/create             - Criar grupo
  POST /group/:id/add            - Adicionar participantes
  POST /group/:id/remove         - Remover participantes
  
  POST /webhook/set              - Configurar webhook
  GET  /check-number/:inst/:num  - Verificar número
  GET  /profile-picture/:i/:num  - Foto de perfil

API Key: ${API_KEY}
  `);
});
