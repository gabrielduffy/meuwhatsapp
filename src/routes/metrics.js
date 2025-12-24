const express = require('express');
const router = express.Router();
const {
  getInstanceMetrics,
  getGlobalMetrics,
  getAllMetrics,
  resetAllMetrics,
  exportMetricsCSV,
  getAggregatedStats
} = require('../services/metrics');

// Obter métricas de uma instância específica
router.get('/instance/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const metrics = getInstanceMetrics(instanceName);

    if (!metrics) {
      return res.status(404).json({
        error: 'Métricas não encontradas',
        message: `Não há métricas para a instância ${instanceName}`
      });
    }

    res.json({
      success: true,
      instanceName,
      metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter métricas globais
router.get('/global', (req, res) => {
  try {
    const metrics = getGlobalMetrics();

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter todas as métricas (instâncias + global)
router.get('/all', (req, res) => {
  try {
    const metrics = getAllMetrics();

    res.json({
      success: true,
      ...metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas agregadas
router.get('/stats', (req, res) => {
  try {
    const stats = getAggregatedStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar métricas em CSV
router.get('/export', (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    if (format === 'csv') {
      const csv = exportMetricsCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`);
      res.send(csv);
    } else if (format === 'json') {
      const metrics = getAllMetrics();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`);
      res.json(metrics);
    } else {
      res.status(400).json({
        error: 'Formato inválido',
        message: 'Use format=csv ou format=json'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resetar todas as métricas
router.post('/reset', (req, res) => {
  try {
    resetAllMetrics();

    res.json({
      success: true,
      message: 'Métricas resetadas com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
