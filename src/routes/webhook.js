const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');
const webhookAdvanced = require('../services/webhook-advanced');

// ========== CONFIGURAÇÃO BÁSICA (compatibilidade) ==========

// Configurar webhook (método básico)
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
    const advancedConfig = webhookAdvanced.getWebhookConfig(instanceName);

    res.json({
      webhook,
      webhookUrl: webhook?.url || '',
      advancedConfig
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover webhook
router.delete('/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = whatsapp.deleteWebhook(instanceName);
    webhookAdvanced.deleteWebhookConfig(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CONFIGURAÇÃO AVANÇADA ==========

// Configurar webhook avançado com retry e logs
router.post('/configure', (req, res) => {
  try {
    const { instanceName, config } = req.body;

    if (!instanceName || !config || !config.url) {
      return res.status(400).json({ error: 'instanceName e config.url são obrigatórios' });
    }

    // Configurar webhook básico no whatsapp service
    whatsapp.setWebhook(instanceName, config.url, config.eventTypes || ['all']);

    // Configurar webhook avançado
    const advancedConfig = webhookAdvanced.configureWebhook(instanceName, config);

    res.json({
      success: true,
      message: 'Webhook avançado configurado com sucesso',
      config: advancedConfig
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Testar webhook
router.post('/test/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória para teste' });
    }

    const result = await webhookAdvanced.testWebhook(instanceName, url);

    res.json({
      success: result.success,
      message: result.success ? 'Webhook testado com sucesso' : 'Falha no teste de webhook',
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGS DE WEBHOOK ==========

// Obter logs de webhook
router.get('/logs/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { eventType, status, since, limit } = req.query;

    const logs = webhookAdvanced.getWebhookLogs(instanceName, {
      eventType,
      status,
      since,
      limit: limit ? parseInt(limit) : 100
    });

    res.json({
      instanceName,
      total: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar logs de webhook
router.delete('/logs/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    webhookAdvanced.clearWebhookLogs(instanceName);

    res.json({
      success: true,
      message: 'Logs de webhook limpos com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ESTATÍSTICAS ==========

// Obter estatísticas de webhook
router.get('/stats/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { period } = req.query; // hour, day, week

    const stats = webhookAdvanced.getWebhookStats(instanceName, period || 'day');

    res.json({
      instanceName,
      period: period || 'day',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todos os webhooks configurados
router.get('/all/configs', (req, res) => {
  try {
    const configs = webhookAdvanced.getAllWebhookConfigs();

    res.json({
      total: Object.keys(configs).length,
      configs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
