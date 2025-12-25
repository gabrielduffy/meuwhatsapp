const Queue = require('bull');
const prospeccaoRepo = require('../repositorios/prospeccao.repositorio');
const contatoRepo = require('../repositorios/contato.repositorio');
const empresaRepositorio = require('../repositorios/empresa.repositorio');
const { debitarCreditos } = require('../middlewares/creditos');

// Criar fila de prospecção
const filaProspeccao = new Queue('prospeccao', process.env.URL_REDIS || 'redis://localhost:6379');

/**
 * Serviço de Prospecção
 */

// =====================================================
// CAMPANHAS
// =====================================================

/**
 * Criar campanha
 */
async function criarCampanha(empresaId, dados) {
  // Validar dados
  if (!dados.nome || !dados.instanciaId || !dados.mensagemModelo) {
    throw new Error('Nome, instância e mensagem modelo são obrigatórios');
  }

  // Criar campanha
  const campanha = await prospeccaoRepo.criarCampanha({
    empresaId,
    ...dados
  });

  return campanha;
}

/**
 * Importar leads de CSV
 */
async function importarLeads(empresaId, campanhaId, leads) {
  // Buscar campanha
  const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

  if (!campanha) {
    throw new Error('Campanha não encontrada');
  }

  if (campanha.status !== 'rascunho') {
    throw new Error('Só é possível importar leads para campanhas em rascunho');
  }

  // Criar importação
  const importacao = await prospeccaoRepo.criarImportacao({
    campanhaId,
    empresaId,
    nomeArquivo: leads.nomeArquivo || 'importacao.csv',
    totalLinhas: leads.dados.length
  });

  try {
    // Atualizar status para processando
    await prospeccaoRepo.atualizarImportacao(importacao.id, {
      status: 'processando'
    });

    // Processar leads
    const leadsParaInserir = [];
    let linhasProcessadas = 0;
    let linhasImportadas = 0;
    let linhasIgnoradas = 0;

    for (const leadData of leads.dados) {
      linhasProcessadas++;

      // Validar telefone
      if (!leadData.telefone) {
        linhasIgnoradas++;
        continue;
      }

      // Limpar telefone
      const telefoneLimpo = leadData.telefone.replace(/\D/g, '');

      if (telefoneLimpo.length < 10) {
        linhasIgnoradas++;
        continue;
      }

      // Criar ou buscar contato
      let contato = await contatoRepo.buscarPorTelefone(telefoneLimpo, empresaId);

      if (!contato && leadData.nome) {
        contato = await contatoRepo.criar({
          empresaId,
          nome: leadData.nome,
          telefone: telefoneLimpo,
          email: leadData.email || null,
          empresa: leadData.empresa || null,
          tags: ['prospeccao']
        });
      }

      // Adicionar lead
      leadsParaInserir.push({
        campanhaId,
        empresaId,
        contatoId: contato?.id || null,
        nome: leadData.nome || 'Sem nome',
        telefone: telefoneLimpo,
        variaveis: leadData.variaveis || {},
        agendarPara: leadData.agendarPara || null
      });

      linhasImportadas++;
    }

    // Inserir leads em lote
    if (leadsParaInserir.length > 0) {
      await prospeccaoRepo.criarLeadsEmLote(leadsParaInserir);
    }

    // Atualizar campanha com total de leads
    await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'total_leads', linhasImportadas);

    // Finalizar importação
    await prospeccaoRepo.atualizarImportacao(importacao.id, {
      status: 'concluida',
      linhasProcessadas,
      linhasImportadas,
      linhasIgnoradas
    });

    return {
      importacao_id: importacao.id,
      total_processadas: linhasProcessadas,
      total_importadas: linhasImportadas,
      total_ignoradas: linhasIgnoradas
    };
  } catch (erro) {
    // Marcar importação como falhada
    await prospeccaoRepo.atualizarImportacao(importacao.id, {
      status: 'falhada',
      mensagemErro: erro.message
    });

    throw erro;
  }
}

/**
 * Iniciar campanha
 */
async function iniciarCampanha(empresaId, campanhaId) {
  // Buscar campanha
  const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

  if (!campanha) {
    throw new Error('Campanha não encontrada');
  }

  if (campanha.status !== 'rascunho' && campanha.status !== 'pausada') {
    throw new Error('Campanha não pode ser iniciada neste status');
  }

  if (campanha.total_leads === 0) {
    throw new Error('Campanha sem leads. Importe leads antes de iniciar');
  }

  // Verificar créditos (1 crédito por lead)
  const empresa = await empresaRepositorio.buscarPorId(empresaId);
  const leadsRestantes = campanha.total_leads - campanha.leads_enviados;

  if (empresa.saldo_creditos < leadsRestantes) {
    throw new Error(`Créditos insuficientes. Necessário ${leadsRestantes} créditos para enviar todos os leads`);
  }

  // Atualizar status para em_andamento
  await prospeccaoRepo.atualizarStatusCampanha(campanhaId, empresaId, 'em_andamento');

  // Adicionar job na fila
  await filaProspeccao.add('processar-campanha', {
    empresaId,
    campanhaId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  });

  return {
    mensagem: 'Campanha iniciada com sucesso',
    total_leads: campanha.total_leads,
    status: 'em_andamento'
  };
}

/**
 * Pausar campanha
 */
async function pausarCampanha(empresaId, campanhaId) {
  const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

  if (!campanha) {
    throw new Error('Campanha não encontrada');
  }

  if (campanha.status !== 'em_andamento') {
    throw new Error('Apenas campanhas em andamento podem ser pausadas');
  }

  await prospeccaoRepo.atualizarStatusCampanha(campanhaId, empresaId, 'pausada');

  return { mensagem: 'Campanha pausada' };
}

/**
 * Cancelar campanha
 */
async function cancelarCampanha(empresaId, campanhaId) {
  const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

  if (!campanha) {
    throw new Error('Campanha não encontrada');
  }

  if (campanha.status === 'concluida' || campanha.status === 'cancelada') {
    throw new Error('Campanha já foi finalizada');
  }

  await prospeccaoRepo.atualizarStatusCampanha(campanhaId, empresaId, 'cancelada');

  return { mensagem: 'Campanha cancelada' };
}

/**
 * Obter estatísticas da campanha
 */
async function obterEstatisticas(empresaId, campanhaId) {
  const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

  if (!campanha) {
    throw new Error('Campanha não encontrada');
  }

  // Calcular taxas
  const taxaEntrega = campanha.leads_enviados > 0
    ? ((campanha.leads_entregues / campanha.leads_enviados) * 100).toFixed(2)
    : 0;

  const taxaLeitura = campanha.leads_entregues > 0
    ? ((campanha.leads_lidos / campanha.leads_entregues) * 100).toFixed(2)
    : 0;

  const taxaResposta = campanha.leads_enviados > 0
    ? ((campanha.leads_respondidos / campanha.leads_enviados) * 100).toFixed(2)
    : 0;

  const taxaFalha = campanha.leads_enviados > 0
    ? ((campanha.leads_falhados / campanha.leads_enviados) * 100).toFixed(2)
    : 0;

  return {
    campanha: {
      id: campanha.id,
      nome: campanha.nome,
      status: campanha.status,
      criada_em: campanha.criado_em,
      iniciada_em: campanha.iniciada_em,
      finalizada_em: campanha.finalizada_em
    },
    leads: {
      total: campanha.total_leads,
      enviados: campanha.leads_enviados,
      entregues: campanha.leads_entregues,
      lidos: campanha.leads_lidos,
      respondidos: campanha.leads_respondidos,
      falhados: campanha.leads_falhados,
      pendentes: campanha.total_leads - campanha.leads_enviados
    },
    taxas: {
      entrega: `${taxaEntrega}%`,
      leitura: `${taxaLeitura}%`,
      resposta: `${taxaResposta}%`,
      falha: `${taxaFalha}%`
    }
  };
}

// =====================================================
// PROCESSAMENTO DA FILA
// =====================================================

/**
 * Processar campanha (worker da fila)
 */
filaProspeccao.process('processar-campanha', async (job) => {
  const { empresaId, campanhaId } = job.data;

  console.log(`[Prospecção] Processando campanha ${campanhaId}`);

  try {
    // Buscar campanha
    const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId, empresaId);

    if (!campanha || campanha.status !== 'em_andamento') {
      console.log('[Prospecção] Campanha não está mais em andamento');
      return;
    }

    // Buscar próximos leads
    const leads = await prospeccaoRepo.buscarProximosLeads(campanhaId, 10);

    if (leads.length === 0) {
      // Concluir campanha
      await prospeccaoRepo.atualizarStatusCampanha(campanhaId, empresaId, 'concluida');
      console.log('[Prospecção] Campanha concluída');
      return;
    }

    // Processar cada lead
    for (const lead of leads) {
      await processarLead(empresaId, campanhaId, lead);

      // Aguardar intervalo entre mensagens
      const intervalo = gerarIntervaloAleatorio(
        campanha.intervalo_min * 1000,
        campanha.intervalo_max * 1000
      );

      await sleep(intervalo);
    }

    // Adicionar próximo job na fila
    await filaProspeccao.add('processar-campanha', {
      empresaId,
      campanhaId
    }, {
      delay: 5000 // 5 segundos entre lotes
    });

  } catch (erro) {
    console.error('[Prospecção] Erro ao processar campanha:', erro);
    throw erro;
  }
});

/**
 * Processar lead individual
 */
async function processarLead(empresaId, campanhaId, lead) {
  try {
    // Marcar como enviando
    await prospeccaoRepo.atualizarStatusLead(lead.id, 'enviando');

    // Buscar campanha para pegar mensagem modelo
    const campanha = await prospeccaoRepo.buscarCampanhaPorId(campanhaId);

    // Substituir variáveis na mensagem
    let mensagem = campanha.mensagem_modelo;

    // Variáveis padrão
    mensagem = mensagem.replace(/\{\{nome\}\}/g, lead.nome);
    mensagem = mensagem.replace(/\{\{telefone\}\}/g, lead.telefone);

    // Variáveis customizadas
    if (lead.variaveis) {
      for (const [chave, valor] of Object.entries(lead.variaveis)) {
        const regex = new RegExp(`\\{\\{${chave}\\}\\}`, 'g');
        mensagem = mensagem.replace(regex, valor);
      }
    }

    // Aqui você chamaria a API do WhatsApp para enviar a mensagem
    // Por enquanto, vamos simular o envio
    const resultado = await enviarMensagemWhatsApp(campanha.instancia_id, lead.telefone, mensagem);

    if (resultado.sucesso) {
      // Marcar como enviado
      await prospeccaoRepo.atualizarStatusLead(lead.id, 'enviado', {
        whatsappMensagemId: resultado.mensagemId
      });

      // Incrementar contador
      await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'leads_enviados');

      // Debitar crédito (1 por mensagem)
      await debitarCreditos(
        empresaId,
        1,
        `Prospecção: ${campanha.nome}`,
        'prospeccao',
        campanhaId
      );

      console.log(`[Prospecção] Lead ${lead.id} enviado com sucesso`);
    } else {
      // Marcar como falhado
      await prospeccaoRepo.atualizarStatusLead(lead.id, 'falhado', {
        mensagemErro: resultado.erro,
        incrementarTentativas: true
      });

      // Incrementar contador de falhas
      await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'leads_falhados');

      console.error(`[Prospecção] Falha ao enviar lead ${lead.id}:`, resultado.erro);
    }

  } catch (erro) {
    console.error(`[Prospecção] Erro ao processar lead ${lead.id}:`, erro);

    // Marcar como falhado
    await prospeccaoRepo.atualizarStatusLead(lead.id, 'falhado', {
      mensagemErro: erro.message,
      incrementarTentativas: true
    });

    await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'leads_falhados');
  }
}

/**
 * Enviar mensagem WhatsApp (placeholder - integrar com API real)
 */
async function enviarMensagemWhatsApp(instanciaId, telefone, mensagem) {
  // TODO: Integrar com a API do WhatsApp existente
  // Por enquanto, retornar sucesso simulado

  return {
    sucesso: true,
    mensagemId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Gerar intervalo aleatório
 */
function gerarIntervaloAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  criarCampanha,
  importarLeads,
  iniciarCampanha,
  pausarCampanha,
  cancelarCampanha,
  obterEstatisticas,
  filaProspeccao
};
