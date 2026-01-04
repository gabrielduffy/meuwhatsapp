const usuarioRepositorio = require('../repositorios/usuario.repositorio');
const empresaRepositorio = require('../repositorios/empresa.repositorio');
const sessaoRepositorio = require('../repositorios/sessao.repositorio');
const { gerarHashSenha, compararSenha, gerarToken, validarForcaSenha } = require('../utilitarios/senha');
const { gerarTokenAcesso, gerarTokenAtualizacao, verificarToken, calcularExpiracao } = require('../utilitarios/jwt');
const { enviarEmailVerificacao, enviarEmailRedefinirSenha, enviarEmailBoasVindas } = require('../utilitarios/email');
const { validarEmail, criarSlug } = require('../utilitarios/validadores');

const autenticacaoServico = {
  /**
   * Cadastrar novo usuário/empresa
   */
  async cadastrar(dados) {
    const { nome, email, senha, nomeEmpresa, codigoAfiliado } = dados;

    // Validar email
    if (!validarEmail(email)) {
      throw new Error('Email inválido');
    }

    // Validar força da senha
    const validacaoSenha = validarForcaSenha(senha);
    if (!validacaoSenha.valida) {
      throw new Error(validacaoSenha.erros.join(', '));
    }

    // Verificar se email já existe
    const usuarioExistente = await usuarioRepositorio.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new Error('Este email já está cadastrado');
    }

    // Buscar plano starter padrão
    const { query } = require('../config/database');
    const planoResult = await query("SELECT * FROM planos WHERE slug = 'starter' LIMIT 1");
    const planoStarter = planoResult.rows[0];

    if (!planoStarter) {
      throw new Error('Plano padrão não encontrado');
    }

    // Buscar afiliado se fornecido código
    let afiliadoId = null;
    if (codigoAfiliado) {
      const afiliadoResult = await query(
        'SELECT * FROM afiliados WHERE codigo = $1 AND ativo = true',
        [codigoAfiliado]
      );
      if (afiliadoResult.rows.length > 0) {
        afiliadoId = afiliadoResult.rows[0].id;
      }
    }

    // Criar empresa
    const slugEmpresa = criarSlug(nomeEmpresa || nome);
    const empresa = await empresaRepositorio.criar({
      nome: nomeEmpresa || `${nome} - Empresa`,
      slug: slugEmpresa,
      email: email,
      plano_id: planoStarter.id,
      afiliado_id: afiliadoId,
      saldo_creditos: planoStarter.creditos_mensais, // Créditos iniciais do plano
      status: 'ativo',
      teste_termina_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias de teste
    });

    // Criar usuário administrador
    const senhaHash = await gerarHashSenha(senha);
    const tokenVerificacao = gerarToken();

    const usuario = await usuarioRepositorio.criar({
      empresa_id: empresa.id,
      email: email,
      senha_hash: senhaHash,
      nome: nome,
      funcao: 'empresa', // Dono da empresa
      permissoes: {
        empresa: ['*'],
        usuarios: ['*'],
        instancias: ['*'],
        ia: ['*'],
        chat: ['*'],
        crm: ['*'],
        prospeccao: ['*'],
        financeiro: ['visualizar']
      },
      email_verificado: false,
      token_verificacao_email: tokenVerificacao
    });

    // Gerar tokens para login automático
    const tokenAcesso = gerarTokenAcesso(usuario, empresa);
    const tokenAtualizacao = gerarTokenAtualizacao(usuario.id);

    // Salvar sessão inicial
    await sessaoRepositorio.criar({
      usuario_id: usuario.id,
      token_atualizacao: tokenAtualizacao,
      info_dispositivo: dados.infoDispositivo || {},
      endereco_ip: null,
      expira_em: calcularExpiracao('7d')
    });

    // Enviar email de verificação (em background para não travar o cadastro)
    enviarEmailVerificacao(usuario, tokenVerificacao).catch(err => {
      console.error('Erro ao enviar email de verificação:', err.message);
    });

    // Enviar email de boas-vindas (em background)
    enviarEmailBoasVindas(usuario, empresa).catch(err => {
      console.error('Erro ao enviar email de boas-vindas:', err.message);
    });

    return {
      token: tokenAcesso, // Nome esperado pelo frontend
      tokenAcesso,
      tokenAtualizacao,
      usuario: this._sanitizarUsuario(usuario),
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        slug: empresa.slug
      },
      mensagem: 'Cadastro realizado com sucesso!'
    };
  },

  /**
   * Entrar (login)
   */
  async entrar(dados, infoDispositivo = {}) {
    const { email, senha } = dados;

    // Buscar usuário
    const usuario = await usuarioRepositorio.buscarPorEmail(email);
    if (!usuario) {
      throw new Error('Email ou senha incorretos');
    }

    // Verificar senha
    const senhaValida = await compararSenha(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new Error('Email ou senha incorretos');
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      throw new Error('Usuário inativo. Entre em contato com o suporte.');
    }

    // Buscar empresa
    let empresa = null;
    if (usuario.empresa_id) {
      empresa = await empresaRepositorio.buscarPorId(usuario.empresa_id);

      // Verificar status da empresa
      if (empresa.status !== 'ativo') {
        throw new Error('Empresa inativa. Verifique sua assinatura.');
      }
    }

    // Gerar tokens
    const tokenAcesso = gerarTokenAcesso(usuario, empresa);
    const tokenAtualizacao = gerarTokenAtualizacao(usuario.id);

    // Salvar sessão
    await sessaoRepositorio.criar({
      usuario_id: usuario.id,
      token_atualizacao: tokenAtualizacao,
      info_dispositivo: infoDispositivo,
      endereco_ip: infoDispositivo.ip || null,
      expira_em: calcularExpiracao('7d')
    });

    // Atualizar último login
    await usuarioRepositorio.atualizarUltimoLogin(usuario.id);

    return {
      token: tokenAcesso, // Nome esperado pelo frontend
      tokenAcesso,
      tokenAtualizacao,
      usuario: this._sanitizarUsuario(usuario),
      empresa: empresa ? {
        id: empresa.id,
        nome: empresa.nome,
        slug: empresa.slug,
        plano_nome: empresa.plano_nome,
        saldo_creditos: empresa.saldo_creditos
      } : null
    };
  },

  /**
   * Atualizar token
   */
  async atualizarToken(tokenAtualizacao) {
    // Verificar token
    let payload;
    try {
      payload = verificarToken(tokenAtualizacao);
    } catch (erro) {
      throw new Error('Token de atualização inválido ou expirado');
    }

    // Verificar se sessão existe
    const sessao = await sessaoRepositorio.buscarPorToken(tokenAtualizacao);
    if (!sessao) {
      throw new Error('Sessão não encontrada');
    }

    // Buscar usuário
    const usuario = await usuarioRepositorio.buscarPorId(payload.usuarioId);
    if (!usuario || !usuario.ativo) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    // Buscar empresa
    let empresa = null;
    if (usuario.empresa_id) {
      empresa = await empresaRepositorio.buscarPorId(usuario.empresa_id);
    }

    // Gerar novo token de acesso
    const novoTokenAcesso = gerarTokenAcesso(usuario, empresa);

    return {
      tokenAcesso: novoTokenAcesso,
      usuario: this._sanitizarUsuario(usuario),
      empresa: empresa ? {
        id: empresa.id,
        nome: empresa.nome,
        slug: empresa.slug
      } : null
    };
  },

  /**
   * Sair (logout)
   */
  async sair(tokenAtualizacao) {
    await sessaoRepositorio.deletar(tokenAtualizacao);
    return { mensagem: 'Saiu com sucesso' };
  },

  /**
   * Sair de todos os dispositivos
   */
  async sairTodos(usuarioId) {
    await sessaoRepositorio.deletarTodasDoUsuario(usuarioId);
    return { mensagem: 'Saiu de todos os dispositivos' };
  },

  /**
   * Esqueci a senha
   */
  async esqueciSenha(email) {
    const usuario = await usuarioRepositorio.buscarPorEmail(email);

    // Sempre retornar sucesso (segurança)
    if (!usuario) {
      return {
        mensagem: 'Se o email existir, você receberá instruções para redefinir a senha'
      };
    }

    // Gerar token
    const token = gerarToken();
    const expiracao = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token
    await usuarioRepositorio.definirTokenResetSenha(usuario.id, token, expiracao);

    // Enviar email
    await enviarEmailRedefinirSenha(usuario, token);

    return {
      mensagem: 'Se o email existir, você receberá instruções para redefinir a senha'
    };
  },

  /**
   * Redefinir senha
   */
  async redefinirSenha(token, novaSenha) {
    // Buscar usuário por token
    const usuario = await usuarioRepositorio.buscarPorTokenReset(token);
    if (!usuario) {
      throw new Error('Token inválido ou expirado');
    }

    // Validar senha
    const validacaoSenha = validarForcaSenha(novaSenha);
    if (!validacaoSenha.valida) {
      throw new Error(validacaoSenha.erros.join(', '));
    }

    // Atualizar senha
    const senhaHash = await gerarHashSenha(novaSenha);
    await usuarioRepositorio.atualizar(usuario.id, { senha_hash: senhaHash });

    // Limpar token
    await usuarioRepositorio.limparTokenReset(usuario.id);

    // Invalidar todas as sessões (por segurança)
    await sessaoRepositorio.deletarTodasDoUsuario(usuario.id);

    return { mensagem: 'Senha redefinida com sucesso' };
  },

  /**
   * Verificar email
   */
  async verificarEmail(token) {
    const usuario = await usuarioRepositorio.buscarPorTokenVerificacao(token);
    if (!usuario) {
      throw new Error('Token de verificação inválido');
    }

    await usuarioRepositorio.verificarEmail(usuario.id);

    return {
      mensagem: 'Email verificado com sucesso!',
      usuario: this._sanitizarUsuario(usuario)
    };
  },

  /**
   * Alterar senha (usuário autenticado)
   */
  async alterarSenha(usuarioId, senhaAtual, novaSenha) {
    const usuario = await usuarioRepositorio.buscarPorId(usuarioId);

    // Verificar senha atual
    const senhaValida = await compararSenha(senhaAtual, usuario.senha_hash);
    if (!senhaValida) {
      throw new Error('Senha atual incorreta');
    }

    // Validar nova senha
    const validacaoSenha = validarForcaSenha(novaSenha);
    if (!validacaoSenha.valida) {
      throw new Error(validacaoSenha.erros.join(', '));
    }

    // Atualizar senha
    const senhaHash = await gerarHashSenha(novaSenha);
    await usuarioRepositorio.atualizar(usuarioId, { senha_hash: senhaHash });

    // Invalidar todas as sessões exceto a atual (implementar depois)
    // Por ora, invalida todas
    await sessaoRepositorio.deletarTodasDoUsuario(usuarioId);

    return { mensagem: 'Senha alterada com sucesso' };
  },

  /**
   * Sanitizar dados do usuário (remover senha, etc)
   */
  _sanitizarUsuario(usuario) {
    const { senha_hash, token_verificacao_email, token_redefinir_senha, ...usuarioLimpo } = usuario;
    return usuarioLimpo;
  }
};

module.exports = autenticacaoServico;
