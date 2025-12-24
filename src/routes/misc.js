const express = require('express');
const router = express.Router();
const { checkNumberLimiter } = require('../middlewares/rateLimit');
const whatsapp = require('../services/whatsapp');

// Verificar se número existe no WhatsApp
router.get('/check-number/:instanceName/:number', checkNumberLimiter, async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const result = await whatsapp.checkNumberExists(instanceName, number);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar múltiplos números
router.post('/check-numbers', checkNumberLimiter, async (req, res) => {
  try {
    const { instanceName, numbers } = req.body;

    if (!instanceName || !numbers || !numbers.length) {
      return res.status(400).json({ error: 'instanceName e numbers são obrigatórios' });
    }

    const results = [];
    for (const number of numbers) {
      try {
        const result = await whatsapp.checkNumberExists(instanceName, number);
        results.push({ number, ...result });
      } catch (error) {
        results.push({ number, error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter foto de perfil
router.get('/profile-picture/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const result = await whatsapp.getProfilePicture(instanceName, number);
    res.json(result);
  } catch (error) {
    res.json({ url: null });
  }
});

// Obter perfil business
router.get('/business-profile/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const profile = await whatsapp.getBusinessProfile(instanceName, number);
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
