const followupRepo = require('../repositorios/followup.repositorio');
const contatoRepo = require('../repositorios/contato.repositorio');
const empresaRepo = require('../repositorios/empresa.repositorio');
const crmRepo = require('../repositorios/crm.repositorio');
const { query } = require('../config/database');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Criar sequência de follow-up com etapas
 */
async function criarSequenciaComEtapas(empresaId, dados) {
  const { nome, descricao, gatilho_tipo, gatilho_config, instancia_id, usar_agente_ia, agente_id, horario_inicio, horario_fim, enviar_fim_semana, etapas } = dados;

  if (!nome || !gatilho_tipo) {
    throw new Error('Nome e tipo de gatilho são obrigatórios');
  }

  if (!etapas || etapas.length === 0) {
    throw new Error('É necessário adicionar pelo menos uma etapa à sequência');
  }

  // Criar sequência
  const sequencia = await followupRepo.criar({
    empresaId,
    nome,
    descricao,
    gatilhoTipo: gatilho_tipo,
    gatilhoConfig: gatilho_config || {},
    instanciaId: instancia_id,
    usarAgenteIa: usar_agente_ia || false,
    agenteId: agente_id || null,
    horarioInicio: horario_inicio || 8,
    horarioFim: horario_fim || 20,
    enviarFimSemana: enviar_fim_semana || false,
    ativo: false
  });

  // Criar etapas
  for (let i = 0; i < etapas.length; i++) {
    const etapa = etapas[i];
    await followupRepo.criarEtapa({
      sequenciaId: sequencia.id,
      empresaId,
      ordem: i + 1,
      atraso: etapa.atraso || 0,
      unidadeAtraso: etapa.unidade_atraso || 'minutos',
      tipo: etapa.tipo,
      config: etapa.config || {}
    });
  }

  return await followupRepo.buscarPorId(sequencia.id, empresaId);
}

/**
 * Inscrever contato em sequência
 */
async function inscreverContatoEmSequencia(empresaId, sequenciaId, contatoId, dados = {}) {
  const sequencia = await followupRepo.buscarPorId(sequenciaId, empresaId);
  if (!sequencia) {
    throw new Error('Sequência não encontrada');
  }

  if (!sequencia.ativo) {
    throw new Error('Sequência está inativa');
  }

  const contato = await contatoRepo.buscarPorId(contatoId, empresaId);
  if (!contato) {
    throw new Error('Contato não encontrado');
  }

  // Verificar se já está inscrito
  const inscricaoExistente = await query(
    'SELECT * FROM inscricoes_followup WHERE sequencia_id = $1 AND contato_id = $2 AND empresa_id = $3',
    [sequenciaId, contatoId, empresaId]
  );

  if (inscricaoExistente.rows.length > 0) {
    const inscricao = inscricaoExistente.rows[0];
    if (inscricao.status === 'ativa') {
      throw new Error('Contato já está inscrito nesta sequência');
    }
    // Reativar inscrição se estava cancelada ou concluída
    return await followupRepo.atualizarStatusInscricao(inscricao.id, empresaId, 'ativa', { etapa_atual_ordem: 1 });
  }

  // Calcular próxima execução (primeira etapa)
  const proximaExecucao = calcularProximaExecucao(sequencia, 0);

  const inscricao = await followupRepo.inscrever({
    sequenciaId,
    empresaId,
    contatoId,
    negociacaoId: dados.negociacaoId || null,
    etapaAtualOrdem: 1,
    proximaExecucao,
    status: 'ativa'
  });

  // Atualizar estatísticas da sequência
  await followupRepo.atualizarEstatisticas(sequenciaId, empresaId);

  return inscricao;
}

/**
 * Calcular próxima execução baseado na etapa
 */
function calcularProximaExecucao(sequencia, atraso = 0, unidadeAtraso = 'minutos') {
  const agora = new Date();
  let proximaExecucao = new Date(agora);

  // Adicionar atraso
  switch (unidadeAtraso) {
    case 'minutos':
      proximaExecucao.setMinutes(proximaExecucao.getMinutes() + atraso);
      break;
    case 'horas':
      proximaExecucao.setHours(proximaExecucao.getHours() + atraso);
      break;
    case 'dias':
      proximaExecucao.setDate(proximaExecucao.getDate() + atraso);
      break;
  }

  // Ajustar para horário comercial
  proximaExecucao = ajustarHorarioComercial(proximaExecucao, sequencia.horario_inicio, sequencia.horario_fim, sequencia.enviar_fim_semana);

  return proximaExecucao;
}

/**
 * Ajustar para horário comercial
 */
function ajustarHorarioComercial(data, horarioInicio = 8, horarioFim = 20, enviarFimSemana = false) {
  let dataAjustada = new Date(data);

  // Verificar fim de semana
  if (!enviarFimSemana) {
    while (dataAjustada.getDay() === 0 || dataAjustada.getDay() === 6) {
      // Domingo = 0, Sábado = 6
      dataAjustada.setDate(dataAjustada.getDate() + 1);
      dataAjustada.setHours(horarioInicio, 0, 0, 0);
    }
  }

  // Verificar horário
  const hora = dataAjustada.getHours();
  if (hora < horarioInicio) {
    dataAjustada.setHours(horarioInicio, 0, 0, 0);
  } else if (hora >= horarioFim) {
    // Próximo dia útil
    dataAjustada.setDate(dataAjustada.getDate() + 1);
    dataAjustada.setHours(horarioInicio, 0, 0, 0);

    // Verificar novamente fim de semana
    if (!enviarFimSemana) {
      while (dataAjustada.getDay() === 0 || dataAjustada.getDay() === 6) {
        dataAjustada.setDate(dataAjustada.getDate() + 1);
      }
    }
  }

  return dataAjustada;
}

/**
 * Substituir variáveis no template
 */
function substituirVariaveis(template, contato, empresa, negociacao = null) {
  let texto = template;

  // Variáveis do contato
  texto = texto.replace(/\{\{nome\}\}/g, contato.nome || 'Cliente');
  texto = texto.replace(/\{\{telefone\}\}/g, contato.telefone || '');
  texto = texto.replace(/\{\{email\}\}/g, contato.email || '');

  // Campos customizados do contato
  if (contato.campos_customizados) {
    Object.keys(contato.campos_customizados).forEach(campo => {
      const regex = new RegExp(`\\{\\{contato\\.${campo}\\}\\}`, 'g');
      texto = texto.replace(regex, contato.campos_customizados[campo] || '');
    });
  }

  // Variáveis da empresa
  texto = texto.replace(/\{\{empresa\}\}/g, empresa.nome || '');
  texto = texto.replace(/\{\{empresa\.telefone\}\}/g, empresa.telefone || '');
  texto = texto.replace(/\{\{empresa\.email\}\}/g, empresa.email || '');

  // Variáveis da negociação
  if (negociacao) {
    texto = texto.replace(/\{\{negociacao\.titulo\}\}/g, negociacao.titulo || '');
    texto = texto.replace(/\{\{negociacao\.valor\}\}/g, negociacao.valor ? `R$ ${negociacao.valor.toFixed(2)}` : '');
  }

  return texto;
}

/**
 * Executar etapa de follow-up
 */
async function executarEtapa(inscricaoId, empresaId) {
  const inscricao = await followupRepo.buscarInscricaoPorId(inscricaoId, empresaId);
  if (!inscricao) {
    throw new Error('Inscrição não encontrada');
  }

  if (inscricao.status !== 'ativa') {
    console.log(`[Follow-up] Inscrição ${inscricaoId} não está ativa, pulando execução`);
    return null;
  }

  const sequencia = await followupRepo.buscarPorId(inscricao.sequencia_id, empresaId);
  if (!sequencia || !sequencia.ativo) {
    console.log(`[Follow-up] Sequência ${inscricao.sequencia_id} não encontrada ou inativa`);
    await followupRepo.atualizarStatusInscricao(inscricaoId, empresaId, 'cancelada');
    return null;
  }

  const etapas = await followupRepo.listarEtapasPorSequencia(sequencia.id, empresaId);
  const etapaAtual = etapas.find(e => e.ordem === inscricao.etapa_atual_ordem);

  if (!etapaAtual) {
    console.log(`[Follow-up] Etapa ${inscricao.etapa_atual_ordem} não encontrada`);
    await followupRepo.atualizarStatusInscricao(inscricaoId, empresaId, 'concluida');
    await followupRepo.atualizarEstatisticas(sequencia.id, empresaId);
    return null;
  }

  const contato = await contatoRepo.buscarPorId(inscricao.contato_id, empresaId);
  const empresa = await empresaRepo.buscarPorId(empresaId);
  let negociacao = null;
  if (inscricao.negociacao_id) {
    negociacao = await crmRepo.buscarNegociacaoPorId(inscricao.negociacao_id, empresaId);
  }

  let resultado = null;

  try {
    // Executar ação baseada no tipo
    switch (etapaAtual.tipo) {
      case 'mensagem':
        resultado = await executarAcaoMensagem(etapaAtual, contato, empresa, negociacao, sequencia);
        break;

      case 'email':
        resultado = await executarAcaoEmail(etapaAtual, contato, empresa, negociacao);
        break;

      case 'tarefa':
        resultado = await executarAcaoTarefa(etapaAtual, contato, empresa, negociacao, empresaId);
        break;

      case 'mover_funil':
        resultado = await executarAcaoMoverFunil(etapaAtual, inscricao, empresaId);
        break;

      case 'webhook':
        resultado = await executarAcaoWebhook(etapaAtual, contato, empresa, negociacao);
        break;

      default:
        throw new Error(`Tipo de etapa desconhecido: ${etapaAtual.tipo}`);
    }

    // Registrar execução
    await followupRepo.criarExecucao({
      inscricaoId,
      empresaId,
      etapaId: etapaAtual.id,
      status: 'sucesso',
      resultado
    });

    // Avançar para próxima etapa
    const proximaOrdem = inscricao.etapa_atual_ordem + 1;
    const proximaEtapa = etapas.find(e => e.ordem === proximaOrdem);

    if (proximaEtapa) {
      const proximaExecucao = calcularProximaExecucao(sequencia, proximaEtapa.atraso, proximaEtapa.unidade_atraso);
      await followupRepo.atualizarStatusInscricao(inscricaoId, empresaId, 'ativa', {
        etapa_atual_ordem: proximaOrdem,
        proxima_execucao: proximaExecucao
      });
    } else {
      // Finalizar sequência
      await followupRepo.atualizarStatusInscricao(inscricaoId, empresaId, 'concluida');
      await followupRepo.atualizarEstatisticas(sequencia.id, empresaId);
    }

    return { sucesso: true, resultado };

  } catch (erro) {
    console.error('[Follow-up] Erro ao executar etapa:', erro);

    await followupRepo.criarExecucao({
      inscricaoId,
      empresaId,
      etapaId: etapaAtual.id,
      status: 'erro',
      resultado: { erro: erro.message }
    });

    return { sucesso: false, erro: erro.message };
  }
}

/**
 * Executar ação de mensagem WhatsApp
 */
async function executarAcaoMensagem(etapa, contato, empresa, negociacao, sequencia) {
  const config = etapa.config;
  let mensagem = substituirVariaveis(config.texto || '', contato, empresa, negociacao);

  if (!mensagem) {
    throw new Error('Texto da mensagem não pode estar vazio');
  }

  // Enviar via instância WhatsApp
  if (!sequencia.instancia_id) {
    throw new Error('Sequência não possui instância de WhatsApp configurada');
  }

  // Buscar instância
  const instanciaQuery = await query(
    'SELECT * FROM instancias_whatsapp WHERE id = $1 AND empresa_id = $2',
    [sequencia.instancia_id, empresa.id]
  );

  if (instanciaQuery.rows.length === 0) {
    throw new Error('Instância WhatsApp não encontrada');
  }

  const instancia = instanciaQuery.rows[0];

  if (instancia.status !== 'conectado') {
    throw new Error('Instância WhatsApp não está conectada');
  }

  // Usar agente IA se configurado
  if (sequencia.usar_agente_ia && sequencia.agente_id) {
    const agenteQuery = await query(
      'SELECT * FROM agentes_ia WHERE id = $1 AND empresa_id = $2',
      [sequencia.agente_id, empresa.id]
    );

    if (agenteQuery.rows.length > 0) {
      // Personalizar mensagem com IA
      try {
        const groq = require('../servicos/groq.servico');
        const prompt = `Você é um assistente de vendas. Personalize a seguinte mensagem para o contato ${contato.nome}:\n\n${mensagem}\n\nMantenha o tom profissional e personalizado.`;
        mensagem = await groq.gerarResposta(prompt, empresa.id);
      } catch (erroIA) {
        console.log('[Follow-up] Erro ao personalizar com IA, usando mensagem original:', erroIA);
      }
    }
  }

  // Enviar mensagem
  try {
    const envio = await query(
      `INSERT INTO mensagens (instancia_id, empresa_id, contato_id, tipo, conteudo, direcao, status)
       VALUES ($1, $2, $3, 'texto', $4, 'enviada', 'pendente')
       RETURNING *`,
      [sequencia.instancia_id, empresa.id, contato.id, mensagem]
    );

    // Consumir crédito
    await empresaRepo.consumirCreditos(empresa.id, 1, 'followup', `Follow-up: ${sequencia.nome}`);

    return {
      mensagem_enviada: true,
      mensagem_id: envio.rows[0].id,
      texto: mensagem
    };
  } catch (erro) {
    throw new Error(`Erro ao enviar mensagem: ${erro.message}`);
  }
}

/**
 * Executar ação de email
 */
async function executarAcaoEmail(etapa, contato, empresa, negociacao) {
  const config = etapa.config;

  if (!contato.email) {
    throw new Error('Contato não possui email cadastrado');
  }

  const assunto = substituirVariaveis(config.assunto || '', contato, empresa, negociacao);
  const corpo = substituirVariaveis(config.corpo || '', contato, empresa, negociacao);

  // Enviar email (integração com nodemailer já existe)
  const nodemailer = require('nodemailer');

  // Configurar transporter (deve estar em variáveis de ambiente)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: `"${empresa.nome}" <${process.env.SMTP_USER}>`,
    to: contato.email,
    subject: assunto,
    html: corpo
  });

  return {
    email_enviado: true,
    message_id: info.messageId,
    destinatario: contato.email
  };
}

/**
 * Executar ação de criar tarefa
 */
async function executarAcaoTarefa(etapa, contato, empresa, negociacao, empresaId) {
  const config = etapa.config;

  const titulo = substituirVariaveis(config.titulo || '', contato, empresa, negociacao);
  const descricao = substituirVariaveis(config.descricao || '', contato, empresa, negociacao);

  // Criar tarefa
  if (negociacao) {
    // Tarefa vinculada à negociação
    await crmRepo.criarTarefaNegociacao({
      negociacaoId: negociacao.id,
      empresaId,
      titulo,
      descricao,
      vencimento: config.vencimento || null,
      prioridade: config.prioridade || 'media',
      responsavelId: config.responsavel_id || null
    });
  } else {
    // Tarefa geral vinculada ao contato
    await query(
      `INSERT INTO tarefas (empresa_id, contato_id, titulo, descricao, vencimento, prioridade, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pendente')`,
      [empresaId, contato.id, titulo, descricao, config.vencimento || null, config.prioridade || 'media']
    );
  }

  return {
    tarefa_criada: true,
    titulo
  };
}

/**
 * Executar ação de mover no funil
 */
async function executarAcaoMoverFunil(etapa, inscricao, empresaId) {
  const config = etapa.config;

  if (!inscricao.negociacao_id) {
    throw new Error('Inscrição não está vinculada a uma negociação');
  }

  if (!config.etapa_funil_id) {
    throw new Error('Etapa de funil não configurada');
  }

  await crmRepo.moverNegociacao(inscricao.negociacao_id, empresaId, config.etapa_funil_id, {
    automatico: true,
    motivo: 'Movida automaticamente pelo follow-up'
  });

  return {
    negociacao_movida: true,
    etapa_id: config.etapa_funil_id
  };
}

/**
 * Executar ação de webhook
 */
async function executarAcaoWebhook(etapa, contato, empresa, negociacao) {
  const config = etapa.config;

  if (!config.url) {
    throw new Error('URL do webhook não configurada');
  }

  const payload = {
    contato: {
      id: contato.id,
      nome: contato.nome,
      telefone: contato.telefone,
      email: contato.email
    },
    empresa: {
      id: empresa.id,
      nome: empresa.nome
    },
    negociacao: negociacao ? {
      id: negociacao.id,
      titulo: negociacao.titulo,
      valor: negociacao.valor
    } : null,
    timestamp: new Date().toISOString()
  };

  // Adicionar assinatura HMAC se secret estiver configurado
  let headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'WhatsBenemax-Followup/1.0'
  };

  if (config.secret) {
    const hmac = crypto.createHmac('sha256', config.secret);
    hmac.update(JSON.stringify(payload));
    headers['X-Webhook-Signature'] = hmac.digest('hex');
  }

  const response = await axios.post(config.url, payload, {
    headers,
    timeout: 10000
  });

  return {
    webhook_enviado: true,
    status: response.status,
    url: config.url
  };
}

/**
 * Processar inscrições pendentes (chamado pelo cron)
 */
async function processarInscricoesPendentes() {
  console.log('[Follow-up] Iniciando processamento de inscrições pendentes...');

  const inscricoes = await followupRepo.buscarInscricoesProntasParaExecutar();

  console.log(`[Follow-up] ${inscricoes.length} inscrições prontas para executar`);

  let sucessos = 0;
  let erros = 0;

  for (const inscricao of inscricoes) {
    try {
      await executarEtapa(inscricao.id, inscricao.empresa_id);
      sucessos++;
    } catch (erro) {
      console.error(`[Follow-up] Erro ao processar inscrição ${inscricao.id}:`, erro);
      erros++;
    }
  }

  console.log(`[Follow-up] Processamento concluído: ${sucessos} sucessos, ${erros} erros`);

  return { processadas: inscricoes.length, sucessos, erros };
}

/**
 * Avaliar gatilhos e inscrever automaticamente
 */
async function avaliarGatilhos(empresaId, evento) {
  const { tipo, dados } = evento;

  // Buscar sequências ativas com gatilho correspondente
  const sequenciasQuery = await query(
    `SELECT * FROM sequencias_followup
     WHERE empresa_id = $1
     AND ativo = true
     AND gatilho_tipo = $2`,
    [empresaId, tipo]
  );

  for (const sequencia of sequenciasQuery.rows) {
    let deveInscrever = false;
    const config = sequencia.gatilho_config || {};

    switch (tipo) {
      case 'nova_conversa':
        deveInscrever = true;
        break;

      case 'entrou_etapa_funil':
        if (config.etapa_id && dados.etapa_id === config.etapa_id) {
          deveInscrever = true;
        }
        break;

      case 'sem_resposta':
        if (config.dias && dados.dias_sem_resposta >= config.dias) {
          deveInscrever = true;
        }
        break;

      case 'tag_adicionada':
        if (config.tag && dados.tag === config.tag) {
          deveInscrever = true;
        }
        break;
    }

    if (deveInscrever && dados.contato_id) {
      try {
        await inscreverContatoEmSequencia(empresaId, sequencia.id, dados.contato_id, dados);
        console.log(`[Follow-up] Contato ${dados.contato_id} inscrito na sequência ${sequencia.nome} via gatilho ${tipo}`);
      } catch (erro) {
        console.error(`[Follow-up] Erro ao inscrever automaticamente:`, erro);
      }
    }
  }
}

/**
 * Cancelar inscrição
 */
async function cancelarInscricao(inscricaoId, empresaId, motivo = null) {
  const inscricao = await followupRepo.buscarInscricaoPorId(inscricaoId, empresaId);

  if (!inscricao) {
    throw new Error('Inscrição não encontrada');
  }

  await followupRepo.atualizarStatusInscricao(inscricaoId, empresaId, 'cancelada');

  // Registrar motivo
  if (motivo) {
    await followupRepo.criarExecucao({
      inscricaoId,
      empresaId,
      etapaId: null,
      status: 'cancelado',
      resultado: { motivo }
    });
  }

  await followupRepo.atualizarEstatisticas(inscricao.sequencia_id, empresaId);

  return inscricao;
}

module.exports = {
  criarSequenciaComEtapas,
  inscreverContatoEmSequencia,
  executarEtapa,
  processarInscricoesPendentes,
  avaliarGatilhos,
  cancelarInscricao,
  substituirVariaveis,
  calcularProximaExecucao,
  ajustarHorarioComercial
};
