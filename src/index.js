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

// Rotas públicas (sem autenticação)
const publicRoutes = ['/health', '/docs', '/manager'];

app.use((req, res, next) => {
  if (publicRoutes.some(route => req.path.startsWith(route))) return next();
  authMiddleware(req, res, next);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== PÁGINA DE DOCUMENTAÇÃO ====================
app.get('/docs', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.send(getDocsHTML(baseUrl));
});

// ==================== PÁGINA DE GERENCIAMENTO ====================
app.get('/manager', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.send(getManagerHTML(baseUrl));
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
      ptt: ptt !== false
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

module.exports.getWebhook = (instanceName) => webhooks[instanceName];

// ==================== UTILITÁRIOS ====================

function formatPhoneNumber(number) {
  let cleaned = number.replace(/\D/g, '');
  if (!cleaned.includes('@')) {
    cleaned = `${cleaned}@s.whatsapp.net`;
  }
  return cleaned;
}

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

// ==================== HTML PAGES ====================

function getManagerHTML(baseUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp API Manager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #075e54 0%, #128c7e 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: white; text-align: center; margin-bottom: 30px; font-size: 2rem; }
        .config-card, .card { background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .config-card h2, .card h2 { color: #075e54; margin-bottom: 15px; font-size: 1.2rem; }
        .card h2 { padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; }
        .form-row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        input, select, textarea { padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; flex: 1; min-width: 200px; font-family: inherit; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #25d366; }
        textarea { resize: vertical; min-height: 100px; }
        button { padding: 12px 25px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; transition: all 0.3s; }
        .btn-primary { background: #25d366; color: white; }
        .btn-primary:hover { background: #128c7e; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { background: #c82333; }
        .btn-secondary { background: #6c757d; color: white; }
        .qr-container { text-align: center; padding: 20px; }
        .qr-container img { max-width: 280px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-connected { background: #d4edda; color: #155724; }
        .status-disconnected { background: #f8d7da; color: #721c24; }
        .instance-list { display: grid; gap: 15px; }
        .instance-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 10px; flex-wrap: wrap; gap: 10px; }
        .instance-info { display: flex; align-items: center; gap: 15px; }
        .instance-actions { display: flex; gap: 10px; }
        .message-form { display: grid; gap: 15px; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        #alertContainer { position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px; }
        .hidden { display: none; }
        .tabs { display: flex; gap: 5px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab { padding: 10px 20px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: bold; }
        .tab.active { background: white; color: #075e54; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #25d366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .response-box { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 13px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; }
        .nav-link { color: white; margin-left: 15px; text-decoration: none; }
        .nav-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div id="alertContainer"></div>
    <div class="container">
        <h1>📱 WhatsApp API Manager <a href="/docs" class="nav-link">📖 Documentação</a></h1>
        
        <div class="config-card">
            <h2>⚙️ Configuração da API</h2>
            <div class="form-row">
                <input type="text" id="apiUrl" placeholder="URL da API" value="${baseUrl}">
                <input type="text" id="apiKey" placeholder="API Key">
                <button class="btn-primary" onclick="saveConfig()">💾 Salvar</button>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('instances')">📋 Instâncias</button>
            <button class="tab" onclick="showTab('messages')">💬 Mensagens</button>
            <button class="tab" onclick="showTab('groups')">👥 Grupos</button>
            <button class="tab" onclick="showTab('tools')">🔧 Ferramentas</button>
        </div>
        
        <div id="instances" class="tab-content active">
            <div class="card">
                <h2>➕ Criar Nova Instância</h2>
                <div class="form-row">
                    <input type="text" id="newInstanceName" placeholder="Nome da instância (ex: whats1)">
                    <button class="btn-primary" onclick="createInstance()">Criar Instância</button>
                </div>
            </div>
            
            <div class="card">
                <h2>📱 Instâncias Ativas</h2>
                <button class="btn-secondary" onclick="loadInstances()" style="margin-bottom: 15px;">🔄 Atualizar Lista</button>
                <div id="instanceList" class="instance-list">
                    <p style="color: #666;">Clique em "Atualizar Lista" para carregar as instâncias.</p>
                </div>
            </div>
            
            <div id="qrSection" class="card hidden">
                <h2>📷 QR Code - <span id="qrInstanceName"></span></h2>
                <div class="qr-container">
                    <div id="qrLoading" class="loader hidden"></div>
                    <img id="qrImage" src="" alt="QR Code" class="hidden">
                    <p id="qrStatus"></p>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button class="btn-primary" onclick="refreshQR()">🔄 Atualizar QR Code</button>
                </div>
            </div>
        </div>
        
        <div id="messages" class="tab-content">
            <div class="card">
                <h2>💬 Enviar Mensagem de Texto</h2>
                <div class="message-form">
                    <select id="msgInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="msgTo" placeholder="Número (ex: 5511999999999)">
                    <textarea id="msgText" placeholder="Digite sua mensagem..."></textarea>
                    <button class="btn-primary" onclick="sendTextMessage()">📤 Enviar Mensagem</button>
                </div>
            </div>
            
            <div class="card">
                <h2>🖼️ Enviar Imagem</h2>
                <div class="message-form">
                    <select id="imgInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="imgTo" placeholder="Número (ex: 5511999999999)">
                    <input type="text" id="imgUrl" placeholder="URL da imagem">
                    <input type="text" id="imgCaption" placeholder="Legenda (opcional)">
                    <button class="btn-primary" onclick="sendImageMessage()">📤 Enviar Imagem</button>
                </div>
            </div>

            <div class="card">
                <h2>📄 Enviar Documento</h2>
                <div class="message-form">
                    <select id="docInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="docTo" placeholder="Número (ex: 5511999999999)">
                    <input type="text" id="docUrl" placeholder="URL do documento">
                    <input type="text" id="docName" placeholder="Nome do arquivo (ex: contrato.pdf)">
                    <button class="btn-primary" onclick="sendDocumentMessage()">📤 Enviar Documento</button>
                </div>
            </div>
        </div>
        
        <div id="groups" class="tab-content">
            <div class="card">
                <h2>👥 Criar Grupo</h2>
                <div class="message-form">
                    <select id="groupInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="groupName" placeholder="Nome do grupo">
                    <input type="text" id="groupParticipants" placeholder="Participantes separados por vírgula">
                    <button class="btn-primary" onclick="createGroup()">➕ Criar Grupo</button>
                </div>
            </div>
        </div>
        
        <div id="tools" class="tab-content">
            <div class="card">
                <h2>🔍 Verificar Número no WhatsApp</h2>
                <div class="form-row">
                    <select id="checkInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="checkNumber" placeholder="Número (ex: 5511999999999)">
                    <button class="btn-primary" onclick="checkNumber()">Verificar</button>
                </div>
                <div id="checkResult" style="margin-top: 15px;"></div>
            </div>
            
            <div class="card">
                <h2>⚙️ Configurar Webhook</h2>
                <div class="form-row">
                    <select id="webhookInstance"><option value="">Selecione a instância</option></select>
                    <input type="text" id="webhookUrl" placeholder="URL do webhook">
                    <button class="btn-primary" onclick="setWebhook()">Salvar Webhook</button>
                </div>
            </div>

            <div class="card">
                <h2>📋 Última Resposta da API</h2>
                <div id="lastResponse" class="response-box">Nenhuma requisição feita ainda.</div>
            </div>
        </div>
    </div>
    
    <script>
        let currentQRInstance = '';
        function getConfig() { return { url: document.getElementById('apiUrl').value.replace(/\\/$/, ''), key: document.getElementById('apiKey').value }; }
        function saveConfig() { localStorage.setItem('waApiUrl', document.getElementById('apiUrl').value); localStorage.setItem('waApiKey', document.getElementById('apiKey').value); showAlert('Configuração salva!', 'success'); }
        function loadConfig() { const savedUrl = localStorage.getItem('waApiUrl'); const savedKey = localStorage.getItem('waApiKey'); if (savedUrl) document.getElementById('apiUrl').value = savedUrl; if (savedKey) document.getElementById('apiKey').value = savedKey; }
        function showAlert(message, type) { const container = document.getElementById('alertContainer'); const alert = document.createElement('div'); alert.className = 'alert alert-' + type; alert.textContent = message; container.appendChild(alert); setTimeout(() => alert.remove(), 5000); }
        function showTab(tabName) { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.querySelector('[onclick="showTab(\\'' + tabName + '\\')"]').classList.add('active'); document.getElementById(tabName).classList.add('active'); }
        function updateLastResponse(data) { document.getElementById('lastResponse').textContent = JSON.stringify(data, null, 2); }
        async function apiRequest(endpoint, method = 'GET', body = null) { const config = getConfig(); const options = { method, headers: { 'X-API-Key': config.key, 'Content-Type': 'application/json' } }; if (body) options.body = JSON.stringify(body); try { const response = await fetch(config.url + endpoint, options); const data = await response.json(); updateLastResponse(data); return data; } catch (error) { updateLastResponse({ error: error.message }); throw error; } }
        async function loadInstances() { try { const data = await apiRequest('/instances'); const list = document.getElementById('instanceList'); const instances = Object.entries(data); if (instances.length === 0) { list.innerHTML = '<p style="color: #666;">Nenhuma instância encontrada.</p>'; return; } list.innerHTML = instances.map(([name, info]) => '<div class="instance-item"><div class="instance-info"><strong>' + name + '</strong><span class="status-badge ' + (info.isConnected ? 'status-connected' : 'status-disconnected') + '">' + (info.isConnected ? '🟢 Conectado' : '🔴 Desconectado') + '</span></div><div class="instance-actions">' + (!info.isConnected ? '<button class="btn-primary" onclick="showQR(\\'' + name + '\\')">📷 QR Code</button>' : '') + '<button class="btn-danger" onclick="deleteInstance(\\'' + name + '\\')">🗑️</button></div></div>').join(''); updateInstanceSelects(instances.map(([name]) => name)); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        function updateInstanceSelects(instances) { const selects = ['msgInstance', 'imgInstance', 'docInstance', 'groupInstance', 'checkInstance', 'webhookInstance']; selects.forEach(id => { const select = document.getElementById(id); const currentValue = select.value; select.innerHTML = '<option value="">Selecione a instância</option>' + instances.map(name => '<option value="' + name + '">' + name + '</option>').join(''); select.value = currentValue; }); }
        async function createInstance() { const name = document.getElementById('newInstanceName').value.trim(); if (!name) { showAlert('Digite o nome', 'error'); return; } try { await apiRequest('/instance/create', 'POST', { instanceName: name }); showAlert('Instância criada!', 'success'); document.getElementById('newInstanceName').value = ''; loadInstances(); setTimeout(() => showQR(name), 1000); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function deleteInstance(name) { if (!confirm('Deletar ' + name + '?')) return; try { await apiRequest('/instance/' + name, 'DELETE'); showAlert('Deletada!', 'success'); loadInstances(); document.getElementById('qrSection').classList.add('hidden'); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function showQR(instanceName) { currentQRInstance = instanceName; document.getElementById('qrSection').classList.remove('hidden'); document.getElementById('qrInstanceName').textContent = instanceName; refreshQR(); }
        async function refreshQR() { if (!currentQRInstance) return; const loading = document.getElementById('qrLoading'); const image = document.getElementById('qrImage'); const status = document.getElementById('qrStatus'); loading.classList.remove('hidden'); image.classList.add('hidden'); status.textContent = 'Carregando...'; try { const data = await apiRequest('/instance/' + currentQRInstance + '/qrcode'); loading.classList.add('hidden'); if (data.status === 'connected') { status.textContent = '✅ Conectado!'; status.style.color = '#155724'; image.classList.add('hidden'); loadInstances(); } else if (data.qrcodeBase64) { image.src = data.qrcodeBase64; image.classList.remove('hidden'); status.textContent = '📱 Escaneie o QR Code'; status.style.color = '#856404'; } else { status.textContent = '⏳ Aguardando QR Code...'; status.style.color = '#0c5460'; } } catch (error) { loading.classList.add('hidden'); status.textContent = '❌ Erro'; status.style.color = '#721c24'; } }
        async function sendTextMessage() { const instance = document.getElementById('msgInstance').value; const to = document.getElementById('msgTo').value.trim(); const text = document.getElementById('msgText').value.trim(); if (!instance || !to || !text) { showAlert('Preencha todos os campos', 'error'); return; } try { await apiRequest('/message/send-text', 'POST', { instanceName: instance, to, text }); showAlert('Enviada!', 'success'); document.getElementById('msgText').value = ''; } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function sendImageMessage() { const instance = document.getElementById('imgInstance').value; const to = document.getElementById('imgTo').value.trim(); const imageUrl = document.getElementById('imgUrl').value.trim(); const caption = document.getElementById('imgCaption').value.trim(); if (!instance || !to || !imageUrl) { showAlert('Preencha os campos obrigatórios', 'error'); return; } try { await apiRequest('/message/send-image', 'POST', { instanceName: instance, to, imageUrl, caption }); showAlert('Enviada!', 'success'); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function sendDocumentMessage() { const instance = document.getElementById('docInstance').value; const to = document.getElementById('docTo').value.trim(); const documentUrl = document.getElementById('docUrl').value.trim(); const fileName = document.getElementById('docName').value.trim(); if (!instance || !to || !documentUrl) { showAlert('Preencha os campos obrigatórios', 'error'); return; } try { await apiRequest('/message/send-document', 'POST', { instanceName: instance, to, documentUrl, fileName }); showAlert('Enviado!', 'success'); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function createGroup() { const instance = document.getElementById('groupInstance').value; const groupName = document.getElementById('groupName').value.trim(); const participants = document.getElementById('groupParticipants').value.trim().split(',').map(p => p.trim()); if (!instance || !groupName || participants.length === 0) { showAlert('Preencha todos os campos', 'error'); return; } try { await apiRequest('/group/create', 'POST', { instanceName: instance, groupName, participants }); showAlert('Grupo criado!', 'success'); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function checkNumber() { const instance = document.getElementById('checkInstance').value; const number = document.getElementById('checkNumber').value.trim(); if (!instance || !number) { showAlert('Preencha todos os campos', 'error'); return; } try { const data = await apiRequest('/check-number/' + instance + '/' + number); const result = document.getElementById('checkResult'); result.innerHTML = data.exists ? '<div class="alert alert-success">✅ Existe no WhatsApp! JID: ' + data.jid + '</div>' : '<div class="alert alert-error">❌ Não está no WhatsApp</div>'; } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        async function setWebhook() { const instance = document.getElementById('webhookInstance').value; const webhookUrl = document.getElementById('webhookUrl').value.trim(); if (!instance || !webhookUrl) { showAlert('Preencha todos os campos', 'error'); return; } try { await apiRequest('/webhook/set', 'POST', { instanceName: instance, webhookUrl }); showAlert('Webhook configurado!', 'success'); } catch (error) { showAlert('Erro: ' + error.message, 'error'); } }
        loadConfig();
    </script>
</body>
</html>`;
}

function getDocsHTML(baseUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp API - Documentação</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #075e54 0%, #128c7e 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .nav { background: #054d44; padding: 15px; text-align: center; position: sticky; top: 0; z-index: 100; }
        .nav a { color: white; text-decoration: none; margin: 0 15px; padding: 8px 15px; border-radius: 5px; transition: background 0.3s; }
        .nav a:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .section { background: white; border-radius: 10px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h2 { color: #075e54; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
        .section h3 { color: #128c7e; margin: 25px 0 15px 0; }
        .endpoint { background: #f8f9fa; border-left: 4px solid #25d366; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .method { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 10px; }
        .method-get { background: #61affe; color: white; }
        .method-post { background: #49cc90; color: white; }
        .method-delete { background: #f93e3e; color: white; }
        .url { font-family: 'Consolas', monospace; color: #333; }
        pre { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 15px 0; font-size: 14px; }
        code { font-family: 'Consolas', monospace; }
        .inline-code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f8f9fa; color: #075e54; }
        .required { color: #dc3545; font-weight: bold; }
        .optional { color: #6c757d; }
        .base-url { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .base-url code { background: #ffc107; padding: 5px 10px; border-radius: 4px; }
        .auth-note { background: #d1ecf1; border: 1px solid #17a2b8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .webhook-event { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 WhatsApp API</h1>
        <p>Documentação completa da API não oficial do WhatsApp</p>
    </div>
    
    <div class="nav">
        <a href="/manager">🎛️ Painel de Gerenciamento</a>
        <a href="#autenticacao">🔐 Autenticação</a>
        <a href="#instancias">📋 Instâncias</a>
        <a href="#mensagens">💬 Mensagens</a>
        <a href="#grupos">👥 Grupos</a>
        <a href="#webhooks">🔔 Webhooks</a>
        <a href="#utilitarios">🔧 Utilitários</a>
    </div>
    
    <div class="container">
        <div class="section">
            <h2>🚀 Início Rápido</h2>
            <div class="base-url">
                <strong>URL Base:</strong> <code>${baseUrl}</code>
            </div>
            <div class="auth-note">
                <strong>⚠️ Autenticação:</strong> Todas as requisições (exceto <code class="inline-code">/health</code>, <code class="inline-code">/docs</code> e <code class="inline-code">/manager</code>) requerem autenticação via header <code class="inline-code">X-API-Key</code> ou query param <code class="inline-code">?apikey=</code>
            </div>
        </div>

        <div class="section" id="autenticacao">
            <h2>🔐 Autenticação</h2>
            <p>Existem duas formas de autenticar suas requisições:</p>
            
            <h3>Via Header (Recomendado)</h3>
            <pre>curl -H "X-API-Key: SUA_API_KEY" ${baseUrl}/instances</pre>
            
            <h3>Via Query Parameter</h3>
            <pre>curl "${baseUrl}/instances?apikey=SUA_API_KEY"</pre>
        </div>

        <div class="section" id="instancias">
            <h2>📋 Instâncias</h2>
            
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/instance/create</span>
                <p style="margin-top: 10px;">Cria uma nova instância do WhatsApp</p>
            </div>
            <h4>Body (JSON):</h4>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome único da instância</td></tr>
            </table>
            <h4>Exemplo:</h4>
            <pre>curl -X POST ${baseUrl}/instance/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_API_KEY" \\
  -d '{"instanceName": "whats1"}'</pre>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/instance/{instanceName}/qrcode</span>
                <p style="margin-top: 10px;">Obtém o QR Code para conectar o WhatsApp</p>
            </div>
            <h4>Resposta:</h4>
            <pre>{
  "status": "pending",
  "qrcode": "2@abc123...",
  "qrcodeBase64": "data:image/png;base64,..."
}</pre>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/instance/{instanceName}/status</span>
                <p style="margin-top: 10px;">Verifica o status da instância</p>
            </div>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/instances</span>
                <p style="margin-top: 10px;">Lista todas as instâncias</p>
            </div>

            <div class="endpoint">
                <span class="method method-delete">DELETE</span>
                <span class="url">/instance/{instanceName}</span>
                <p style="margin-top: 10px;">Remove uma instância</p>
            </div>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/instance/{instanceName}/logout</span>
                <p style="margin-top: 10px;">Desconecta o WhatsApp da instância</p>
            </div>
        </div>

        <div class="section" id="mensagens">
            <h2>💬 Mensagens</h2>
            
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-text</span>
                <p style="margin-top: 10px;">Envia uma mensagem de texto</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário (ex: 5511999999999)</td></tr>
                <tr><td>text <span class="required">*</span></td><td>string</td><td>Texto da mensagem</td></tr>
            </table>
            <pre>curl -X POST ${baseUrl}/message/send-text \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_API_KEY" \\
  -d '{
    "instanceName": "whats1",
    "to": "5511999999999",
    "text": "Olá, mundo!"
  }'</pre>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-image</span>
                <p style="margin-top: 10px;">Envia uma imagem</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário</td></tr>
                <tr><td>imageUrl <span class="required">*</span></td><td>string</td><td>URL da imagem</td></tr>
                <tr><td>caption <span class="optional">opcional</span></td><td>string</td><td>Legenda da imagem</td></tr>
            </table>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-document</span>
                <p style="margin-top: 10px;">Envia um documento/arquivo</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário</td></tr>
                <tr><td>documentUrl <span class="required">*</span></td><td>string</td><td>URL do documento</td></tr>
                <tr><td>fileName <span class="optional">opcional</span></td><td>string</td><td>Nome do arquivo</td></tr>
                <tr><td>mimetype <span class="optional">opcional</span></td><td>string</td><td>Tipo MIME do arquivo</td></tr>
            </table>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-audio</span>
                <p style="margin-top: 10px;">Envia um áudio (mensagem de voz)</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário</td></tr>
                <tr><td>audioUrl <span class="required">*</span></td><td>string</td><td>URL do áudio</td></tr>
                <tr><td>ptt <span class="optional">opcional</span></td><td>boolean</td><td>Push-to-talk (padrão: true)</td></tr>
            </table>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-location</span>
                <p style="margin-top: 10px;">Envia uma localização</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário</td></tr>
                <tr><td>latitude <span class="required">*</span></td><td>number</td><td>Latitude</td></tr>
                <tr><td>longitude <span class="required">*</span></td><td>number</td><td>Longitude</td></tr>
                <tr><td>name <span class="optional">opcional</span></td><td>string</td><td>Nome do local</td></tr>
                <tr><td>address <span class="optional">opcional</span></td><td>string</td><td>Endereço</td></tr>
            </table>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/message/send-contact</span>
                <p style="margin-top: 10px;">Envia um contato</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>to <span class="required">*</span></td><td>string</td><td>Número do destinatário</td></tr>
                <tr><td>contactName <span class="required">*</span></td><td>string</td><td>Nome do contato</td></tr>
                <tr><td>contactNumber <span class="required">*</span></td><td>string</td><td>Número do contato</td></tr>
            </table>
        </div>

        <div class="section" id="grupos">
            <h2>👥 Grupos</h2>
            
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/group/create</span>
                <p style="margin-top: 10px;">Cria um novo grupo</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>groupName <span class="required">*</span></td><td>string</td><td>Nome do grupo</td></tr>
                <tr><td>participants <span class="required">*</span></td><td>array</td><td>Lista de números dos participantes</td></tr>
            </table>
            <pre>curl -X POST ${baseUrl}/group/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_API_KEY" \\
  -d '{
    "instanceName": "whats1",
    "groupName": "Meu Grupo",
    "participants": ["5511999999999", "5511888888888"]
  }'</pre>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/group/{groupId}/add</span>
                <p style="margin-top: 10px;">Adiciona participantes ao grupo</p>
            </div>

            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/group/{groupId}/remove</span>
                <p style="margin-top: 10px;">Remove participantes do grupo</p>
            </div>
        </div>

        <div class="section" id="webhooks">
            <h2>🔔 Webhooks</h2>
            <p>Configure webhooks para receber notificações em tempo real sobre eventos da sua instância.</p>
            
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/webhook/set</span>
                <p style="margin-top: 10px;">Configura o webhook de uma instância</p>
            </div>
            <table>
                <tr><th>Parâmetro</th><th>Tipo</th><th>Descrição</th></tr>
                <tr><td>instanceName <span class="required">*</span></td><td>string</td><td>Nome da instância</td></tr>
                <tr><td>webhookUrl <span class="required">*</span></td><td>string</td><td>URL que receberá os eventos</td></tr>
            </table>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/webhook/{instanceName}</span>
                <p style="margin-top: 10px;">Obtém o webhook configurado</p>
            </div>

            <h3>Eventos Enviados</h3>
            
            <div class="webhook-event">
                <strong>connection</strong> - Mudanças de conexão
                <pre>{
  "event": "connection",
  "status": "connected", // ou "logged_out"
  "user": { "id": "5511999999999@s.whatsapp.net", "name": "João" }
}</pre>
            </div>

            <div class="webhook-event">
                <strong>message</strong> - Nova mensagem recebida
                <pre>{
  "event": "message",
  "instanceName": "whats1",
  "data": {
    "key": { "remoteJid": "5511888888888@s.whatsapp.net", "fromMe": false, "id": "ABC123" },
    "from": "5511888888888@s.whatsapp.net",
    "pushName": "Maria",
    "messageType": "conversation",
    "text": "Olá!",
    "timestamp": 1703364000
  }
}</pre>
            </div>

            <div class="webhook-event">
                <strong>message.update</strong> - Status da mensagem (enviada, entregue, lida)
                <pre>{
  "event": "message.update",
  "instanceName": "whats1",
  "data": { "key": {...}, "update": { "status": 3 } }
}</pre>
            </div>
        </div>

        <div class="section" id="utilitarios">
            <h2>🔧 Utilitários</h2>
            
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/check-number/{instanceName}/{number}</span>
                <p style="margin-top: 10px;">Verifica se um número está no WhatsApp</p>
            </div>
            <pre>curl "${baseUrl}/check-number/whats1/5511999999999" \\
  -H "X-API-Key: SUA_API_KEY"

# Resposta:
{
  "exists": true,
  "jid": "5511999999999@s.whatsapp.net"
}</pre>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/profile-picture/{instanceName}/{number}</span>
                <p style="margin-top: 10px;">Obtém a foto de perfil de um número</p>
            </div>

            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/health</span>
                <p style="margin-top: 10px;">Verifica se a API está funcionando (não requer autenticação)</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`
╔══════════════════════════════════════════════════════════╗
║        WhatsApp API Multi-Instância                       ║
║        Rodando na porta \${PORT}                              ║
╚══════════════════════════════════════════════════════════╝

Endpoints disponíveis:
  GET  /docs                     - Documentação da API
  GET  /manager                  - Painel de gerenciamento

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

API Key: \${API_KEY}
  \`);
});
