const chatRepo = require('../repositorios/chat.repositorio');
const contatoRepo = require('../repositorios/contato.repositorio');

/**
 * Serviço de Chat Interno
 */

// Socket.io instance (será configurado no index.js)
let io = null;

/**
 * Configurar Socket.io
 */
function configurarSocketIO(socketIO) {
  io = socketIO;
  console.log('[Chat] Socket.io configurado');
}

/**
 * Emitir evento para empresa específica
 */
function emitirParaEmpresa(empresaId, evento, dados) {
  if (io) {
    io.to(`empresa:${empresaId}`).emit(evento, dados);
  }
}

/**
 * Emitir evento para conversa específica
 */
function emitirParaConversa(conversaId, evento, dados) {
  if (io) {
    io.to(`conversa:${conversaId}`).emit(evento, dados);
  }
}

// =====================================================
// CONVERSAS
// =====================================================

/**
 * Criar ou buscar conversa
 */
async function criarOuBuscarConversa(empresaId, instanciaId, contatoId) {
  // Buscar conversa aberta existente
  let conversa = await chatRepo.buscarConversaPorContato(contatoId, empresaId, 'aberta');

  if (!conversa) {
    // Criar nova conversa
    conversa = await chatRepo.criarConversa({
      empresaId,
      instanciaId,
      contatoId,
      status: 'aberta'
    });

    // Emitir evento de nova conversa
    emitirParaEmpresa(empresaId, 'nova_conversa', {
      conversa
    });
  }

  return conversa;
}

/**
 * Listar conversas
 */
async function listarConversas(empresaId, filtros = {}) {
  return await chatRepo.listarConversas(empresaId, filtros);
}

/**
 * Buscar conversa por ID
 */
async function buscarConversa(empresaId, conversaId) {
  const conversa = await chatRepo.buscarConversaPorId(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  return conversa;
}

/**
 * Atribuir conversa a usuário
 */
async function atribuirConversa(empresaId, conversaId, usuarioId, departamento = null) {
  const conversa = await chatRepo.atribuirConversa(conversaId, empresaId, usuarioId, departamento);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  // Emitir evento
  emitirParaEmpresa(empresaId, 'conversa_atribuida', {
    conversa_id: conversaId,
    atribuido_para: usuarioId,
    departamento
  });

  return conversa;
}

/**
 * Fechar conversa
 */
async function fecharConversa(empresaId, conversaId) {
  const conversa = await chatRepo.fecharConversa(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  // Emitir evento
  emitirParaEmpresa(empresaId, 'conversa_fechada', {
    conversa_id: conversaId
  });

  return conversa;
}

/**
 * Reabrir conversa
 */
async function reabrirConversa(empresaId, conversaId) {
  const conversa = await chatRepo.reabrirConversa(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  // Emitir evento
  emitirParaEmpresa(empresaId, 'conversa_reaberta', {
    conversa_id: conversaId
  });

  return conversa;
}

/**
 * Marcar conversa como lida
 */
async function marcarComoLida(empresaId, conversaId) {
  const conversa = await chatRepo.marcarComoLida(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  // Emitir evento
  emitirParaConversa(conversaId, 'conversa_lida', {
    conversa_id: conversaId
  });

  return conversa;
}

// =====================================================
// MENSAGENS
// =====================================================

/**
 * Enviar mensagem (do atendente para o contato)
 */
async function enviarMensagem(empresaId, conversaId, remetenteId, dados) {
  const { tipoMensagem, conteudo, midiaUrl, midiaTipo, midiaNomeArquivo } = dados;

  // Verificar se conversa existe
  const conversa = await chatRepo.buscarConversaPorId(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  // Criar mensagem
  const mensagem = await chatRepo.criarMensagem({
    conversaId,
    empresaId,
    direcao: 'enviada',
    remetenteId,
    tipoRemetente: 'atendente',
    tipoMensagem,
    conteudo,
    midiaUrl,
    midiaTipo,
    midiaNomeArquivo,
    status: 'enviada'
  });

  // Buscar contato para obter telefone (assumindo que conversa tem contato_id)
  const contato = await contatoRepo.buscarPorId(conversa.contato_id, empresaId);
  if (!contato) throw new Error('Contato não encontrado');

  // Enviar via WhatsApp (Lazy load para evitar ciclo)
  const whatsappService = require('../services/whatsapp');

  // Buscar nome da instância (O banco tem instancia_id que na vdd é o nome, segundo o schema comment)
  // Se estiver nulo, usar a primeira instância disponível ou falhar. 
  // Assumindo que conversa.instancia_id guarda o NOME da instância (confuso no schema, mas vamos tentar usar como string)
  const instanceName = conversa.instancia_id;

  let resultadoEnvio;
  try {
    if (tipoMensagem === 'imagem' && midiaUrl) {
      resultadoEnvio = await whatsappService.sendImage(instanceName, contato.telefone, midiaUrl, conteudo);
    } else if (tipoMensagem === 'audio' && midiaUrl) {
      resultadoEnvio = await whatsappService.sendAudio(instanceName, contato.telefone, midiaUrl);
    } else {
      resultadoEnvio = await whatsappService.sendText(instanceName, contato.telefone, conteudo);
    }

    // Atualizar ID da mensagem com o do WhatsApp
    if (resultadoEnvio && resultadoEnvio.messageId) {
      await chatRepo.atualizarWhatsAppId(mensagem.id, resultadoEnvio.messageId);
      mensagem.whatsapp_mensagem_id = resultadoEnvio.messageId;
    }
  } catch (err) {
    console.error('Erro ao enviar para WhatsApp:', err);
    // Atualizar status para erro
    await chatRepo.atualizarStatusMensagem(mensagem.id, 'erro');
    mensagem.status = 'erro';
    // Não damos throw para não quebrar o fluxo da UI, mas o status mostra erro
  }

  // Emitir evento em tempo real
  emitirParaConversa(conversaId, 'nova_mensagem', {
    mensagem
  });

  emitirParaEmpresa(empresaId, 'mensagem_enviada', {
    conversa_id: conversaId,
    mensagem
  });

  return mensagem;
}

/**
 * Receber mensagem (do contato para o atendente)
 * Esta função seria chamada pelo webhook do WhatsApp
 */
async function receberMensagem(empresaId, instanciaId, dadosMensagem) {
  const {
    contatoTelefone,
    contatoNome,
    whatsappMensagemId,
    tipoMensagem,
    conteudo,
    midiaUrl,
    midiaTipo,
    midiaNomeArquivo,
    metadados
  } = dadosMensagem;

  // Criar ou buscar contato
  let contato = await contatoRepo.buscarPorTelefone(contatoTelefone, empresaId);

  if (!contato) {
    contato = await contatoRepo.criar({
      empresaId,
      nome: contatoNome || 'Desconhecido',
      telefone: contatoTelefone,
      tags: ['chat']
    });
  }

  // Registrar interação
  await contatoRepo.registrarInteracao(contato.id, empresaId, 'mensagem');

  // Criar ou buscar conversa
  const conversa = await criarOuBuscarConversa(empresaId, instanciaId, contato.id);

  // Criar mensagem
  const mensagem = await chatRepo.criarMensagem({
    conversaId: conversa.id,
    empresaId,
    whatsappMensagemId,
    direcao: 'recebida',
    tipoMensagem,
    conteudo,
    midiaUrl,
    midiaTipo,
    midiaNomeArquivo,
    status: 'recebida',
    metadados
  });

  // Emitir evento em tempo real
  emitirParaConversa(conversa.id, 'nova_mensagem', {
    mensagem
  });

  emitirParaEmpresa(empresaId, 'mensagem_recebida', {
    conversa_id: conversa.id,
    mensagem,
    contato
  });

  return {
    conversa,
    mensagem,
    contato
  };
}

/**
 * Listar mensagens da conversa
 */
async function listarMensagens(empresaId, conversaId, filtros = {}) {
  // Verificar se conversa existe e pertence à empresa
  const conversa = await chatRepo.buscarConversaPorId(conversaId, empresaId);

  if (!conversa) {
    throw new Error('Conversa não encontrada');
  }

  return await chatRepo.listarMensagens(conversaId, empresaId, filtros);
}

/**
 * Deletar mensagem
 */
async function deletarMensagem(empresaId, mensagemId) {
  const mensagem = await chatRepo.deletarMensagem(mensagemId, empresaId);

  if (!mensagem) {
    throw new Error('Mensagem não encontrada');
  }

  // Emitir evento
  emitirParaConversa(mensagem.conversa_id, 'mensagem_deletada', {
    mensagem_id: mensagemId
  });

  return mensagem;
}

/**
 * Atualizar status da mensagem do WhatsApp
 * Chamado pelos webhooks de status (enviada, entregue, lida)
 */
async function atualizarStatusMensagem(empresaId, whatsappMensagemId, novoStatus) {
  const mensagem = await chatRepo.buscarMensagemPorWhatsAppId(whatsappMensagemId, empresaId);

  if (!mensagem) {
    console.log('[Chat] Mensagem não encontrada:', whatsappMensagemId);
    return null;
  }

  const mensagemAtualizada = await chatRepo.atualizarStatusMensagem(mensagem.id, novoStatus);

  // Emitir evento
  emitirParaConversa(mensagem.conversa_id, 'status_mensagem_atualizado', {
    mensagem_id: mensagem.id,
    whatsapp_mensagem_id: whatsappMensagemId,
    status: novoStatus
  });

  return mensagemAtualizada;
}

// =====================================================
// ESTATÍSTICAS
// =====================================================

/**
 * Obter estatísticas do chat
 */
async function obterEstatisticas(empresaId, filtros = {}) {
  const conversas = await chatRepo.listarConversas(empresaId, filtros);

  const estatisticas = {
    total_conversas: conversas.length,
    conversas_abertas: conversas.filter(c => c.status === 'aberta').length,
    conversas_fechadas: conversas.filter(c => c.status === 'fechada').length,
    conversas_com_nao_lidas: conversas.filter(c => c.nao_lidas > 0).length,
    total_nao_lidas: conversas.reduce((sum, c) => sum + (c.nao_lidas || 0), 0)
  };

  return estatisticas;
}

/**
 * Obter métricas de atendimento
 */
async function obterMetricas(empresaId, usuarioId = null) {
  const filtros = {};

  if (usuarioId) {
    filtros.atribuidoPara = usuarioId;
  }

  const conversas = await chatRepo.listarConversas(empresaId, filtros);

  // Calcular tempo médio de primeira resposta
  const conversasComResposta = conversas.filter(c => c.primeira_resposta_em);
  let tempoMedioPrimeiraResposta = 0;

  if (conversasComResposta.length > 0) {
    const totalTempo = conversasComResposta.reduce((sum, c) => {
      const tempo = new Date(c.primeira_resposta_em) - new Date(c.criado_em);
      return sum + tempo;
    }, 0);

    tempoMedioPrimeiraResposta = Math.round(totalTempo / conversasComResposta.length / 1000 / 60); // em minutos
  }

  // Calcular tempo médio de resolução
  const conversasResolvidas = conversas.filter(c => c.resolvida_em);
  let tempoMedioResolucao = 0;

  if (conversasResolvidas.length > 0) {
    const totalTempo = conversasResolvidas.reduce((sum, c) => {
      const tempo = new Date(c.resolvida_em) - new Date(c.criado_em);
      return sum + tempo;
    }, 0);

    tempoMedioResolucao = Math.round(totalTempo / conversasResolvidas.length / 1000 / 60); // em minutos
  }

  return {
    total_conversas: conversas.length,
    conversas_abertas: conversas.filter(c => c.status === 'aberta').length,
    conversas_resolvidas: conversasResolvidas.length,
    tempo_medio_primeira_resposta_min: tempoMedioPrimeiraResposta,
    tempo_medio_resolucao_min: tempoMedioResolucao,
    taxa_resolucao: conversas.length > 0 ? ((conversasResolvidas.length / conversas.length) * 100).toFixed(2) : 0
  };
}

module.exports = {
  configurarSocketIO,
  emitirParaEmpresa,
  emitirParaConversa,

  // Conversas
  criarOuBuscarConversa,
  listarConversas,
  buscarConversa,
  atribuirConversa,
  fecharConversa,
  reabrirConversa,
  marcarComoLida,

  // Mensagens
  enviarMensagem,
  receberMensagem,
  listarMensagens,
  deletarMensagem,
  atualizarStatusMensagem,

  // Estatísticas
  obterEstatisticas,
  obterMetricas
};
