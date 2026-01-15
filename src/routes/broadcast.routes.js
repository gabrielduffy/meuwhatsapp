const express = require('express');
const router = express.Router();
const {
  createCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getCampaign,
  listCampaigns
} = require('../services/broadcast');

// Criar campanha
router.post('/create', async (req, res) => {
  try {
    const result = createCampaign(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Iniciar campanha
router.post('/start/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = startCampaign(campaignId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Pausar campanha
router.post('/pause/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = pauseCampaign(campaignId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Retomar campanha
router.post('/resume/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = resumeCampaign(campaignId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancelar campanha
router.delete('/cancel/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = cancelCampaign(campaignId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter status de campanha
router.get('/status/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = getCampaign(campaignId);
    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Listar campanhas
router.get('/list/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { status } = req.query;
    const campaigns = listCampaigns(instanceName, status);

    res.json({
      success: true,
      total: campaigns.length,
      campaigns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
