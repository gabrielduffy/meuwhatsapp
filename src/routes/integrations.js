const express = require('express');
const router = express.Router();
const integracaoServico = require('../servicos/integracao.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarFuncionalidade } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// CRUD DE INTEGRAÇÕES
// =====================================================

/**
 * POST /api/integracoes
 * Criar integração
 */
router.post('/', verificarFuncionalidade('integracoes'), async (req, res) => {
  try {
    const integracao = await integracaoServico.criarIntegracao(req.empresaId, req.body);

    res.status(201).json({
      mensagem: 'Integração criada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao criar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes
 * Listar integrações
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {
      tipo: req.query.tipo,
      ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const integracoes = await integracaoServico.listarIntegracoes(req.empresaId, filtros);

    res.json({
      integracoes,
      total: integracoes.length
    });
  } catch (erro) {
    console.error('[Integração] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes/:id
 * Buscar integração por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const integracao = await integracaoServico.buscarIntegracao(req.empresaId, req.params.id);

    res.json({ integracao });
  } catch (erro) {
    console.error('[Integração] Erro ao buscar:', erro);
    res.status(404).json({ erro: erro.message });
  }
});

/**
 * PUT /api/integracoes/:id
 * Atualizar integração
 */
router.put('/:id', async (req, res) => {
  try {
    const integracao = await integracaoServico.atualizarIntegracao(
      req.empresaId,
      req.params.id,
      req.body
    );

    res.json({
      mensagem: 'Integração atualizada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/integracoes/:id
 * Deletar integração
 */
router.delete('/:id', async (req, res) => {
  try {
    await integracaoServico.deletarIntegracao(req.empresaId, req.params.id);

    res.json({ mensagem: 'Integração deletada com sucesso' });
  } catch (erro) {
    console.error('[Integração] Erro ao deletar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/ativar
 * Ativar integração
 */
router.post('/:id/ativar', async (req, res) => {
  try {
    const integracao = await integracaoServico.alterarStatus(
      req.empresaId,
      req.params.id,
      true
    );

    res.json({
      mensagem: 'Integração ativada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao ativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/desativar
 * Desativar integração
 */
router.post('/:id/desativar', async (req, res) => {
  try {
    const integracao = await integracaoServico.alterarStatus(
      req.empresaId,
      req.params.id,
      false
    );

    res.json({
      mensagem: 'Integração desativada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao desativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// EXECUTAR/TESTAR INTEGRAÇÕES
// =====================================================

/**
 * POST /api/integracoes/:id/testar
 * Testar integração
 */
router.post('/:id/testar', async (req, res) => {
  try {
    const resultado = await integracaoServico.testarIntegracao(req.empresaId, req.params.id);

    res.json({
      mensagem: 'Teste realizado',
      ...resultado
    });
  } catch (erro) {
    console.error('[Integração] Erro ao testar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/disparar
 * Disparar webhook manualmente
 */
router.post('/:id/disparar', async (req, res) => {
  try {
    const { evento, dados } = req.body;

    if (!evento) {
      return res.status(400).json({ erro: 'Evento é obrigatório' });
    }

    const resultado = await integracaoServico.dispararWebhook(
      req.params.id,
      req.empresaId,
      evento,
      dados || {}
    );

    res.json({
      mensagem: 'Webhook disparado',
      ...resultado
    });
  } catch (erro) {
    console.error('[Integração] Erro ao disparar webhook:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// LOGS
// =====================================================

/**
 * GET /api/integracoes/:id/logs
 * Listar logs da integração
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      tipoEvento: req.query.tipo_evento,
      limite: parseInt(req.query.limite) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const logs = await integracaoServico.listarLogs(req.empresaId, req.params.id, filtros);

    res.json({
      logs,
      total: logs.length
    });
  } catch (erro) {
    console.error('[Integração] Erro ao listar logs:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes/:id/estatisticas
 * Obter estatísticas da integração
 */
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const periodo = req.query.periodo || '24 hours';

    const estatisticas = await integracaoServico.obterEstatisticas(
      req.empresaId,
      req.params.id,
      periodo
    );

    res.json(estatisticas);
  } catch (erro) {
    console.error('[Integração] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/integracoes/:id/logs
 * Limpar logs antigos
 */
router.delete('/:id/logs', async (req, res) => {
  try {
    const diasAntigos = parseInt(req.query.dias) || 30;

    const resultado = await integracaoServico.limparLogsAntigos(
      req.empresaId,
      req.params.id,
      diasAntigos
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Integração] Erro ao limpar logs:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// WEBHOOK RECEBIDO (Público - sem autenticação JWT)
// =====================================================

/**
 * POST /api/integracoes/webhook/:integracaoId
 * Receber webhook de integração externa
 * Esta rota não usa autenticação JWT, usa validação por assinatura
 */
const routerPublico = express.Router();

routerPublico.post('/webhook/:integracaoId/:empresaId', async (req, res) => {
  try {
    const { integracaoId, empresaId } = req.params;

    const resultado = await integracaoServico.processarWebhookRecebido(
      empresaId,
      integracaoId,
      req.body,
      req.headers
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Integração] Erro ao processar webhook:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// Exportar ambas as rotas
module.exports = {
  rotasProtegidas: router,
  rotasPublicas: routerPublico
};
