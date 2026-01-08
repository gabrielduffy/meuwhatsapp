const express = require('express');
const router = express.Router();
const { instanceLimiter } = require('../middlewares/rateLimit');
const { validateInstance, requireConnected } = require('../middlewares/auth');
const whatsapp = require('../services/whatsapp');
const webhookAdvanced = require('../services/webhook-advanced');

const { verificarLimite } = require('../middlewares/empresa');

/**
 * @swagger
 * /instance/create:
 *   post:
 *     summary: Criar nova instância de WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               token: { type: string, example: "token_opcional" }
 *               browser: { type: string, example: "Chrome" }
 *     responses:
 *       200:
 *         description: Instância criada ou inicializada
 */
router.post('/create', verificarLimite('instancias'), async (req, res) => {
  try {
    const { instanceName, proxy, token, markOnline, browser, webhookUrl, webhookConfig } = req.body;
    console.log(`[API] Criando instância: ${instanceName} (Webhook: ${webhookUrl || 'Nenhum'})`);

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    // Verificar se já existe
    const existing = whatsapp.getInstance(instanceName);
    if (existing) {
      return res.status(400).json({ error: 'Instância já existe' });
    }

    // Simplified creation process
    const result = await whatsapp.createInstance(instanceName, {
      ...req.body, // Pass all body options if needed
      markOnline: true,
      browser: 'Chrome',
      empresaId: req.empresaId || req.empresa?.id
    });

    res.json({
      instance: {
        instanceName,
        status: 'created'
      },
      qrcode: null,
      message: "Instância criada. Aguarde o QR Code."
    });

  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /instance/list:
 *   get:
 *     summary: Listar todas as instâncias ativas
 *     tags: [WhatsApp]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Lista de instâncias
 */
router.get('/list', (req, res) => {
  const instancesObj = whatsapp.getAllInstances();
  // Converter objeto { nome: dados } para array [ { instanceName: nome, ...dados } ]
  const instancesList = Object.entries(instancesObj).map(([name, data]) => ({
    instanceName: name,
    ...data
  }));
  res.json(instancesList);
});

// Obter QR Code
router.get('/:instanceName/qrcode', (req, res) => {
  const { instanceName } = req.params;
  const { format } = req.query;
  const instance = whatsapp.getInstance(instanceName);

  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  if (instance.isConnected) {
    return res.json({ status: 'connected', message: 'Já conectado', user: instance.user });
  }

  if (!instance.qrCode) {
    if (format === 'image') {
      console.log(`[QR Debug] QR Code solicitado como imagem para '${instanceName}', mas ainda não está pronto.`);
      // Retornar um pixel transparente 1x1 para não quebrar a imagem no frontend
      const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(transparentPixel);
    }
    return res.json({ status: 'waiting', message: 'QR Code ainda não gerado, aguarde...' });
  }

  // Retornar como imagem se solicitado
  if (format === 'image' && instance.qrCodeBase64) {
    console.log(`[QR Debug] Servindo QR Code Base64 como imagem para '${instanceName}'.`);
    const base64Data = instance.qrCodeBase64.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/png');
    return res.send(buffer);
  } else if (format === 'image' && instance.qrCode) {
    // Se tiver QR mas não o base64 (raro), gerar agora
    console.log(`[QR Debug] Gerando QR Code imagem on-the-fly para '${instanceName}'.`);
    const QRCode = require('qrcode');
    QRCode.toBuffer(instance.qrCode, (err, buffer) => {
      if (err) return res.status(500).send('Erro ao gerar imagem');
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    });
    return;
  }

  res.json({
    status: 'pending',
    qrcode: instance.qrCode,
    qrcodeBase64: instance.qrCodeBase64,
    pairingCode: instance.pairingCode
  });
});

// Obter código de pareamento
router.post('/:instanceName/pairing-code', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber é obrigatório' });
    }

    const code = await whatsapp.getPairingCode(instanceName, phoneNumber);
    res.json({ success: true, pairingCode: code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /instance/{instanceName}/status:
 *   get:
 *     summary: Obter status de uma instância
 *     tags: [WhatsApp]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: instanceName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status da instância
 */
router.get('/:instanceName/status', (req, res) => {
  const { instanceName } = req.params;
  const instance = whatsapp.getInstance(instanceName);

  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  res.json({
    instanceName,
    isConnected: instance.isConnected,
    user: instance.user || null,
    proxy: instance.proxy ? `${instance.proxy.host}:${instance.proxy.port}` : null,
    createdAt: instance.createdAt,
    lastActivity: instance.lastActivity
  });
});

// Informações detalhadas da instância
router.get('/:instanceName/info', validateInstance, requireConnected, async (req, res) => {
  try {
    const instance = req.instance;

    res.json({
      instanceName: req.instanceName,
      isConnected: instance.isConnected,
      user: instance.user,
      proxy: instance.proxy,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
      rejectCalls: instance.rejectCalls || false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar instância
router.delete('/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = await whatsapp.deleteInstance(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (desconectar)
router.post('/:instanceName/logout', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = await whatsapp.logoutInstance(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reiniciar instância
router.post('/:instanceName/restart', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = await whatsapp.restartInstance(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar rejeição automática de chamadas
router.post('/:instanceName/reject-calls', validateInstance, (req, res) => {
  try {
    const { reject } = req.body;
    const result = whatsapp.setRejectCalls(req.instanceName, reject !== false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar perfil
router.post('/:instanceName/profile/status', validateInstance, requireConnected, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await whatsapp.setProfileStatus(req.instanceName, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:instanceName/profile/name', validateInstance, requireConnected, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await whatsapp.setProfileName(req.instanceName, name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:instanceName/profile/picture', validateInstance, requireConnected, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const result = await whatsapp.setProfilePicture(req.instanceName, imageUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
