const express = require('express');
const router = express.Router();
const warming = require('../services/warming');

// Iniciar aquecimento
router.post('/start', async (req, res) => {
  try {
    const { instanceName, ...config } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    if (!config.groqApiKey) {
      return res.status(400).json({ error: 'groqApiKey é obrigatório' });
    }

    const result = await warming.startWarming(instanceName, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parar aquecimento
router.post('/stop', (req, res) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    const result = warming.stopWarming(instanceName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Status do aquecimento
router.get('/status/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const status = warming.getWarmingStatus(instanceName);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuração
router.post('/config', (req, res) => {
  try {
    const { instanceName, ...config } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    const result = warming.updateWarmingConfig(instanceName, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todos os aquecimentos
router.get('/list', (req, res) => {
  try {
    const configs = warming.getAllWarmingConfigs();
    res.json({ warmings: configs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
