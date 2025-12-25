const express = require('express');
const router = express.Router();
const prospeccaoServico = require('../servicos/prospeccao.servico');
const prospeccaoRepo = require('../repositorios/prospeccao.repositorio');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarFuncionalidade } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// CAMPANHAS
// =====================================================

/**
 * POST /api/prospeccao/campanhas
 * Criar campanha
 */
router.post('/campanhas', verificarFuncionalidade('prospeccao'), async (req, res) => {
  try {
    const campanha = await prospeccaoServico.criarCampanha(req.empresaId, req.body);

    res.status(201).json({
      mensagem: 'Campanha criada com sucesso',
      campanha
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao criar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/prospeccao/campanhas
 * Listar campanhas
 */
router.get('/campanhas', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const campanhas = await prospeccaoRepo.listarCampanhas(req.empresaId, filtros);

    res.json({
      campanhas,
      total: campanhas.length
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao listar campanhas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/prospeccao/campanhas/:id
 * Buscar campanha por ID
 */
router.get('/campanhas/:id', async (req, res) => {
  try {
    const campanha = await prospeccaoRepo.buscarCampanhaPorId(req.params.id, req.empresaId);

    if (!campanha) {
      return res.status(404).json({ erro: 'Campanha não encontrada' });
    }

    res.json({ campanha });
  } catch (erro) {
    console.error('[Prospecção] Erro ao buscar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/prospeccao/campanhas/:id
 * Atualizar campanha
 */
router.put('/campanhas/:id', async (req, res) => {
  try {
    const campanha = await prospeccaoRepo.atualizarCampanha(
      req.params.id,
      req.empresaId,
      req.body
    );

    if (!campanha) {
      return res.status(404).json({ erro: 'Campanha não encontrada' });
    }

    res.json({
      mensagem: 'Campanha atualizada com sucesso',
      campanha
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao atualizar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/prospeccao/campanhas/:id
 * Deletar campanha
 */
router.delete('/campanhas/:id', async (req, res) => {
  try {
    const campanha = await prospeccaoRepo.deletarCampanha(req.params.id, req.empresaId);

    if (!campanha) {
      return res.status(404).json({ erro: 'Campanha não encontrada' });
    }

    res.json({ mensagem: 'Campanha deletada com sucesso' });
  } catch (erro) {
    console.error('[Prospecção] Erro ao deletar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/prospeccao/campanhas/:id/importar
 * Importar leads
 */
router.post('/campanhas/:id/importar', async (req, res) => {
  try {
    const { leads, nomeArquivo } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ erro: 'Lista de leads é obrigatória' });
    }

    const resultado = await prospeccaoServico.importarLeads(
      req.empresaId,
      req.params.id,
      {
        dados: leads,
        nomeArquivo: nomeArquivo || 'importacao.csv'
      }
    );

    res.json({
      mensagem: 'Leads importados com sucesso',
      ...resultado
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao importar leads:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/prospeccao/campanhas/:id/iniciar
 * Iniciar campanha
 */
router.post('/campanhas/:id/iniciar', async (req, res) => {
  try {
    const resultado = await prospeccaoServico.iniciarCampanha(req.empresaId, req.params.id);

    res.json(resultado);
  } catch (erro) {
    console.error('[Prospecção] Erro ao iniciar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/prospeccao/campanhas/:id/pausar
 * Pausar campanha
 */
router.post('/campanhas/:id/pausar', async (req, res) => {
  try {
    const resultado = await prospeccaoServico.pausarCampanha(req.empresaId, req.params.id);

    res.json(resultado);
  } catch (erro) {
    console.error('[Prospecção] Erro ao pausar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/prospeccao/campanhas/:id/cancelar
 * Cancelar campanha
 */
router.post('/campanhas/:id/cancelar', async (req, res) => {
  try {
    const resultado = await prospeccaoServico.cancelarCampanha(req.empresaId, req.params.id);

    res.json(resultado);
  } catch (erro) {
    console.error('[Prospecção] Erro ao cancelar campanha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/prospeccao/campanhas/:id/estatisticas
 * Obter estatísticas da campanha
 */
router.get('/campanhas/:id/estatisticas', async (req, res) => {
  try {
    const estatisticas = await prospeccaoServico.obterEstatisticas(req.empresaId, req.params.id);

    res.json(estatisticas);
  } catch (erro) {
    console.error('[Prospecção] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// LEADS
// =====================================================

/**
 * GET /api/prospeccao/campanhas/:id/leads
 * Listar leads da campanha
 */
router.get('/campanhas/:id/leads', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      limite: parseInt(req.query.limite) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const leads = await prospeccaoRepo.listarLeadsPorCampanha(
      req.params.id,
      req.empresaId,
      filtros
    );

    res.json({
      leads,
      total: leads.length
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao listar leads:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/prospeccao/campanhas/:id/leads
 * Adicionar lead individual
 */
router.post('/campanhas/:id/leads', async (req, res) => {
  try {
    const { nome, telefone, variaveis, agendarPara } = req.body;

    if (!telefone) {
      return res.status(400).json({ erro: 'Telefone é obrigatório' });
    }

    const lead = await prospeccaoRepo.criarLead({
      campanhaId: req.params.id,
      empresaId: req.empresaId,
      nome: nome || 'Sem nome',
      telefone,
      variaveis: variaveis || {},
      agendarPara: agendarPara || null
    });

    // Incrementar contador
    await prospeccaoRepo.incrementarContadorCampanha(req.params.id, 'total_leads');

    res.status(201).json({
      mensagem: 'Lead adicionado com sucesso',
      lead
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao adicionar lead:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/prospeccao/leads/:id
 * Buscar lead por ID
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await prospeccaoRepo.buscarLeadPorId(req.params.id, req.empresaId);

    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado' });
    }

    res.json({ lead });
  } catch (erro) {
    console.error('[Prospecção] Erro ao buscar lead:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/prospeccao/leads/:id
 * Deletar lead
 */
router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await prospeccaoRepo.deletarLead(req.params.id, req.empresaId);

    if (!lead) {
      return res.status(404).json({ erro: 'Lead não encontrado' });
    }

    res.json({ mensagem: 'Lead deletado com sucesso' });
  } catch (erro) {
    console.error('[Prospecção] Erro ao deletar lead:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// IMPORTAÇÕES
// =====================================================

/**
 * GET /api/prospeccao/campanhas/:id/importacoes
 * Listar importações da campanha
 */
router.get('/campanhas/:id/importacoes', async (req, res) => {
  try {
    const importacoes = await prospeccaoRepo.listarImportacoes(req.params.id, req.empresaId);

    res.json({
      importacoes,
      total: importacoes.length
    });
  } catch (erro) {
    console.error('[Prospecção] Erro ao listar importações:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/prospeccao/importacoes/:id
 * Buscar importação por ID
 */
router.get('/importacoes/:id', async (req, res) => {
  try {
    const importacao = await prospeccaoRepo.buscarImportacaoPorId(req.params.id, req.empresaId);

    if (!importacao) {
      return res.status(404).json({ erro: 'Importação não encontrada' });
    }

    res.json({ importacao });
  } catch (erro) {
    console.error('[Prospecção] Erro ao buscar importação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
