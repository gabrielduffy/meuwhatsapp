const Groq = require('groq-sdk');
const agenteRepositorio = require('../repositorios/agente-ia.repositorio');
const empresaRepositorio = require('../repositorios/empresa.repositorio');
const { debitarCreditos } = require('../middlewares/creditos');

// Inicializar Groq apenas se API key estiver configurada
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
  console.log('✅ Groq AI inicializado');
} else {
  console.warn('⚠️  GROQ_API_KEY não configurada - funcionalidades de IA estarão desabilitadas');
}

/**
 * Serviço de Agente IA
 */

/**
 * Criar agente
 */
async function criarAgente(empresaId, dados) {
  // Validar dados obrigatórios
  if (!dados.nome || !dados.instanciaId) {
    throw new Error('Nome e instância são obrigatórios');
  }

  // Verificar se já existe agente para esta instância
  const agenteExistente = await agenteRepositorio.buscarPorInstancia(dados.instanciaId, empresaId);

  if (agenteExistente) {
    throw new Error('Já existe um agente configurado para esta instância');
  }

  // Criar agente
  const agente = await agenteRepositorio.criar({
    empresaId,
    ...dados
  });

  return agente;
}

/**
 * Processar mensagem com IA
 */
async function processarMensagem(agenteId, empresaId, mensagemUsuario, contexto = {}) {
  // Buscar agente
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  if (!agente.ativo) {
    throw new Error('Agente está desativado');
  }

  // Verificar se Groq está disponível
  if (!groq) {
    throw new Error('Groq AI não está configurado. Configure a GROQ_API_KEY para usar agentes de IA.');
  }

  // Verificar créditos (10 créditos base + tokens)
  const empresa = await empresaRepositorio.buscarPorId(empresaId);

  if (empresa.saldo_creditos < 10) {
    throw new Error('Créditos insuficientes para usar o Agente IA');
  }

  try {
    // Construir prompt do sistema
    const promptSistema = construirPromptSistema(agente, contexto);

    // Construir histórico de mensagens
    const mensagens = [
      { role: 'system', content: promptSistema },
      { role: 'user', content: mensagemUsuario }
    ];

    // Se houver histórico de conversa, adicionar
    if (contexto.historico && Array.isArray(contexto.historico)) {
      // Inserir histórico antes da mensagem atual
      mensagens.splice(1, 0, ...contexto.historico);
    }

    // Chamar Groq
    const modelo = agente.configuracoes?.modelo || 'llama-3.1-8b-instant';
    const temperatura = agente.configuracoes?.temperatura || 0.7;
    const maxTokens = agente.configuracoes?.max_tokens || 500;

    const inicioRequisicao = Date.now();

    const chatCompletion = await groq.chat.completions.create({
      messages: mensagens,
      model: modelo,
      temperature: temperatura,
      max_tokens: maxTokens
    });

    const duracao = Date.now() - inicioRequisicao;

    // Extrair resposta
    const resposta = chatCompletion.choices[0]?.message?.content || '';
    const tokensUsados = chatCompletion.usage?.total_tokens || 0;

    // Calcular custo em créditos (10 base + 1 crédito a cada 100 tokens)
    const creditosPorTokens = Math.ceil(tokensUsados / 100);
    const creditosTotais = 10 + creditosPorTokens;

    // Debitar créditos
    await debitarCreditos(
      empresaId,
      creditosTotais,
      `Agente IA: ${agente.nome} - ${tokensUsados} tokens`,
      'agente_ia',
      agenteId
    );

    // Atualizar contadores do agente
    await agenteRepositorio.incrementarContadores(agenteId, 'total_mensagens');
    await agenteRepositorio.registrarTokens(agenteId, tokensUsados);

    return {
      resposta,
      tokens_usados: tokensUsados,
      creditos_debitados: creditosTotais,
      duracao_ms: duracao,
      modelo
    };
  } catch (erro) {
    console.error('[Agente IA] Erro ao processar mensagem:', erro);

    // Erros da API Groq
    if (erro.status === 401) {
      throw new Error('Erro de autenticação com Groq. Verifique a API Key');
    } else if (erro.status === 429) {
      throw new Error('Limite de requisições excedido. Tente novamente em alguns instantes');
    } else if (erro.status === 500) {
      throw new Error('Erro interno do serviço Groq');
    }

    throw new Error(`Erro ao processar mensagem: ${erro.message}`);
  }
}

/**
 * Construir prompt do sistema
 */
function construirPromptSistema(agente, contexto = {}) {
  let prompt = '';

  // Personalidade
  if (agente.personalidade) {
    prompt += `${agente.personalidade}\n\n`;
  }

  // Tom de voz
  const tonsDeVoz = {
    profissional: 'Mantenha um tom profissional e cordial em todas as respostas.',
    amigavel: 'Seja amigável e descontraído, como um amigo conversando.',
    formal: 'Use linguagem formal e educada.',
    vendedor: 'Adote um tom persuasivo focado em vendas, mas sem ser agressivo.',
    suporte: 'Seja prestativo e paciente, focado em resolver problemas.'
  };

  prompt += `${tonsDeVoz[agente.tom_de_voz] || tonsDeVoz.profissional}\n\n`;

  // Regras gerais
  if (agente.regras_gerais) {
    prompt += `REGRAS IMPORTANTES:\n${agente.regras_gerais}\n\n`;
  }

  // Contexto adicional
  if (contexto.nomeContato) {
    prompt += `O nome do cliente é: ${contexto.nomeContato}\n`;
  }

  if (contexto.empresaContato) {
    prompt += `Empresa do cliente: ${contexto.empresaContato}\n`;
  }

  if (contexto.informacoesAdicionais) {
    prompt += `\nInformações adicionais:\n${contexto.informacoesAdicionais}\n`;
  }

  return prompt.trim();
}

/**
 * Verificar se deve responder (baseado em gatilhos)
 */
function deveResponder(agente, mensagem) {
  // Se não houver gatilhos configurados, sempre responde
  if (!agente.gatilhos || agente.gatilhos.length === 0) {
    return true;
  }

  const mensagemLower = mensagem.toLowerCase();

  // Verificar cada gatilho
  for (const gatilho of agente.gatilhos) {
    if (gatilho.tipo === 'palavra_chave') {
      // Verificar se contém a palavra-chave
      const palavrasChave = gatilho.valor.toLowerCase().split(',').map(p => p.trim());

      for (const palavra of palavrasChave) {
        if (mensagemLower.includes(palavra)) {
          return true;
        }
      }
    } else if (gatilho.tipo === 'sempre') {
      return true;
    } else if (gatilho.tipo === 'primeira_mensagem') {
      // Esse tipo de gatilho precisa ser verificado pelo contexto
      // Retornar true aqui e deixar o chamador verificar
      return true;
    }
  }

  return false;
}

/**
 * Testar agente (sem debitar créditos)
 */
async function testarAgente(empresaId, agenteId, mensagemTeste) {
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  // Verificar se Groq está disponível
  if (!groq) {
    throw new Error('Groq AI não está configurado. Configure a GROQ_API_KEY para usar agentes de IA.');
  }

  try {
    // Construir prompt
    const promptSistema = construirPromptSistema(agente, {
      nomeContato: 'Cliente Teste',
      informacoesAdicionais: 'Esta é uma mensagem de teste'
    });

    // Chamar Groq
    const modelo = agente.configuracoes?.modelo || 'llama-3.1-8b-instant';

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: mensagemTeste }
      ],
      model: modelo,
      temperature: agente.configuracoes?.temperatura || 0.7,
      max_tokens: agente.configuracoes?.max_tokens || 500
    });

    const resposta = chatCompletion.choices[0]?.message?.content || '';
    const tokensUsados = chatCompletion.usage?.total_tokens || 0;

    return {
      resposta,
      tokens_usados: tokensUsados,
      modelo,
      aviso: 'Teste realizado. Nenhum crédito foi debitado.'
    };
  } catch (erro) {
    console.error('[Agente IA] Erro ao testar:', erro);
    throw new Error(`Erro ao testar agente: ${erro.message}`);
  }
}

/**
 * Atualizar agente
 */
async function atualizarAgente(empresaId, agenteId, dados) {
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  return await agenteRepositorio.atualizar(agenteId, empresaId, dados);
}

/**
 * Deletar agente
 */
async function deletarAgente(empresaId, agenteId) {
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  return await agenteRepositorio.deletar(agenteId, empresaId);
}

/**
 * Listar agentes
 */
async function listarAgentes(empresaId, filtros = {}) {
  return await agenteRepositorio.listarPorEmpresa(empresaId, filtros);
}

/**
 * Obter estatísticas
 */
async function obterEstatisticas(empresaId, agenteId) {
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  return await agenteRepositorio.obterEstatisticas(agenteId, empresaId);
}

/**
 * Ativar/Desativar agente
 */
async function alterarStatusAgente(empresaId, agenteId, ativo) {
  const agente = await agenteRepositorio.buscarPorId(agenteId, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  return await agenteRepositorio.alterarStatus(agenteId, empresaId, ativo);
}

module.exports = {
  criarAgente,
  processarMensagem,
  testarAgente,
  atualizarAgente,
  deletarAgente,
  listarAgentes,
  obterEstatisticas,
  alterarStatusAgente,
  deveResponder
};
