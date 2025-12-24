const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');

// Configurar webhook
router.post('/set', (req, res) => {
  try {
    const { instanceName, webhookUrl, events } = req.body;

    if (!instanceName || !webhookUrl) {
      return res.status(400).json({ error: 'instanceName e webhookUrl são obrigatórios' });
    }

    // events: array de eventos para escutar
    // ['all'] ou ['message', 'connection', 'qrcode', 'group.update', etc]
    const result = whatsapp.setWebhook(instanceName, webhookUrl, events || ['all']);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter webhook configurado
router.get('/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const webhook = whatsapp.getWebhook(instanceName);
    res.json({ webhook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover webhook
router.delete('/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = whatsapp.deleteWebhook(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
