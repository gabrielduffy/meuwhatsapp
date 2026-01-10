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
router.get('/list', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const instancesObj = whatsapp.getAllInstances();

    // Buscar todas as instâncias do banco (para pegar as criadas externamente)
    const dbRes = await query('SELECT * FROM instances ORDER BY created_at DESC');
    const dbInstances = dbRes.rows;

    // Criar um set de nomes de instâncias em memória para facilitar mesclagem
    const memoryNames = Object.keys(instancesObj);

    // Lista final mesclada
    const instancesList = [];

    // 1. Adicionar instâncias do banco
    dbInstances.forEach(dbInst => {
      const name = dbInst.instance_name;
      const memData = instancesObj[name] || {};

      instancesList.push({
        instanceName: name,
        status: memData.status || (memData.isConnected ? 'connected' : 'disconnected'),
        isConnected: memData.isConnected || false,
        user: memData.user || null,
        token: dbInst.token || memData.token,
        webhookUrl: memData.webhookUrl || dbInst.webhook_url,
        empresaId: dbInst.empresa_id,
        createdAt: dbInst.created_at,
        lastActivity: memData.lastActivity || dbInst.updated_at
      });
    });

    // 2. Adicionar instâncias que estão em memória mas NÃO estão no banco (segurança)
    memoryNames.forEach(name => {
      if (!dbInstances.find(d => d.instance_name === name)) {
        const memData = instancesObj[name];
        instancesList.push({
          instanceName: name,
          status: memData.status || (memData.isConnected ? 'connected' : 'disconnected'),
          isConnected: memData.isConnected || false,
          user: memData.user,
          token: memData.token,
          webhookUrl: memData.webhookUrl,
          empresaId: memData.empresaId,
          createdAt: memData.createdAt,
          lastActivity: memData.lastActivity
        });
      }
    });

    res.json(instancesList);
  } catch (error) {
    console.error('[API] Erro ao listar instâncias:', error);
    res.status(500).json({ error: 'Erro ao listar instâncias' });
  }
});

// Obter QR Code
router.get('/:instanceName/qrcode', async (req, res) => {
  const { instanceName } = req.params;
  const { format } = req.query;
  const isImageRequest = format === 'image';

  let instance = whatsapp.getInstance(instanceName);

  // Auto-recuperação do banco se não estiver em memória
  if (!instance) {
    try {
      const { query } = require('../config/database');
      const dbRes = await query('SELECT * FROM instances WHERE LOWER(instance_name) = LOWER($1)', [instanceName]);

      if (dbRes.rows.length > 0) {
        console.log(`[QR] Instância '${instanceName}' encontrada no banco. Inicializando auto-carregamento...`);
        const dbInst = dbRes.rows[0];
        await whatsapp.createInstance(dbInst.instance_name, {
          token: dbInst.token || dbInst.instance_token,
          webhookUrl: dbInst.webhook_url,
          empresaId: dbInst.empresa_id,
          proxy: dbInst.proxy_config ? JSON.parse(dbInst.proxy_config) : null
        });

        instance = whatsapp.getInstance(instanceName);
      }
    } catch (e) {
      console.error(`[QR] Erro no auto-carregamento de '${instanceName}':`, e.message);
    }
  }

  // Se for pedido imagem e não achamos a instância, envia pixel transparente em vez de JSON 404
  if (!instance) {
    if (isImageRequest) {
      const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(transparentPixel);
    }
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  // Se já estiver conectado e pedir imagem, retorna um status visual amigável ou pixel
  if (instance.isConnected) {
    if (isImageRequest) {
      // Opcional: retornar uma imagem de "Conectado" ou pixel transparente
      const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(transparentPixel);
    }
    return res.json({ status: 'connected', message: 'Já conectado', user: instance.user });
  }

  // Tratamento do QR Code como Imagem
  if (isImageRequest) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (instance.qrCodeBase64) {
      const base64Data = instance.qrCodeBase64.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    }

    if (instance.qrCode) {
      const QRCode = require('qrcode');
      res.setHeader('Content-Type', 'image/png');
      return QRCode.toBuffer(instance.qrCode, (err, buffer) => {
        if (err) return res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
        res.send(buffer);
      });
    }

    // Fallback final: Pixel transparente enquanto aguarda o QR
    const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.setHeader('Content-Type', 'image/png');
    return res.send(transparentPixel);
  }

  // Resposta padrão JSON para quem não pediu format=image
  res.json({
    status: instance.qrCode ? 'pending' : 'waiting',
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
router.get('/:instanceName/status', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { query } = require('../config/database');
    const instance = whatsapp.getInstance(instanceName);

    // Buscar no banco para pegar campos persistentes (que podem não estar em memória)
    const dbRes = await query('SELECT token, webhook_url, empresa_id, created_at, updated_at FROM instances WHERE LOWER(instance_name) = LOWER($1)', [instanceName]);
    const dbInst = dbRes.rows[0];

    if (!instance && !dbInst) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    res.json({
      instanceName,
      isConnected: instance ? instance.isConnected : false,
      status: instance ? (instance.status || (instance.isConnected ? 'connected' : 'disconnected')) : 'disconnected',
      user: instance ? instance.user : null,
      token: dbInst ? dbInst.token : (instance ? instance.token : null),
      webhookUrl: dbInst ? dbInst.webhook_url : (instance ? instance.webhookUrl : null),
      empresaId: dbInst ? dbInst.empresa_id : (instance ? instance.empresaId : null),
      proxy: instance && instance.proxy ? `${instance.proxy.host}:${instance.proxy.port}` : null,
      createdAt: dbInst ? dbInst.created_at : (instance ? instance.createdAt : null),
      lastActivity: instance ? instance.lastActivity : (dbInst ? dbInst.updated_at : null)
    });
  } catch (error) {
    console.error('[API] Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro ao obter status da instância' });
  }
});

// Informações detalhadas da instância
router.get('/:instanceName/info', validateInstance, requireConnected, async (req, res) => {
  try {
    const instance = req.instance;
    const { query } = require('../config/database');

    // Buscar configurações persistentes no banco
    const dbRes = await query('SELECT webhook_url FROM instances WHERE LOWER(instance_name) = LOWER($1)', [req.instanceName]);
    const webhookUrl = dbRes.rows[0]?.webhook_url || instance.webhookUrl;

    res.json({
      instanceName: req.instanceName,
      isConnected: instance.isConnected,
      user: instance.user,
      webhookUrl: webhookUrl,
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
