const crmRepo = require('../repositorios/crm.repositorio');
const contatoRepo = require('../repositorios/contato.repositorio');

/**
 * Serviço de CRM Kanban
 */

// =====================================================
// FUNIS
// =====================================================

/**
 * Criar funil com etapas padrão
 */
async function criarFunilComEtapas(empresaId, dados) {
  // Criar funil
  const funil = await crmRepo.criarFunil({
    empresaId,
    ...dados
  });

  // Criar etapas padrão se não fornecidas
  if (!dados.etapas || dados.etapas.length === 0) {
    const etapasPadrao = [
      { nome: 'Novo Lead', cor: '#10B981', ordem: 0 },
      { nome: 'Qualificação', cor: '#3B82F6', ordem: 1 },
      { nome: 'Proposta', cor: '#F59E0B', ordem: 2 },
      { nome: 'Negociação', cor: '#EF4444', ordem: 3 },
      { nome: 'Fechamento', cor: '#8B5CF6', ordem: 4 }
    ];

    for (const etapa of etapasPadrao) {
      await crmRepo.criarEtapa({
        funilId: funil.id,
        empresaId,
        ...etapa
      });
    }
  } else {
    // Criar etapas personalizadas
    for (const etapa of dados.etapas) {
      await crmRepo.criarEtapa({
        funilId: funil.id,
        empresaId,
        ...etapa
      });
    }
  }

  return funil;
}

/**
 * Obter funil com etapas e negociações
 */
async function obterFunilCompleto(empresaId, funilId) {
  const funil = await crmRepo.buscarFunilPorId(funilId, empresaId);

  if (!funil) {
    throw new Error('Funil não encontrado');
  }

  // Buscar etapas
  const etapas = await crmRepo.listarEtapas(funilId, empresaId);

  // Buscar negociações de cada etapa
  for (const etapa of etapas) {
    const negociacoes = await crmRepo.listarNegociacoes(empresaId, {
      funilId,
      etapaId: etapa.id,
      status: 'aberta'
    });

    etapa.negociacoes = negociacoes;
  }

  funil.etapas = etapas;

  return funil;
}

/**
 * Reordenar etapas do funil
 */
async function reordenarEtapas(empresaId, funilId, ordem) {
  // ordem: [{ id: 'uuid', ordem: 0 }, { id: 'uuid', ordem: 1 }]

  for (const item of ordem) {
    await crmRepo.atualizarEtapa(item.id, empresaId, { ordem: item.ordem });
  }

  return { mensagem: 'Etapas reordenadas com sucesso' };
}

/**
 * Deletar funil (verifica se tem negociações)
 */
async function deletarFunilSeguro(empresaId, funilId) {
  const negociacoes = await crmRepo.listarNegociacoes(empresaId, {
    funilId,
    status: 'aberta'
  });

  if (negociacoes.length > 0) {
    throw new Error('Não é possível deletar funil com negociações abertas');
  }

  return await crmRepo.deletarFunil(funilId, empresaId);
}

// =====================================================
// NEGOCIAÇÕES
// =====================================================

/**
 * Criar negociação a partir do chat
 */
async function criarNegociacaoDoChat(empresaId, dados) {
  const { conversaId, contatoId, titulo, valor, funilId, responsavelId } = dados;

  // Buscar primeira etapa do funil
  const etapas = await crmRepo.listarEtapas(funilId, empresaId);

  if (etapas.length === 0) {
    throw new Error('Funil não possui etapas');
  }

  const primeiraEtapa = etapas[0];

  // Criar negociação
  const negociacao = await crmRepo.criarNegociacao({
    empresaId,
    funilId,
    etapaId: primeiraEtapa.id,
    contatoId,
    titulo: titulo || `Negociação com ${contatoId}`,
    valor: valor || 0,
    responsavelId,
    origem: 'chat',
    origemId: conversaId
  });

  // Executar ações da etapa
  await executarAcoesEtapa(primeiraEtapa, negociacao, empresaId);

  return negociacao;
}

/**
 * Criar negociação a partir da prospecção
 */
async function criarNegociacaoDaProspeccao(empresaId, dados) {
  const { campanhaId, leadId, contatoId, titulo, valor, funilId } = dados;

  // Buscar primeira etapa do funil
  const etapas = await crmRepo.listarEtapas(funilId, empresaId);

  if (etapas.length === 0) {
    throw new Error('Funil não possui etapas');
  }

  const primeiraEtapa = etapas[0];

  // Criar negociação
  const negociacao = await crmRepo.criarNegociacao({
    empresaId,
    funilId,
    etapaId: primeiraEtapa.id,
    contatoId,
    titulo: titulo || `Lead da campanha`,
    valor: valor || 0,
    origem: 'prospeccao',
    origemId: leadId || campanhaId
  });

  // Executar ações da etapa
  await executarAcoesEtapa(primeiraEtapa, negociacao, empresaId);

  return negociacao;
}

/**
 * Executar ações automáticas da etapa
 */
async function executarAcoesEtapa(etapa, negociacao, empresaId) {
  const acoes = etapa.ao_entrar || {};

  // Criar tarefa automática
  if (acoes.criar_tarefa && acoes.tarefa_descricao) {
    await crmRepo.criarTarefa({
      negociacaoId: negociacao.id,
      empresaId,
      titulo: acoes.tarefa_descricao,
      responsavelId: negociacao.responsavel_id
    });
  }

  // TODO: Implementar outras ações
  // - enviar_mensagem
  // - notificar_responsavel
}

/**
 * Analisar mensagem do chat para movimentação automática por IA
 */
async function analisarMovimentacaoIA(empresaId, mensagem, negociacaoId = null) {
  // Se não há negociação ID, buscar por contato
  if (!negociacaoId && mensagem.contato_id) {
    const negociacoes = await crmRepo.listarNegociacoes(empresaId, {
      contatoId: mensagem.contato_id,
      status: 'aberta'
    });

    if (negociacoes.length === 0) {
      return null; // Sem negociação para mover
    }

    negociacaoId = negociacoes[0].id;
  }

  if (!negociacaoId) {
    return null;
  }

  // Buscar negociação
  const negociacao = await crmRepo.buscarNegociacaoPorId(negociacaoId, empresaId);

  if (!negociacao || negociacao.status !== 'aberta') {
    return null;
  }

  // Buscar funil
  const funil = await crmRepo.buscarFunilPorId(negociacao.funil_id, empresaId);

  if (!funil || !funil.movimentacao_automatica) {
    return null; // Movimentação automática desativada
  }

  // Analisar gatilhos
  const configIA = funil.config_ia || {};
  const gatilhos = configIA.gatilhos || [];

  const conteudo = mensagem.conteudo?.toLowerCase() || '';

  for (const gatilho of gatilhos) {
    const palavra = gatilho.palavra?.toLowerCase() || '';

    if (conteudo.includes(palavra)) {
      // Mover negociação
      await crmRepo.moverNegociacao(negociacaoId, empresaId, gatilho.mover_para, {
        automatico: true,
        motivo: `Palavra-chave detectada: "${gatilho.palavra}"`
      });

      // Buscar nova etapa
      const novaEtapa = await crmRepo.buscarEtapaPorId(gatilho.mover_para, empresaId);

      // Executar ações da nova etapa
      if (novaEtapa) {
        await executarAcoesEtapa(novaEtapa, negociacao, empresaId);
      }

      return {
        movida: true,
        de_etapa: negociacao.etapa_nome,
        para_etapa: novaEtapa?.nome,
        gatilho: gatilho.palavra
      };
    }
  }

  return null;
}

/**
 * Mover negociação com validações
 */
async function moverNegociacaoComValidacao(empresaId, negociacaoId, novaEtapaId, usuarioId) {
  // Validar que a etapa pertence ao mesmo funil
  const negociacao = await crmRepo.buscarNegociacaoPorId(negociacaoId, empresaId);

  if (!negociacao) {
    throw new Error('Negociação não encontrada');
  }

  if (negociacao.status !== 'aberta') {
    throw new Error('Só é possível mover negociações abertas');
  }

  const novaEtapa = await crmRepo.buscarEtapaPorId(novaEtapaId, empresaId);

  if (!novaEtapa) {
    throw new Error('Etapa não encontrada');
  }

  if (novaEtapa.funil_id !== negociacao.funil_id) {
    throw new Error('A etapa não pertence ao mesmo funil');
  }

  // Mover
  const resultado = await crmRepo.moverNegociacao(negociacaoId, empresaId, novaEtapaId, {
    usuarioId,
    automatico: false
  });

  // Executar ações da nova etapa
  await executarAcoesEtapa(novaEtapa, negociacao, empresaId);

  return resultado;
}

/**
 * Verificar negociações atrasadas
 */
async function verificarNegociacoesAtrasadas(empresaId) {
  const negociacoes = await crmRepo.listarNegociacoes(empresaId, {
    status: 'aberta'
  });

  const atrasadas = [];

  for (const negociacao of negociacoes) {
    // Buscar etapa
    const etapa = await crmRepo.buscarEtapaPorId(negociacao.etapa_id, empresaId);

    if (etapa && etapa.limite_dias) {
      const diasNaEtapa = Math.floor(
        (Date.now() - new Date(negociacao.entrou_etapa_em).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasNaEtapa > etapa.limite_dias) {
        atrasadas.push({
          ...negociacao,
          dias_atrasada: diasNaEtapa - etapa.limite_dias,
          limite_etapa: etapa.limite_dias
        });
      }
    }
  }

  return atrasadas;
}

/**
 * Obter estatísticas detalhadas
 */
async function obterEstatisticasDetalhadas(empresaId, filtros = {}) {
  const stats = await crmRepo.obterEstatisticasCRM(empresaId, filtros);

  // Calcular taxas
  const totalNegociacoes = parseInt(stats.total_abertas) + parseInt(stats.total_ganhas) + parseInt(stats.total_perdidas);
  const taxaConversao = totalNegociacoes > 0 ? ((parseInt(stats.total_ganhas) / totalNegociacoes) * 100).toFixed(2) : 0;
  const taxaPerda = totalNegociacoes > 0 ? ((parseInt(stats.total_perdidas) / totalNegociacoes) * 100).toFixed(2) : 0;

  return {
    resumo: {
      total_abertas: parseInt(stats.total_abertas),
      total_ganhas: parseInt(stats.total_ganhas),
      total_perdidas: parseInt(stats.total_perdidas),
      total_geral: totalNegociacoes
    },
    valores: {
      aberto: parseFloat(stats.valor_aberto),
      ganho: parseFloat(stats.valor_ganho),
      perdido: parseFloat(stats.valor_perdido),
      total: parseFloat(stats.valor_aberto) + parseFloat(stats.valor_ganho) + parseFloat(stats.valor_perdido)
    },
    taxas: {
      conversao: `${taxaConversao}%`,
      perda: `${taxaPerda}%`
    }
  };
}

/**
 * Gerar relatório do funil (conversão por etapa)
 */
async function gerarRelatorioFunil(empresaId, funilId) {
  const funil = await crmRepo.buscarFunilPorId(funilId, empresaId);

  if (!funil) {
    throw new Error('Funil não encontrado');
  }

  const etapas = await crmRepo.listarEtapas(funilId, empresaId);

  const relatorio = {
    funil: funil.nome,
    etapas: []
  };

  for (const etapa of etapas) {
    const negociacoes = await crmRepo.listarNegociacoes(empresaId, {
      funilId,
      etapaId: etapa.id,
      status: 'aberta'
    });

    relatorio.etapas.push({
      nome: etapa.nome,
      total_negocios: negociacoes.length,
      valor_total: negociacoes.reduce((sum, n) => sum + parseFloat(n.valor || 0), 0),
      ticket_medio: negociacoes.length > 0 ? (negociacoes.reduce((sum, n) => sum + parseFloat(n.valor || 0), 0) / negociacoes.length).toFixed(2) : 0
    });
  }

  // Calcular taxa de conversão entre etapas
  for (let i = 0; i < relatorio.etapas.length - 1; i++) {
    const etapaAtual = relatorio.etapas[i];
    const proximaEtapa = relatorio.etapas[i + 1];

    if (etapaAtual.total_negocios > 0) {
      etapaAtual.taxa_conversao = ((proximaEtapa.total_negocios / etapaAtual.total_negocios) * 100).toFixed(2) + '%';
    } else {
      etapaAtual.taxa_conversao = 'N/A';
    }
  }

  return relatorio;
}

module.exports = {
  // Funis
  criarFunilComEtapas,
  obterFunilCompleto,
  reordenarEtapas,
  deletarFunilSeguro,

  // Negociações
  criarNegociacaoDoChat,
  criarNegociacaoDaProspeccao,
  moverNegociacaoComValidacao,
  analisarMovimentacaoIA,
  verificarNegociacoesAtrasadas,

  // Estatísticas
  obterEstatisticasDetalhadas,
  gerarRelatorioFunil
};
