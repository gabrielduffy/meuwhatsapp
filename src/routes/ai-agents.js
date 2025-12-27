const express = require('express');
const router = express.Router();
const agenteIAServico = require('../servicos/agente-ia.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarFuncionalidade } = require('../middlewares/empresa');
const { verificarCreditos } = require('../middlewares/creditos');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * POST /api/agentes-ia
 * Criar novo agente
 */
router.post('/', verificarFuncionalidade('agente_ia'), async (req, res) => {
  try {
    const agente = await agenteIAServico.criarAgente(req.empresaId, req.body);

    res.status(201).json({
      mensagem: 'Agente criado com sucesso',
      agente
    });
  } catch (erro) {
    console.error('[Agente IA] Erro ao criar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/agentes-ia
 * Listar agentes da empresa
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const agentes = await agenteIAServico.listarAgentes(req.empresaId, filtros);

    res.json({
      agentes,
      total: agentes.length
    });
  } catch (erro) {
    console.error('[Agente IA] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/agentes-ia/:id
 * Buscar agente por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const agenteRepo = require('../repositorios/agente-ia.repositorio');
    const agente = await agenteRepo.buscarPorId(req.params.id, req.empresaId);

    if (!agente) {
      return res.status(404).json({ erro: 'Agente não encontrado' });
    }

    res.json({ agente });
  } catch (erro) {
    console.error('[Agente IA] Erro ao buscar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/agentes-ia/:id
 * Atualizar agente
 */
router.put('/:id', async (req, res) => {
  try {
    const agente = await agenteIAServico.atualizarAgente(
      req.empresaId,
      req.params.id,
      req.body
    );

    res.json({
      mensagem: 'Agente atualizado com sucesso',
      agente
    });
  } catch (erro) {
    console.error('[Agente IA] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/agentes-ia/:id
 * Deletar agente
 */
router.delete('/:id', async (req, res) => {
  try {
    await agenteIAServico.deletarAgente(req.empresaId, req.params.id);

    res.json({ mensagem: 'Agente deletado com sucesso' });
  } catch (erro) {
    console.error('[Agente IA] Erro ao deletar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/agentes-ia/:id/ativar
 * Ativar agente
 */
router.post('/:id/ativar', async (req, res) => {
  try {
    const agente = await agenteIAServico.alterarStatusAgente(
      req.empresaId,
      req.params.id,
      true
    );

    res.json({
      mensagem: 'Agente ativado com sucesso',
      agente
    });
  } catch (erro) {
    console.error('[Agente IA] Erro ao ativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/agentes-ia/:id/desativar
 * Desativar agente
 */
router.post('/:id/desativar', async (req, res) => {
  try {
    const agente = await agenteIAServico.alterarStatusAgente(
      req.empresaId,
      req.params.id,
      false
    );

    res.json({
      mensagem: 'Agente desativado com sucesso',
      agente
    });
  } catch (erro) {
    console.error('[Agente IA] Erro ao desativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/agentes-ia/:id/testar
 * Testar agente (sem debitar créditos)
 */
router.post('/:id/testar', async (req, res) => {
  try {
    const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ erro: 'Mensagem de teste é obrigatória' });
    }

    const resultado = await agenteIAServico.testarAgente(
      req.empresaId,
      req.params.id,
      mensagem
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Agente IA] Erro ao testar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/agentes-ia/:id/processar
 * Processar mensagem com IA (debita créditos)
 */
router.post('/:id/processar', verificarCreditos(10), async (req, res) => {
  try {
    const { mensagem, contexto } = req.body;

    if (!mensagem) {
      return res.status(400).json({ erro: 'Mensagem é obrigatória' });
    }

    const resultado = await agenteIAServico.processarMensagem(
      req.params.id,
      req.empresaId,
      mensagem,
      contexto || {}
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Agente IA] Erro ao processar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/agentes-ia/:id/estatisticas
 * Obter estatísticas do agente
 */
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const estatisticas = await agenteIAServico.obterEstatisticas(
      req.empresaId,
      req.params.id
    );

    res.json(estatisticas);
  } catch (erro) {
    console.error('[Agente IA] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
