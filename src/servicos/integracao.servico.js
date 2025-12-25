const axios = require('axios');
const integracaoRepo = require('../repositorios/integracao.repositorio');

/**
 * Serviço de Integrações (Webhooks, APIs)
 */

/**
 * Criar integração
 */
async function criarIntegracao(empresaId, dados) {
  // Validar dados
  if (!dados.tipo || !dados.nome) {
    throw new Error('Tipo e nome são obrigatórios');
  }

  // Validar configurações baseado no tipo
  validarConfiguracoes(dados.tipo, dados.configuracoes || {});

  return await integracaoRepo.criar({
    empresaId,
    ...dados
  });
}

/**
 * Validar configurações da integração
 */
function validarConfiguracoes(tipo, configuracoes) {
  switch (tipo) {
    case 'webhook':
      if (!configuracoes.url) {
        throw new Error('URL do webhook é obrigatória');
      }
      if (!configuracoes.metodo) {
        configuracoes.metodo = 'POST';
      }
      break;

    case 'api':
      if (!configuracoes.url_base) {
        throw new Error('URL base da API é obrigatória');
      }
      break;

    case 'zapier':
      if (!configuracoes.webhook_url) {
        throw new Error('URL do Zapier webhook é obrigatória');
      }
      break;

    case 'make':
      if (!configuracoes.webhook_url) {
        throw new Error('URL do Make webhook é obrigatória');
      }
      break;

    default:
      // Tipo customizado, sem validação específica
      break;
  }
}

/**
 * Atualizar integração
 */
async function atualizarIntegracao(empresaId, integracaoId, dados) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  // Validar configurações se fornecidas
  if (dados.configuracoes) {
    validarConfiguracoes(integracao.tipo, dados.configuracoes);
  }

  return await integracaoRepo.atualizar(integracaoId, empresaId, dados);
}

/**
 * Deletar integração
 */
async function deletarIntegracao(empresaId, integracaoId) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  return await integracaoRepo.deletar(integracaoId, empresaId);
}

/**
 * Listar integrações
 */
async function listarIntegracoes(empresaId, filtros = {}) {
  return await integracaoRepo.listar(empresaId, filtros);
}

/**
 * Buscar integração por ID
 */
async function buscarIntegracao(empresaId, integracaoId) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  return integracao;
}

/**
 * Ativar/Desativar integração
 */
async function alterarStatus(empresaId, integracaoId, ativo) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  return await integracaoRepo.alterarStatus(integracaoId, empresaId, ativo);
}

// =====================================================
// EXECUÇÃO DE INTEGRAÇÕES
// =====================================================

/**
 * Disparar webhook
 */
async function dispararWebhook(integracaoId, empresaId, evento, dados) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  if (!integracao.ativo) {
    console.log(`[Integração] Webhook ${integracaoId} está desativado`);
    return null;
  }

  const { url, metodo = 'POST', headers = {} } = integracao.configuracoes;

  if (!url) {
    throw new Error('URL do webhook não configurada');
  }

  const inicio = Date.now();
  let codigoHttp = null;
  let status = 'erro';
  let mensagemErro = null;
  let payloadRecebido = null;

  try {
    // Preparar payload
    const payload = {
      evento,
      empresa_id: empresaId,
      timestamp: new Date().toISOString(),
      dados
    };

    // Fazer requisição
    const config = {
      method: metodo,
      url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsBenemax/1.0',
        ...headers
      },
      data: payload,
      timeout: 30000 // 30 segundos
    };

    const resposta = await axios(config);

    codigoHttp = resposta.status;
    payloadRecebido = resposta.data;
    status = 'sucesso';

    console.log(`[Integração] Webhook ${integracaoId} disparado com sucesso`);

  } catch (erro) {
    console.error(`[Integração] Erro ao disparar webhook ${integracaoId}:`, erro.message);

    codigoHttp = erro.response?.status || null;
    mensagemErro = erro.message;
    status = 'erro';
  }

  const duracao = Date.now() - inicio;

  // Registrar log
  await integracaoRepo.criarLog({
    integracaoId,
    empresaId,
    tipoEvento: evento,
    direcao: 'saida',
    url,
    metodo,
    payloadEnviado: dados,
    payloadRecebido,
    codigoHttp,
    status,
    duracaoMs: duracao,
    mensagemErro
  });

  return {
    sucesso: status === 'sucesso',
    codigo_http: codigoHttp,
    duracao_ms: duracao,
    mensagem_erro: mensagemErro
  };
}

/**
 * Disparar para todas as integrações ativas do tipo
 */
async function dispararParaTodasIntegracoes(empresaId, tipo, evento, dados) {
  const integracoes = await integracaoRepo.listar(empresaId, {
    tipo,
    ativo: true
  });

  const resultados = [];

  for (const integracao of integracoes) {
    try {
      const resultado = await dispararWebhook(integracao.id, empresaId, evento, dados);
      resultados.push({
        integracao_id: integracao.id,
        nome: integracao.nome,
        ...resultado
      });
    } catch (erro) {
      console.error(`[Integração] Erro ao disparar ${integracao.id}:`, erro);
      resultados.push({
        integracao_id: integracao.id,
        nome: integracao.nome,
        sucesso: false,
        mensagem_erro: erro.message
      });
    }
  }

  return resultados;
}

/**
 * Testar integração
 */
async function testarIntegracao(empresaId, integracaoId) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  // Disparar evento de teste
  return await dispararWebhook(
    integracaoId,
    empresaId,
    'teste',
    {
      mensagem: 'Teste de integração',
      timestamp: new Date().toISOString()
    }
  );
}

/**
 * Processar webhook recebido (de integrações externas)
 */
async function processarWebhookRecebido(empresaId, integracaoId, dados, headers = {}) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  if (!integracao.ativo) {
    throw new Error('Integração está desativada');
  }

  // Validar assinatura se configurada
  if (integracao.configuracoes.secret) {
    validarAssinaturaWebhook(dados, headers, integracao.configuracoes.secret);
  }

  // Registrar log
  await integracaoRepo.criarLog({
    integracaoId,
    empresaId,
    tipoEvento: dados.evento || 'webhook_recebido',
    direcao: 'entrada',
    url: headers['x-original-url'] || 'webhook',
    metodo: 'POST',
    payloadRecebido: dados,
    codigoHttp: 200,
    status: 'sucesso',
    duracaoMs: 0
  });

  return {
    sucesso: true,
    mensagem: 'Webhook processado com sucesso'
  };
}

/**
 * Validar assinatura do webhook (HMAC)
 */
function validarAssinaturaWebhook(dados, headers, secret) {
  const crypto = require('crypto');
  const assinaturaRecebida = headers['x-webhook-signature'] || headers['x-signature'];

  if (!assinaturaRecebida) {
    throw new Error('Assinatura do webhook não encontrada');
  }

  const payload = JSON.stringify(dados);
  const assinaturaEsperada = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (assinaturaRecebida !== assinaturaEsperada) {
    throw new Error('Assinatura do webhook inválida');
  }
}

// =====================================================
// LOGS
// =====================================================

/**
 * Listar logs da integração
 */
async function listarLogs(empresaId, integracaoId, filtros = {}) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  return await integracaoRepo.listarLogs(integracaoId, empresaId, filtros);
}

/**
 * Obter estatísticas da integração
 */
async function obterEstatisticas(empresaId, integracaoId, periodo = '24 hours') {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  const stats = await integracaoRepo.obterEstatisticasLogs(integracaoId, empresaId, periodo);

  return {
    integracao: {
      id: integracao.id,
      nome: integracao.nome,
      tipo: integracao.tipo,
      ativo: integracao.ativo
    },
    totais: {
      requisicoes: integracao.total_requisicoes,
      sucessos: integracao.requisicoes_sucesso,
      erros: integracao.requisicoes_erro
    },
    periodo_atual: stats
  };
}

/**
 * Limpar logs antigos
 */
async function limparLogsAntigos(empresaId, integracaoId, diasAntigos = 30) {
  const integracao = await integracaoRepo.buscarPorId(integracaoId, empresaId);

  if (!integracao) {
    throw new Error('Integração não encontrada');
  }

  const deletados = await integracaoRepo.limparLogsAntigos(integracaoId, diasAntigos);

  return {
    mensagem: `${deletados} logs deletados`,
    total_deletado: deletados
  };
}

module.exports = {
  // CRUD
  criarIntegracao,
  atualizarIntegracao,
  deletarIntegracao,
  listarIntegracoes,
  buscarIntegracao,
  alterarStatus,

  // Execução
  dispararWebhook,
  dispararParaTodasIntegracoes,
  testarIntegracao,
  processarWebhookRecebido,

  // Logs
  listarLogs,
  obterEstatisticas,
  limparLogsAntigos
};
