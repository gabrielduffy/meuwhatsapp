const express = require('express');
const router = express.Router();
const followupRepo = require('../repositorios/followup.repositorio');
const followupServico = require('../servicos/followup.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');

// Aplicar autenticação em todas as rotas
router.use(autenticarMiddleware);

// ==================== SEQUÊNCIAS ====================

/**
 * Listar sequências
 */
router.get('/sequencias', async (req, res) => {
  try {
    const { ativo } = req.query;
    const sequencias = await followupRepo.listar(req.empresaId, ativo);
    res.json(sequencias);
  } catch (erro) {
    console.error('Erro ao listar sequências:', erro);
    res.status(500).json({ erro: 'Erro ao listar sequências' });
  }
});

/**
 * Buscar sequência por ID
 */
router.get('/sequencias/:id', async (req, res) => {
  try {
    const sequencia = await followupRepo.buscarPorId(req.params.id, req.empresaId);
    if (!sequencia) {
      return res.status(404).json({ erro: 'Sequência não encontrada' });
    }
    res.json(sequencia);
  } catch (erro) {
    console.error('Erro ao buscar sequência:', erro);
    res.status(500).json({ erro: 'Erro ao buscar sequência' });
  }
});

/**
 * Criar sequência com etapas
 */
router.post('/sequencias', async (req, res) => {
  try {
    const sequencia = await followupServico.criarSequenciaComEtapas(req.empresaId, req.body);
    res.status(201).json({
      mensagem: 'Sequência criada com sucesso!',
      sequencia
    });
  } catch (erro) {
    console.error('Erro ao criar sequência:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Atualizar sequência
 */
router.put('/sequencias/:id', async (req, res) => {
  try {
    const { nome, descricao, gatilho_tipo, gatilho_config, instancia_id, usar_agente_ia, agente_id, horario_inicio, horario_fim, enviar_fim_semana } = req.body;

    const sequencia = await followupRepo.atualizar(req.params.id, req.empresaId, {
      nome,
      descricao,
      gatilhoTipo: gatilho_tipo,
      gatilhoConfig: gatilho_config,
      instanciaId: instancia_id,
      usarAgenteIa: usar_agente_ia,
      agenteId: agente_id,
      horarioInicio: horario_inicio,
      horarioFim: horario_fim,
      enviarFimSemana: enviar_fim_semana
    });

    if (!sequencia) {
      return res.status(404).json({ erro: 'Sequência não encontrada' });
    }

    res.json({
      mensagem: 'Sequência atualizada com sucesso!',
      sequencia
    });
  } catch (erro) {
    console.error('Erro ao atualizar sequência:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Ativar/Desativar sequência
 */
router.patch('/sequencias/:id/status', async (req, res) => {
  try {
    const { ativo } = req.body;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ erro: 'Campo "ativo" deve ser booleano' });
    }

    const sequencia = await followupRepo.alterarStatus(req.params.id, req.empresaId, ativo);

    if (!sequencia) {
      return res.status(404).json({ erro: 'Sequência não encontrada' });
    }

    res.json({
      mensagem: `Sequência ${ativo ? 'ativada' : 'desativada'} com sucesso!`,
      sequencia
    });
  } catch (erro) {
    console.error('Erro ao alterar status da sequência:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar sequência
 */
router.delete('/sequencias/:id', async (req, res) => {
  try {
    await followupRepo.deletar(req.params.id, req.empresaId);
    res.json({ mensagem: 'Sequência excluída com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar sequência:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Duplicar sequência
 */
router.post('/sequencias/:id/duplicar', async (req, res) => {
  try {
    const sequenciaOriginal = await followupRepo.buscarPorId(req.params.id, req.empresaId);
    if (!sequenciaOriginal) {
      return res.status(404).json({ erro: 'Sequência não encontrada' });
    }

    // Buscar etapas
    const etapas = await followupRepo.listarEtapasPorSequencia(req.params.id, req.empresaId);

    // Criar nova sequência
    const novaSequencia = await followupServico.criarSequenciaComEtapas(req.empresaId, {
      nome: `${sequenciaOriginal.nome} (Cópia)`,
      descricao: sequenciaOriginal.descricao,
      gatilho_tipo: sequenciaOriginal.gatilho_tipo,
      gatilho_config: sequenciaOriginal.gatilho_config,
      instancia_id: sequenciaOriginal.instancia_id,
      usar_agente_ia: sequenciaOriginal.usar_agente_ia,
      agente_id: sequenciaOriginal.agente_id,
      horario_inicio: sequenciaOriginal.horario_inicio,
      horario_fim: sequenciaOriginal.horario_fim,
      enviar_fim_semana: sequenciaOriginal.enviar_fim_semana,
      etapas: etapas.map(e => ({
        atraso: e.atraso,
        unidade_atraso: e.unidade_atraso,
        tipo: e.tipo,
        config: e.config
      }))
    });

    res.status(201).json({
      mensagem: 'Sequência duplicada com sucesso!',
      sequencia: novaSequencia
    });
  } catch (erro) {
    console.error('Erro ao duplicar sequência:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== ETAPAS ====================

/**
 * Listar etapas de uma sequência
 */
router.get('/sequencias/:sequenciaId/etapas', async (req, res) => {
  try {
    const etapas = await followupRepo.listarEtapasPorSequencia(req.params.sequenciaId, req.empresaId);
    res.json(etapas);
  } catch (erro) {
    console.error('Erro ao listar etapas:', erro);
    res.status(500).json({ erro: 'Erro ao listar etapas' });
  }
});

/**
 * Buscar etapa por ID
 */
router.get('/etapas/:id', async (req, res) => {
  try {
    const etapa = await followupRepo.buscarEtapaPorId(req.params.id, req.empresaId);
    if (!etapa) {
      return res.status(404).json({ erro: 'Etapa não encontrada' });
    }
    res.json(etapa);
  } catch (erro) {
    console.error('Erro ao buscar etapa:', erro);
    res.status(500).json({ erro: 'Erro ao buscar etapa' });
  }
});

/**
 * Criar etapa
 */
router.post('/sequencias/:sequenciaId/etapas', async (req, res) => {
  try {
    const { ordem, atraso, unidade_atraso, tipo, config } = req.body;

    const etapa = await followupRepo.criarEtapa({
      sequenciaId: req.params.sequenciaId,
      empresaId: req.empresaId,
      ordem,
      atraso,
      unidadeAtraso: unidade_atraso,
      tipo,
      config
    });

    res.status(201).json({
      mensagem: 'Etapa criada com sucesso!',
      etapa
    });
  } catch (erro) {
    console.error('Erro ao criar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Atualizar etapa
 */
router.put('/etapas/:id', async (req, res) => {
  try {
    const { ordem, atraso, unidade_atraso, tipo, config } = req.body;

    const etapa = await followupRepo.atualizarEtapa(req.params.id, req.empresaId, {
      ordem,
      atraso,
      unidadeAtraso: unidade_atraso,
      tipo,
      config
    });

    if (!etapa) {
      return res.status(404).json({ erro: 'Etapa não encontrada' });
    }

    res.json({
      mensagem: 'Etapa atualizada com sucesso!',
      etapa
    });
  } catch (erro) {
    console.error('Erro ao atualizar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar etapa
 */
router.delete('/etapas/:id', async (req, res) => {
  try {
    await followupRepo.deletarEtapa(req.params.id, req.empresaId);
    res.json({ mensagem: 'Etapa excluída com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== INSCRIÇÕES ====================

/**
 * Listar inscrições de uma sequência
 */
router.get('/sequencias/:sequenciaId/inscricoes', async (req, res) => {
  try {
    const { status } = req.query;
    const inscricoes = await followupRepo.listarInscricoesPorSequencia(req.params.sequenciaId, req.empresaId, status);
    res.json(inscricoes);
  } catch (erro) {
    console.error('Erro ao listar inscrições:', erro);
    res.status(500).json({ erro: 'Erro ao listar inscrições' });
  }
});

/**
 * Listar inscrições de um contato
 */
router.get('/contatos/:contatoId/inscricoes', async (req, res) => {
  try {
    const { status } = req.query;
    const inscricoes = await followupRepo.listarInscricoesPorContato(req.params.contatoId, req.empresaId, status);
    res.json(inscricoes);
  } catch (erro) {
    console.error('Erro ao listar inscrições do contato:', erro);
    res.status(500).json({ erro: 'Erro ao listar inscrições do contato' });
  }
});

/**
 * Buscar inscrição por ID
 */
router.get('/inscricoes/:id', async (req, res) => {
  try {
    const inscricao = await followupRepo.buscarInscricaoPorId(req.params.id, req.empresaId);
    if (!inscricao) {
      return res.status(404).json({ erro: 'Inscrição não encontrada' });
    }
    res.json(inscricao);
  } catch (erro) {
    console.error('Erro ao buscar inscrição:', erro);
    res.status(500).json({ erro: 'Erro ao buscar inscrição' });
  }
});

/**
 * Inscrever contato em sequência
 */
router.post('/sequencias/:sequenciaId/inscrever', async (req, res) => {
  try {
    const { contato_id, negociacao_id } = req.body;

    if (!contato_id) {
      return res.status(400).json({ erro: 'ID do contato é obrigatório' });
    }

    const inscricao = await followupServico.inscreverContatoEmSequencia(
      req.empresaId,
      req.params.sequenciaId,
      contato_id,
      { negociacaoId: negociacao_id }
    );

    res.status(201).json({
      mensagem: 'Contato inscrito com sucesso!',
      inscricao
    });
  } catch (erro) {
    console.error('Erro ao inscrever contato:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Inscrever múltiplos contatos
 */
router.post('/sequencias/:sequenciaId/inscrever-multiplos', async (req, res) => {
  try {
    const { contato_ids } = req.body;

    if (!Array.isArray(contato_ids) || contato_ids.length === 0) {
      return res.status(400).json({ erro: 'Lista de IDs de contatos inválida' });
    }

    const resultados = {
      sucesso: [],
      erros: []
    };

    for (const contatoId of contato_ids) {
      try {
        const inscricao = await followupServico.inscreverContatoEmSequencia(
          req.empresaId,
          req.params.sequenciaId,
          contatoId
        );
        resultados.sucesso.push({ contato_id: contatoId, inscricao_id: inscricao.id });
      } catch (erro) {
        resultados.erros.push({ contato_id: contatoId, erro: erro.message });
      }
    }

    res.json({
      mensagem: `${resultados.sucesso.length} contatos inscritos com sucesso!`,
      resultados
    });
  } catch (erro) {
    console.error('Erro ao inscrever múltiplos contatos:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Cancelar inscrição
 */
router.patch('/inscricoes/:id/cancelar', async (req, res) => {
  try {
    const { motivo } = req.body;

    const inscricao = await followupServico.cancelarInscricao(req.params.id, req.empresaId, motivo);

    res.json({
      mensagem: 'Inscrição cancelada com sucesso!',
      inscricao
    });
  } catch (erro) {
    console.error('Erro ao cancelar inscrição:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Reativar inscrição
 */
router.patch('/inscricoes/:id/reativar', async (req, res) => {
  try {
    const inscricao = await followupRepo.atualizarStatusInscricao(
      req.params.id,
      req.empresaId,
      'ativa',
      { etapa_atual_ordem: 1 }
    );

    if (!inscricao) {
      return res.status(404).json({ erro: 'Inscrição não encontrada' });
    }

    res.json({
      mensagem: 'Inscrição reativada com sucesso!',
      inscricao
    });
  } catch (erro) {
    console.error('Erro ao reativar inscrição:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar inscrição
 */
router.delete('/inscricoes/:id', async (req, res) => {
  try {
    await followupRepo.deletarInscricao(req.params.id, req.empresaId);
    res.json({ mensagem: 'Inscrição excluída com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar inscrição:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== EXECUÇÕES ====================

/**
 * Listar execuções de uma inscrição
 */
router.get('/inscricoes/:inscricaoId/execucoes', async (req, res) => {
  try {
    const execucoes = await followupRepo.listarExecucoesPorInscricao(req.params.inscricaoId, req.empresaId);
    res.json(execucoes);
  } catch (erro) {
    console.error('Erro ao listar execuções:', erro);
    res.status(500).json({ erro: 'Erro ao listar execuções' });
  }
});

/**
 * Executar etapa manualmente (forçar execução)
 */
router.post('/inscricoes/:id/executar', async (req, res) => {
  try {
    const resultado = await followupServico.executarEtapa(req.params.id, req.empresaId);

    if (!resultado) {
      return res.status(400).json({ erro: 'Não foi possível executar a etapa' });
    }

    res.json({
      mensagem: 'Etapa executada com sucesso!',
      resultado
    });
  } catch (erro) {
    console.error('Erro ao executar etapa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== ESTATÍSTICAS ====================

/**
 * Estatísticas de uma sequência
 */
router.get('/sequencias/:id/estatisticas', async (req, res) => {
  try {
    const sequencia = await followupRepo.buscarPorId(req.params.id, req.empresaId);
    if (!sequencia) {
      return res.status(404).json({ erro: 'Sequência não encontrada' });
    }

    const inscricoes = await followupRepo.listarInscricoesPorSequencia(req.params.id, req.empresaId);

    const estatisticas = {
      total_inscritos: sequencia.total_inscritos || 0,
      total_concluidos: sequencia.total_concluidos || 0,
      total_responderam: sequencia.total_responderam || 0,
      ativos: inscricoes.filter(i => i.status === 'ativa').length,
      cancelados: inscricoes.filter(i => i.status === 'cancelada').length,
      taxa_conclusao: sequencia.total_inscritos > 0
        ? ((sequencia.total_concluidos / sequencia.total_inscritos) * 100).toFixed(2) + '%'
        : '0%',
      taxa_resposta: sequencia.total_inscritos > 0
        ? ((sequencia.total_responderam / sequencia.total_inscritos) * 100).toFixed(2) + '%'
        : '0%'
    };

    res.json(estatisticas);
  } catch (erro) {
    console.error('Erro ao buscar estatísticas:', erro);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

/**
 * Estatísticas gerais de follow-up
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const sequencias = await followupRepo.listar(req.empresaId);
    const todasInscricoes = [];

    for (const sequencia of sequencias) {
      const inscricoes = await followupRepo.listarInscricoesPorSequencia(sequencia.id, req.empresaId);
      todasInscricoes.push(...inscricoes);
    }

    const estatisticas = {
      total_sequencias: sequencias.length,
      sequencias_ativas: sequencias.filter(s => s.ativo).length,
      total_inscricoes: todasInscricoes.length,
      inscricoes_ativas: todasInscricoes.filter(i => i.status === 'ativa').length,
      inscricoes_concluidas: todasInscricoes.filter(i => i.status === 'concluida').length,
      inscricoes_canceladas: todasInscricoes.filter(i => i.status === 'cancelada').length
    };

    res.json(estatisticas);
  } catch (erro) {
    console.error('Erro ao buscar estatísticas gerais:', erro);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas gerais' });
  }
});

// ==================== TESTE ====================

/**
 * Testar substituição de variáveis
 */
router.post('/testar-variaveis', async (req, res) => {
  try {
    const { template, contato_id } = req.body;

    if (!template || !contato_id) {
      return res.status(400).json({ erro: 'Template e ID do contato são obrigatórios' });
    }

    const contatoRepo = require('../repositorios/contato.repositorio');
    const empresaRepo = require('../repositorios/empresa.repositorio');

    const contato = await contatoRepo.buscarPorId(contato_id, req.empresaId);
    const empresa = await empresaRepo.buscarPorId(req.empresaId);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    const resultado = followupServico.substituirVariaveis(template, contato, empresa);

    res.json({
      template_original: template,
      template_processado: resultado
    });
  } catch (erro) {
    console.error('Erro ao testar variáveis:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
