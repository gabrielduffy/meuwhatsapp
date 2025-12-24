const express = require('express');
const router = express.Router();
const {
  configureAutoResponder,
  enableAutoResponder,
  disableAutoResponder,
  getAutoResponderConfig,
  clearConversationHistory,
  getAutoResponderStats
} = require('../services/autoresponder');

// Configurar auto-resposta
router.post('/configure', (req, res) => {
  try {
    const { instanceName, ...config } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    const result = configureAutoResponder(instanceName, config);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ativar auto-resposta
router.post('/enable/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = enableAutoResponder(instanceName);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Desativar auto-resposta
router.post('/disable/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const result = disableAutoResponder(instanceName);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter configuração
router.get('/config/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const config = getAutoResponderConfig(instanceName);

    if (!config) {
      return res.status(404).json({ error: 'Auto-resposta não configurada' });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas
router.get('/stats/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const stats = getAutoResponderStats(instanceName);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Limpar histórico de conversa
router.delete('/history/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { contactNumber } = req.query;

    const result = clearConversationHistory(instanceName, contactNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
