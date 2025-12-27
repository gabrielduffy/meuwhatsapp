const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  deletarNotificacao,
  deletarTodasLidas,
  criarNotificacao,
  obterEstatisticas
} = require('../controllers/notificacoes.controller');

/**
 * Rotas para gerenciamento de notificações
 * Todas as rotas requerem autenticação
 */

// Listar notificações do usuário
router.get('/', authMiddleware, listarNotificacoes);

// Obter estatísticas de notificações
router.get('/estatisticas', authMiddleware, obterEstatisticas);

// Marcar notificação como lida
router.patch('/:id/lida', authMiddleware, marcarComoLida);

// Marcar todas como lidas
router.patch('/marcar-todas-lidas', authMiddleware, marcarTodasComoLidas);

// Deletar notificação
router.delete('/:id', authMiddleware, deletarNotificacao);

// Deletar todas lidas
router.delete('/lidas/todas', authMiddleware, deletarTodasLidas);

// Criar notificação (admin/sistema)
router.post('/', authMiddleware, criarNotificacao);

module.exports = router;
