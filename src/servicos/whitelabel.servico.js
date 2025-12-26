const whitelabelRepo = require('../repositorios/whitelabel.repositorio');
const crypto = require('crypto');
const dns = require('dns').promises;

/**
 * Gerar token de verificação para domínio
 */
function gerarTokenVerificacao() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Adicionar domínio customizado
 */
async function adicionarDominio(empresaId, dominio, tipo = 'dominio') {
  // Validar domínio
  if (!dominio || dominio.trim() === '') {
    throw new Error('Domínio inválido');
  }

  // Normalizar domínio (remover http, https, www, barras)
  dominio = dominio.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

  // Verificar se domínio já existe
  const dominioExistente = await whitelabelRepo.buscarDominioPorNome(dominio);
  if (dominioExistente) {
    throw new Error('Este domínio já está sendo usado por outra empresa');
  }

  // Gerar token de verificação
  const token = gerarTokenVerificacao();

  // Definir registro DNS para verificação
  const dnsTipo = 'TXT';
  const dnsNome = `_whatsbenemax-verify.${dominio}`;
  const dnsValor = `whatsbenemax-verification=${token}`;

  // Criar domínio
  const novoDominio = await whitelabelRepo.criarDominio({
    empresaId,
    dominio,
    tipo,
    verificacaoTipo: 'dns',
    verificacaoToken: token,
    dnsTipo,
    dnsNome,
    dnsValor,
    principal: false
  });

  // Criar verificação DNS
  await whitelabelRepo.criarVerificacaoDNS({
    dominioId: novoDominio.id,
    empresaId,
    tipoRegistro: dnsTipo,
    nome: dnsNome,
    valorEsperado: dnsValor
  });

  return {
    ...novoDominio,
    instrucoes_verificacao: {
      tipo: dnsTipo,
      nome: dnsNome,
      valor: dnsValor,
      mensagem: `Adicione o seguinte registro ${dnsTipo} no seu DNS:`,
      passos: [
        '1. Acesse o painel de controle do seu provedor de domínio',
        `2. Adicione um novo registro ${dnsTipo}`,
        `3. Nome/Host: ${dnsNome}`,
        `4. Valor: ${dnsValor}`,
        '5. TTL: 3600 (ou o padrão)',
        '6. Aguarde alguns minutos para propagação do DNS',
        '7. Clique em "Verificar Domínio" para confirmar'
      ]
    }
  };
}

/**
 * Verificar domínio via DNS
 */
async function verificarDominio(dominioId, empresaId) {
  const dominio = await whitelabelRepo.buscarDominioPorId(dominioId, empresaId);

  if (!dominio) {
    throw new Error('Domínio não encontrado');
  }

  if (dominio.verificado) {
    return { verificado: true, mensagem: 'Domínio já verificado' };
  }

  try {
    // Buscar registros TXT do domínio
    const registrosDNS = await dns.resolveTxt(dominio.dns_nome);

    // Verificar se o token está presente
    const valorEsperado = dominio.dns_valor;
    let encontrado = false;

    for (const registro of registrosDNS) {
      const valorRegistro = Array.isArray(registro) ? registro.join('') : registro;
      if (valorRegistro === valorEsperado) {
        encontrado = true;
        break;
      }
    }

    if (encontrado) {
      // Domínio verificado!
      await whitelabelRepo.atualizarDominio(dominioId, empresaId, {
        verificado: true,
        verificadoEm: new Date()
      });

      return {
        verificado: true,
        mensagem: 'Domínio verificado com sucesso! Agora você pode ativá-lo.'
      };
    } else {
      return {
        verificado: false,
        mensagem: 'Registro DNS não encontrado ou valor incorreto. Aguarde alguns minutos para propagação do DNS e tente novamente.'
      };
    }
  } catch (erro) {
    console.error('[White Label] Erro ao verificar DNS:', erro);
    return {
      verificado: false,
      mensagem: 'Não foi possível verificar o domínio. Verifique se o registro DNS foi adicionado corretamente.',
      erro: erro.message
    };
  }
}

/**
 * Ativar domínio (após verificação)
 */
async function ativarDominio(dominioId, empresaId, principal = false) {
  const dominio = await whitelabelRepo.buscarDominioPorId(dominioId, empresaId);

  if (!dominio) {
    throw new Error('Domínio não encontrado');
  }

  if (!dominio.verificado) {
    throw new Error('Domínio precisa ser verificado antes de ser ativado');
  }

  // Atualizar domínio
  const dominioAtualizado = await whitelabelRepo.atualizarDominio(dominioId, empresaId, {
    ativo: true,
    principal
  });

  return dominioAtualizado;
}

/**
 * Definir domínio como principal
 */
async function definirDominioPrincipal(dominioId, empresaId) {
  const dominio = await whitelabelRepo.buscarDominioPorId(dominioId, empresaId);

  if (!dominio) {
    throw new Error('Domínio não encontrado');
  }

  if (!dominio.verificado) {
    throw new Error('Apenas domínios verificados podem ser definidos como principal');
  }

  if (!dominio.ativo) {
    throw new Error('Apenas domínios ativos podem ser definidos como principal');
  }

  // Trigger do banco já garante que apenas um pode ser principal
  const dominioAtualizado = await whitelabelRepo.atualizarDominio(dominioId, empresaId, {
    principal: true
  });

  return dominioAtualizado;
}

/**
 * Aplicar tema customizado
 */
async function aplicarTema(empresaId, tema) {
  const {
    corPrimaria, corSecundaria, corSucesso, corErro, corAviso, corInfo,
    corFundo, corTexto, fontePrimaria, fonteSecundaria
  } = tema;

  const config = await whitelabelRepo.salvarConfig(empresaId, {
    corPrimaria,
    corSecundaria,
    corSucesso,
    corErro,
    corAviso,
    corInfo,
    corFundo,
    corTexto,
    fontePrimaria,
    fonteSecundaria
  });

  return config;
}

/**
 * Gerar CSS customizado a partir da configuração
 */
function gerarCSSCustomizado(config) {
  if (!config) {
    return '';
  }

  const css = `
:root {
  /* Cores */
  --cor-primaria: ${config.cor_primaria || '#5B21B6'};
  --cor-secundaria: ${config.cor_secundaria || '#7C3AED'};
  --cor-sucesso: ${config.cor_sucesso || '#10B981'};
  --cor-erro: ${config.cor_erro || '#EF4444'};
  --cor-aviso: ${config.cor_aviso || '#F59E0B'};
  --cor-info: ${config.cor_info || '#3B82F6'};
  --cor-fundo: ${config.cor_fundo || '#FFFFFF'};
  --cor-texto: ${config.cor_texto || '#1F2937'};

  /* Tipografia */
  --fonte-primaria: ${config.fonte_primaria || 'Inter'}, sans-serif;
  --fonte-secundaria: ${config.fonte_secundaria || 'Roboto'}, sans-serif;
}

body {
  font-family: var(--fonte-primaria);
  color: var(--cor-texto);
  background-color: var(--cor-fundo);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--fonte-secundaria);
}

.btn-primary {
  background-color: var(--cor-primaria);
  border-color: var(--cor-primaria);
}

.btn-primary:hover {
  background-color: var(--cor-secundaria);
  border-color: var(--cor-secundaria);
}

.text-primary {
  color: var(--cor-primaria) !important;
}

.bg-primary {
  background-color: var(--cor-primaria) !important;
}

.border-primary {
  border-color: var(--cor-primaria) !important;
}

${config.css_customizado || ''}
`.trim();

  return css;
}

/**
 * Buscar configuração completa de white label
 */
async function buscarConfigCompleta(empresaId) {
  const config = await whitelabelRepo.buscarConfig(empresaId);

  if (!config) {
    return null;
  }

  // Buscar domínio principal
  const dominioPrincipal = await whitelabelRepo.buscarDominioPrincipal(empresaId);

  // Buscar todos os domínios
  const dominios = await whitelabelRepo.listarDominios(empresaId);

  // Buscar páginas publicadas
  const paginas = await whitelabelRepo.listarPaginas(empresaId, true);

  // Buscar scripts ativos
  const scripts = await whitelabelRepo.listarScripts(empresaId);

  // Gerar CSS
  const cssGerado = gerarCSSCustomizado(config);

  return {
    ...config,
    dominio_principal: dominioPrincipal,
    dominios,
    paginas,
    scripts: scripts.filter(s => s.ativo),
    css_gerado: cssGerado
  };
}

/**
 * Buscar configuração por domínio (para middleware)
 */
async function buscarConfigPorDominio(dominio) {
  // Normalizar domínio
  dominio = dominio.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/:\d+$/, '') // Remover porta
    .replace(/\/$/, '');

  // Buscar domínio no banco
  const dominioDb = await whitelabelRepo.buscarDominioPorNome(dominio);

  if (!dominioDb || !dominioDb.ativo || !dominioDb.verificado) {
    return null;
  }

  // Buscar configuração da empresa
  const config = await buscarConfigCompleta(dominioDb.empresa_id);

  return {
    ...config,
    empresa_id: dominioDb.empresa_id,
    dominio_atual: dominioDb
  };
}

/**
 * Processar redirecionamento
 */
async function processarRedirecionamento(origem, empresaId) {
  const redirect = await whitelabelRepo.buscarRedirecionamentoPorOrigem(origem, empresaId);

  if (!redirect) {
    return null;
  }

  // Registrar acesso
  await whitelabelRepo.registrarAcessoRedirecionamento(redirect.id, empresaId);

  return {
    destino: redirect.destino,
    tipo: redirect.tipo
  };
}

/**
 * Salvar configuração de email customizado
 */
async function salvarConfigEmail(empresaId, configEmail) {
  const {
    emailRemetente,
    emailNomeRemetente,
    smtpHost,
    smtpPort,
    smtpUsuario,
    smtpSenha,
    smtpSeguro,
    templateBoasVindas,
    templateRecuperacaoSenha,
    templateNovaCobranca
  } = configEmail;

  const config = await whitelabelRepo.salvarConfig(empresaId, {
    emailRemetente,
    emailNomeRemetente,
    smtpHost,
    smtpPort,
    smtpUsuario,
    smtpSenha,
    smtpSeguro,
    templateBoasVindas,
    templateRecuperacaoSenha,
    templateNovaCobranca
  });

  return config;
}

/**
 * Testar configuração de email
 */
async function testarConfigEmail(empresaId, emailDestino) {
  const config = await whitelabelRepo.buscarConfig(empresaId);

  if (!config || !config.smtp_host) {
    throw new Error('Configuração de email não encontrada');
  }

  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: config.smtp_seguro || false,
    auth: {
      user: config.smtp_usuario,
      pass: config.smtp_senha
    }
  });

  // Verificar conexão
  await transporter.verify();

  // Enviar email de teste
  const info = await transporter.sendMail({
    from: `"${config.email_nome_remetente || 'WhatsBenemax'}" <${config.email_remetente}>`,
    to: emailDestino,
    subject: 'Teste de configuração de email',
    html: `
      <h1>Email de teste</h1>
      <p>Se você recebeu este email, sua configuração de SMTP está funcionando corretamente!</p>
      <p><strong>Servidor:</strong> ${config.smtp_host}</p>
      <p><strong>Porta:</strong> ${config.smtp_port}</p>
    `
  });

  return {
    sucesso: true,
    messageId: info.messageId,
    mensagem: 'Email de teste enviado com sucesso!'
  };
}

/**
 * Processar verificações DNS pendentes (chamado por cron)
 */
async function processarVerificacoesPendentes() {
  console.log('[White Label] Processando verificações DNS pendentes...');

  const verificacoes = await whitelabelRepo.listarVerificacoesPendentes();

  console.log(`[White Label] ${verificacoes.length} verificações pendentes`);

  let sucessos = 0;
  let erros = 0;

  for (const verificacao of verificacoes) {
    try {
      // Buscar registros DNS
      const registrosDNS = await dns.resolveTxt(verificacao.nome);

      let encontrado = false;
      let valorEncontrado = null;

      for (const registro of registrosDNS) {
        const valor = Array.isArray(registro) ? registro.join('') : registro;
        if (valor === verificacao.valor_esperado) {
          encontrado = true;
          valorEncontrado = valor;
          break;
        }
      }

      if (encontrado) {
        // Atualizar verificação como sucesso
        await whitelabelRepo.atualizarVerificacaoDNS(verificacao.id, {
          valorEncontrado,
          status: 'sucesso',
          mensagem: 'Registro DNS verificado com sucesso'
        });

        // Marcar domínio como verificado
        await whitelabelRepo.atualizarDominio(verificacao.dominio_id, verificacao.empresa_id, {
          verificado: true,
          verificadoEm: new Date()
        });

        console.log(`[White Label] Domínio ${verificacao.dominio} verificado com sucesso`);
        sucessos++;
      } else {
        // Atualizar tentativa
        await whitelabelRepo.atualizarVerificacaoDNS(verificacao.id, {
          valorEncontrado: registrosDNS.length > 0 ? JSON.stringify(registrosDNS) : null,
          status: 'pendente',
          mensagem: 'Registro DNS não encontrado, tentando novamente em 1 hora'
        });
      }
    } catch (erro) {
      console.error(`[White Label] Erro ao verificar ${verificacao.nome}:`, erro.message);

      await whitelabelRepo.atualizarVerificacaoDNS(verificacao.id, {
        valorEncontrado: null,
        status: verificacao.tentativas >= 9 ? 'falha' : 'pendente',
        mensagem: erro.message
      });

      erros++;
    }
  }

  console.log(`[White Label] Verificações concluídas: ${sucessos} sucessos, ${erros} erros`);

  return { processadas: verificacoes.length, sucessos, erros };
}

module.exports = {
  // Domínios
  adicionarDominio,
  verificarDominio,
  ativarDominio,
  definirDominioPrincipal,

  // Temas
  aplicarTema,
  gerarCSSCustomizado,

  // Configuração
  buscarConfigCompleta,
  buscarConfigPorDominio,

  // Redirecionamentos
  processarRedirecionamento,

  // Email
  salvarConfigEmail,
  testarConfigEmail,

  // Verificações
  processarVerificacoesPendentes,

  // Utilitários
  gerarTokenVerificacao
};
