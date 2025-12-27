const express = require('express');
const router = express.Router();
const crmServico = require('../servicos/crm.servico');
const crmRepo = require('../repositorios/crm.repositorio');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarFuncionalidade } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// FUNIS
// =====================================================

/**
 * POST /api/crm/funis
 * Criar funil
 */
router.post('/funis', verificarFuncionalidade('crm'), async (req, res) => {
  try {
    const funil = await crmServico.criarFunilComEtapas(req.empresaId, req.body);

    res.status(201).json({
      mensagem: 'Funil criado com sucesso',
      funil
    });
  } catch (erro) {
    console.error('[CRM] Erro ao criar funil:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/funis
 * Listar funis
 */
router.get('/funis', async (req, res) => {
  try {
    const filtros = {
      ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined
    };

    const funis = await crmRepo.listarFunis(req.empresaId, filtros);

    res.json({
      funis,
      total: funis.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao listar funis:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/funis/:id
 * Buscar funil completo (com etapas e negociações)
 */
router.get('/funis/:id', async (req, res) => {
  try {
    const funil = await crmServico.obterFunilCompleto(req.empresaId, req.params.id);

    res.json({ funil });
  } catch (erro) {
    console.error('[CRM] Erro ao buscar funil:', erro);
    res.status(404).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/funis/:id
 * Atualizar funil
 */
router.put('/funis/:id', async (req, res) => {
  try {
    const funil = await crmRepo.atualizarFunil(req.params.id, req.empresaId, req.body);

    if (!funil) {
      return res.status(404).json({ erro: 'Funil não encontrado' });
    }

    res.json({
      mensagem: 'Funil atualizado com sucesso',
      funil
    });
  } catch (erro) {
    console.error('[CRM] Erro ao atualizar funil:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/crm/funis/:id
 * Deletar funil
 */
router.delete('/funis/:id', async (req, res) => {
  try {
    await crmServico.deletarFunilSeguro(req.empresaId, req.params.id);

    res.json({ mensagem: 'Funil deletado com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao deletar funil:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/funis/:id/reordenar-etapas
 * Reordenar etapas do funil
 */
router.put('/funis/:id/reordenar-etapas', async (req, res) => {
  try {
    const { ordem } = req.body;

    if (!ordem || !Array.isArray(ordem)) {
      return res.status(400).json({ erro: 'Ordem deve ser um array' });
    }

    await crmServico.reordenarEtapas(req.empresaId, req.params.id, ordem);

    res.json({ mensagem: 'Etapas reordenadas com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao reordenar etapas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// ETAPAS
// =====================================================

/**
 * GET /api/crm/funis/:funilId/etapas
 * Listar etapas do funil
 */
router.get('/funis/:funilId/etapas', async (req, res) => {
  try {
    const etapas = await crmRepo.listarEtapas(req.params.funilId, req.empresaId);

    res.json({
      etapas,
      total: etapas.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao listar etapas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/funis/:funilId/etapas
 * Criar etapa
 */
router.post('/funis/:funilId/etapas', async (req, res) => {
  try {
    const etapa = await crmRepo.criarEtapa({
      funilId: req.params.funilId,
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Etapa criada com sucesso',
      etapa
    });
  } catch (erro) {
    console.error('[CRM] Erro ao criar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/etapas/:id
 * Atualizar etapa
 */
router.put('/etapas/:id', async (req, res) => {
  try {
    const etapa = await crmRepo.atualizarEtapa(req.params.id, req.empresaId, req.body);

    if (!etapa) {
      return res.status(404).json({ erro: 'Etapa não encontrada' });
    }

    res.json({
      mensagem: 'Etapa atualizada com sucesso',
      etapa
    });
  } catch (erro) {
    console.error('[CRM] Erro ao atualizar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/crm/etapas/:id
 * Deletar etapa
 */
router.delete('/etapas/:id', async (req, res) => {
  try {
    const etapa = await crmRepo.deletarEtapa(req.params.id, req.empresaId);

    if (!etapa) {
      return res.status(404).json({ erro: 'Etapa não encontrada' });
    }

    res.json({ mensagem: 'Etapa deletada com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao deletar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// NEGOCIAÇÕES
// =====================================================

/**
 * GET /api/crm/negociacoes
 * Listar negociações
 */
router.get('/negociacoes', async (req, res) => {
  try {
    const filtros = {
      funilId: req.query.funil_id,
      etapaId: req.query.etapa_id,
      status: req.query.status,
      responsavelId: req.query.responsavel_id,
      prioridade: req.query.prioridade,
      limite: parseInt(req.query.limite) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const negociacoes = await crmRepo.listarNegociacoes(req.empresaId, filtros);

    res.json({
      negociacoes,
      total: negociacoes.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao listar negociações:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/negociacoes
 * Criar negociação
 */
router.post('/negociacoes', async (req, res) => {
  try {
    const { origem, ...dados } = req.body;

    let negociacao;

    // Criar conforme a origem
    if (origem === 'chat') {
      negociacao = await crmServico.criarNegociacaoDoChat(req.empresaId, dados);
    } else if (origem === 'prospeccao') {
      negociacao = await crmServico.criarNegociacaoDaProspeccao(req.empresaId, dados);
    } else {
      // Manual ou API
      negociacao = await crmRepo.criarNegociacao({
        empresaId: req.empresaId,
        ...dados,
        origem: origem || 'manual'
      });
    }

    res.status(201).json({
      mensagem: 'Negociação criada com sucesso',
      negociacao
    });
  } catch (erro) {
    console.error('[CRM] Erro ao criar negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/negociacoes/:id
 * Buscar negociação por ID
 */
router.get('/negociacoes/:id', async (req, res) => {
  try {
    const negociacao = await crmRepo.buscarNegociacaoPorId(req.params.id, req.empresaId);

    if (!negociacao) {
      return res.status(404).json({ erro: 'Negociação não encontrada' });
    }

    res.json({ negociacao });
  } catch (erro) {
    console.error('[CRM] Erro ao buscar negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/negociacoes/:id
 * Atualizar negociação
 */
router.put('/negociacoes/:id', async (req, res) => {
  try {
    const negociacao = await crmRepo.atualizarNegociacao(
      req.params.id,
      req.empresaId,
      req.body,
      req.usuarioId
    );

    if (!negociacao) {
      return res.status(404).json({ erro: 'Negociação não encontrada' });
    }

    res.json({
      mensagem: 'Negociação atualizada com sucesso',
      negociacao
    });
  } catch (erro) {
    console.error('[CRM] Erro ao atualizar negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/crm/negociacoes/:id
 * Deletar negociação
 */
router.delete('/negociacoes/:id', async (req, res) => {
  try {
    await crmRepo.deletarNegociacao(req.params.id, req.empresaId);

    res.json({ mensagem: 'Negociação deletada com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao deletar negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/negociacoes/:id/mover
 * Mover negociação para outra etapa
 */
router.put('/negociacoes/:id/mover', async (req, res) => {
  try {
    const { etapa_id } = req.body;

    if (!etapa_id) {
      return res.status(400).json({ erro: 'ID da etapa é obrigatório' });
    }

    const negociacao = await crmServico.moverNegociacaoComValidacao(
      req.empresaId,
      req.params.id,
      etapa_id,
      req.usuarioId
    );

    res.json({
      mensagem: 'Negociação movida com sucesso',
      negociacao
    });
  } catch (erro) {
    console.error('[CRM] Erro ao mover negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/negociacoes/:id/ganhar
 * Marcar como ganha
 */
router.post('/negociacoes/:id/ganhar', async (req, res) => {
  try {
    const negociacao = await crmRepo.ganharNegociacao(
      req.params.id,
      req.empresaId,
      req.usuarioId
    );

    if (!negociacao) {
      return res.status(404).json({ erro: 'Negociação não encontrada' });
    }

    res.json({
      mensagem: 'Negociação marcada como ganha!',
      negociacao
    });
  } catch (erro) {
    console.error('[CRM] Erro ao ganhar negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/negociacoes/:id/perder
 * Marcar como perdida
 */
router.post('/negociacoes/:id/perder', async (req, res) => {
  try {
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ erro: 'Motivo da perda é obrigatório' });
    }

    const negociacao = await crmRepo.perderNegociacao(
      req.params.id,
      req.empresaId,
      motivo,
      req.usuarioId
    );

    if (!negociacao) {
      return res.status(404).json({ erro: 'Negociação não encontrada' });
    }

    res.json({
      mensagem: 'Negociação marcada como perdida',
      negociacao
    });
  } catch (erro) {
    console.error('[CRM] Erro ao perder negociação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/negociacoes/:id/historico
 * Obter histórico da negociação
 */
router.get('/negociacoes/:id/historico', async (req, res) => {
  try {
    const historico = await crmRepo.listarHistorico(req.params.id, req.empresaId);

    res.json({
      historico,
      total: historico.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao buscar histórico:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// TAREFAS
// =====================================================

/**
 * GET /api/crm/negociacoes/:id/tarefas
 * Listar tarefas da negociação
 */
router.get('/negociacoes/:id/tarefas', async (req, res) => {
  try {
    const filtros = {
      concluida: req.query.concluida === 'true' ? true : req.query.concluida === 'false' ? false : undefined
    };

    const tarefas = await crmRepo.listarTarefas(req.params.id, req.empresaId, filtros);

    res.json({
      tarefas,
      total: tarefas.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao listar tarefas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/negociacoes/:id/tarefas
 * Criar tarefa
 */
router.post('/negociacoes/:id/tarefas', async (req, res) => {
  try {
    const tarefa = await crmRepo.criarTarefa({
      negociacaoId: req.params.id,
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Tarefa criada com sucesso',
      tarefa
    });
  } catch (erro) {
    console.error('[CRM] Erro ao criar tarefa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/tarefas/:id
 * Atualizar tarefa
 */
router.put('/tarefas/:id', async (req, res) => {
  try {
    const tarefa = await crmRepo.atualizarTarefa(req.params.id, req.empresaId, req.body);

    if (!tarefa) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }

    res.json({
      mensagem: 'Tarefa atualizada com sucesso',
      tarefa
    });
  } catch (erro) {
    console.error('[CRM] Erro ao atualizar tarefa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/crm/tarefas/:id
 * Deletar tarefa
 */
router.delete('/tarefas/:id', async (req, res) => {
  try {
    await crmRepo.deletarTarefa(req.params.id, req.empresaId);

    res.json({ mensagem: 'Tarefa deletada com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao deletar tarefa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/tarefas/:id/concluir
 * Concluir tarefa
 */
router.post('/tarefas/:id/concluir', async (req, res) => {
  try {
    const tarefa = await crmRepo.concluirTarefa(req.params.id, req.empresaId, req.usuarioId);

    if (!tarefa) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }

    res.json({
      mensagem: 'Tarefa concluída!',
      tarefa
    });
  } catch (erro) {
    console.error('[CRM] Erro ao concluir tarefa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// CAMPOS PERSONALIZADOS
// =====================================================

/**
 * GET /api/crm/campos-personalizados
 * Listar campos personalizados
 */
router.get('/campos-personalizados', async (req, res) => {
  try {
    const campos = await crmRepo.listarCamposPersonalizados(req.empresaId);

    res.json({
      campos,
      total: campos.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao listar campos:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/crm/campos-personalizados
 * Criar campo personalizado
 */
router.post('/campos-personalizados', async (req, res) => {
  try {
    const campo = await crmRepo.criarCampoPersonalizado({
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Campo personalizado criado',
      campo
    });
  } catch (erro) {
    console.error('[CRM] Erro ao criar campo:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/crm/campos-personalizados/:id
 * Atualizar campo personalizado
 */
router.put('/campos-personalizados/:id', async (req, res) => {
  try {
    const campo = await crmRepo.atualizarCampoPersonalizado(req.params.id, req.empresaId, req.body);

    if (!campo) {
      return res.status(404).json({ erro: 'Campo não encontrado' });
    }

    res.json({
      mensagem: 'Campo atualizado com sucesso',
      campo
    });
  } catch (erro) {
    console.error('[CRM] Erro ao atualizar campo:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/crm/campos-personalizados/:id
 * Deletar campo personalizado
 */
router.delete('/campos-personalizados/:id', async (req, res) => {
  try {
    await crmRepo.deletarCampoPersonalizado(req.params.id, req.empresaId);

    res.json({ mensagem: 'Campo deletado com sucesso' });
  } catch (erro) {
    console.error('[CRM] Erro ao deletar campo:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// ESTATÍSTICAS
// =====================================================

/**
 * GET /api/crm/estatisticas
 * Obter estatísticas do CRM
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const filtros = {
      funilId: req.query.funil_id,
      responsavelId: req.query.responsavel_id
    };

    const estatisticas = await crmServico.obterEstatisticasDetalhadas(req.empresaId, filtros);

    res.json(estatisticas);
  } catch (erro) {
    console.error('[CRM] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/relatorio-funil
 * Gerar relatório de conversão do funil
 */
router.get('/relatorio-funil', async (req, res) => {
  try {
    const { funil_id } = req.query;

    if (!funil_id) {
      return res.status(400).json({ erro: 'ID do funil é obrigatório' });
    }

    const relatorio = await crmServico.gerarRelatorioFunil(req.empresaId, funil_id);

    res.json(relatorio);
  } catch (erro) {
    console.error('[CRM] Erro ao gerar relatório:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/crm/negociacoes-atrasadas
 * Listar negociações atrasadas
 */
router.get('/negociacoes-atrasadas', async (req, res) => {
  try {
    const atrasadas = await crmServico.verificarNegociacoesAtrasadas(req.empresaId);

    res.json({
      negociacoes: atrasadas,
      total: atrasadas.length
    });
  } catch (erro) {
    console.error('[CRM] Erro ao verificar atrasadas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
