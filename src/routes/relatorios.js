const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  obterMetricas,
  obterGraficoMensagens,
  obterTopConversas,
  obterRelatorioInstancias,
  exportarRelatorio,
} = require('../controllers/relatorios.controller');

/**
 * Rotas para relatórios e analytics
 */

router.get('/metricas', authMiddleware, obterMetricas);
router.get('/grafico-mensagens', authMiddleware, obterGraficoMensagens);
router.get('/top-conversas', authMiddleware, obterTopConversas);
router.get('/instancias', authMiddleware, obterRelatorioInstancias);
router.get('/exportar', authMiddleware, exportarRelatorio);

module.exports = router;
