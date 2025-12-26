const { query } = require('../config/database');

// ==================== CONFIGURAÇÕES ====================

/**
 * Buscar configuração de white label de uma empresa
 */
async function buscarConfig(empresaId) {
  const sql = 'SELECT * FROM whitelabel_config WHERE empresa_id = $1';
  const resultado = await query(sql, [empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Criar ou atualizar configuração
 */
async function salvarConfig(empresaId, dados) {
  const {
    nomeSistema, logoUrl, logoPequenaUrl, faviconUrl,
    corPrimaria, corSecundaria, corSucesso, corErro, corAviso, corInfo, corFundo, corTexto,
    fontePrimaria, fonteSecundaria,
    cssCustomizado,
    emailRemetente, emailNomeRemetente,
    smtpHost, smtpPort, smtpUsuario, smtpSenha, smtpSeguro,
    templateBoasVindas, templateRecuperacaoSenha, templateNovaCobranca,
    facebookUrl, instagramUrl, twitterUrl, linkedinUrl, youtubeUrl,
    telefoneSuporte, emailSuporte, endereco,
    metaTitulo, metaDescricao, metaPalavrasChave,
    mostrarPoweredBy, permitirCadastroPublico,
    ativo
  } = dados;

  const sql = `
    INSERT INTO whitelabel_config (
      empresa_id, nome_sistema, logo_url, logo_pequena_url, favicon_url,
      cor_primaria, cor_secundaria, cor_sucesso, cor_erro, cor_aviso, cor_info, cor_fundo, cor_texto,
      fonte_primaria, fonte_secundaria, css_customizado,
      email_remetente, email_nome_remetente,
      smtp_host, smtp_port, smtp_usuario, smtp_senha, smtp_seguro,
      template_boas_vindas, template_recuperacao_senha, template_nova_cobranca,
      facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url,
      telefone_suporte, email_suporte, endereco,
      meta_titulo, meta_descricao, meta_palavras_chave,
      mostrar_powered_by, permitir_cadastro_publico, ativo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
    )
    ON CONFLICT (empresa_id) DO UPDATE SET
      nome_sistema = COALESCE($2, whitelabel_config.nome_sistema),
      logo_url = COALESCE($3, whitelabel_config.logo_url),
      logo_pequena_url = COALESCE($4, whitelabel_config.logo_pequena_url),
      favicon_url = COALESCE($5, whitelabel_config.favicon_url),
      cor_primaria = COALESCE($6, whitelabel_config.cor_primaria),
      cor_secundaria = COALESCE($7, whitelabel_config.cor_secundaria),
      cor_sucesso = COALESCE($8, whitelabel_config.cor_sucesso),
      cor_erro = COALESCE($9, whitelabel_config.cor_erro),
      cor_aviso = COALESCE($10, whitelabel_config.cor_aviso),
      cor_info = COALESCE($11, whitelabel_config.cor_info),
      cor_fundo = COALESCE($12, whitelabel_config.cor_fundo),
      cor_texto = COALESCE($13, whitelabel_config.cor_texto),
      fonte_primaria = COALESCE($14, whitelabel_config.fonte_primaria),
      fonte_secundaria = COALESCE($15, whitelabel_config.fonte_secundaria),
      css_customizado = COALESCE($16, whitelabel_config.css_customizado),
      email_remetente = COALESCE($17, whitelabel_config.email_remetente),
      email_nome_remetente = COALESCE($18, whitelabel_config.email_nome_remetente),
      smtp_host = COALESCE($19, whitelabel_config.smtp_host),
      smtp_port = COALESCE($20, whitelabel_config.smtp_port),
      smtp_usuario = COALESCE($21, whitelabel_config.smtp_usuario),
      smtp_senha = COALESCE($22, whitelabel_config.smtp_senha),
      smtp_seguro = COALESCE($23, whitelabel_config.smtp_seguro),
      template_boas_vindas = COALESCE($24, whitelabel_config.template_boas_vindas),
      template_recuperacao_senha = COALESCE($25, whitelabel_config.template_recuperacao_senha),
      template_nova_cobranca = COALESCE($26, whitelabel_config.template_nova_cobranca),
      facebook_url = COALESCE($27, whitelabel_config.facebook_url),
      instagram_url = COALESCE($28, whitelabel_config.instagram_url),
      twitter_url = COALESCE($29, whitelabel_config.twitter_url),
      linkedin_url = COALESCE($30, whitelabel_config.linkedin_url),
      youtube_url = COALESCE($31, whitelabel_config.youtube_url),
      telefone_suporte = COALESCE($32, whitelabel_config.telefone_suporte),
      email_suporte = COALESCE($33, whitelabel_config.email_suporte),
      endereco = COALESCE($34, whitelabel_config.endereco),
      meta_titulo = COALESCE($35, whitelabel_config.meta_titulo),
      meta_descricao = COALESCE($36, whitelabel_config.meta_descricao),
      meta_palavras_chave = COALESCE($37, whitelabel_config.meta_palavras_chave),
      mostrar_powered_by = COALESCE($38, whitelabel_config.mostrar_powered_by),
      permitir_cadastro_publico = COALESCE($39, whitelabel_config.permitir_cadastro_publico),
      ativo = COALESCE($40, whitelabel_config.ativo)
    RETURNING *
  `;

  const resultado = await query(sql, [
    empresaId, nomeSistema, logoUrl, logoPequenaUrl, faviconUrl,
    corPrimaria, corSecundaria, corSucesso, corErro, corAviso, corInfo, corFundo, corTexto,
    fontePrimaria, fonteSecundaria, cssCustomizado,
    emailRemetente, emailNomeRemetente,
    smtpHost, smtpPort, smtpUsuario, smtpSenha, smtpSeguro,
    templateBoasVindas, templateRecuperacaoSenha, templateNovaCobranca,
    facebookUrl, instagramUrl, twitterUrl, linkedinUrl, youtubeUrl,
    telefoneSuporte, emailSuporte, endereco,
    metaTitulo, metaDescricao, metaPalavrasChave,
    mostrarPoweredBy, permitirCadastroPublico, ativo
  ]);

  return resultado.rows[0];
}

// ==================== DOMÍNIOS ====================

/**
 * Listar domínios de uma empresa
 */
async function listarDominios(empresaId) {
  const sql = `
    SELECT * FROM whitelabel_dominios
    WHERE empresa_id = $1
    ORDER BY principal DESC, criado_em ASC
  `;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

/**
 * Buscar domínio por ID
 */
async function buscarDominioPorId(id, empresaId) {
  const sql = 'SELECT * FROM whitelabel_dominios WHERE id = $1 AND empresa_id = $2';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Buscar domínio por nome
 */
async function buscarDominioPorNome(dominio) {
  const sql = 'SELECT * FROM whitelabel_dominios WHERE dominio = $1';
  const resultado = await query(sql, [dominio]);
  return resultado.rows[0] || null;
}

/**
 * Buscar domínio principal de uma empresa
 */
async function buscarDominioPrincipal(empresaId) {
  const sql = 'SELECT * FROM whitelabel_dominios WHERE empresa_id = $1 AND principal = true';
  const resultado = await query(sql, [empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Criar domínio
 */
async function criarDominio(dados) {
  const {
    empresaId, dominio, tipo,
    verificacaoTipo, verificacaoToken,
    dnsTipo, dnsNome, dnsValor,
    principal
  } = dados;

  const sql = `
    INSERT INTO whitelabel_dominios (
      empresa_id, dominio, tipo,
      verificacao_tipo, verificacao_token,
      dns_tipo, dns_nome, dns_valor,
      principal, ativo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
    RETURNING *
  `;

  const resultado = await query(sql, [
    empresaId, dominio, tipo,
    verificacaoTipo || 'dns', verificacaoToken,
    dnsTipo || 'TXT', dnsNome, dnsValor,
    principal || false
  ]);

  return resultado.rows[0];
}

/**
 * Atualizar domínio
 */
async function atualizarDominio(id, empresaId, dados) {
  const {
    verificado, verificadoEm,
    sslAtivo, sslEmissor, sslExpiraEm,
    ativo, principal
  } = dados;

  const sql = `
    UPDATE whitelabel_dominios
    SET
      verificado = COALESCE($3, verificado),
      verificado_em = COALESCE($4, verificado_em),
      ssl_ativo = COALESCE($5, ssl_ativo),
      ssl_emissor = COALESCE($6, ssl_emissor),
      ssl_expira_em = COALESCE($7, ssl_expira_em),
      ativo = COALESCE($8, ativo),
      principal = COALESCE($9, principal)
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [
    id, empresaId,
    verificado, verificadoEm,
    sslAtivo, sslEmissor, sslExpiraEm,
    ativo, principal
  ]);

  return resultado.rows[0] || null;
}

/**
 * Deletar domínio
 */
async function deletarDominio(id, empresaId) {
  const sql = 'DELETE FROM whitelabel_dominios WHERE id = $1 AND empresa_id = $2';
  await query(sql, [id, empresaId]);
}

// ==================== PÁGINAS ====================

/**
 * Listar páginas de uma empresa
 */
async function listarPaginas(empresaId, publicada = null) {
  let sql = 'SELECT * FROM whitelabel_paginas WHERE empresa_id = $1';
  const params = [empresaId];

  if (publicada !== null) {
    sql += ' AND publicada = $2';
    params.push(publicada);
  }

  sql += ' ORDER BY ordem_menu ASC, criado_em ASC';

  const resultado = await query(sql, params);
  return resultado.rows;
}

/**
 * Buscar página por ID
 */
async function buscarPaginaPorId(id, empresaId) {
  const sql = 'SELECT * FROM whitelabel_paginas WHERE id = $1 AND empresa_id = $2';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Buscar página por slug
 */
async function buscarPaginaPorSlug(slug, empresaId) {
  const sql = 'SELECT * FROM whitelabel_paginas WHERE slug = $1 AND empresa_id = $2';
  const resultado = await query(sql, [slug, empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Criar página
 */
async function criarPagina(dados) {
  const {
    empresaId, slug, titulo, conteudo, conteudoHtml,
    metaTitulo, metaDescricao, metaImagemUrl,
    publicada, mostrarMenu, ordemMenu, template
  } = dados;

  const sql = `
    INSERT INTO whitelabel_paginas (
      empresa_id, slug, titulo, conteudo, conteudo_html,
      meta_titulo, meta_descricao, meta_imagem_url,
      publicada, mostrar_menu, ordem_menu, template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const resultado = await query(sql, [
    empresaId, slug, titulo, conteudo, conteudoHtml,
    metaTitulo, metaDescricao, metaImagemUrl,
    publicada || false, mostrarMenu || true, ordemMenu || 0, template || 'padrao'
  ]);

  return resultado.rows[0];
}

/**
 * Atualizar página
 */
async function atualizarPagina(id, empresaId, dados) {
  const {
    slug, titulo, conteudo, conteudoHtml,
    metaTitulo, metaDescricao, metaImagemUrl,
    publicada, mostrarMenu, ordemMenu, template
  } = dados;

  const sql = `
    UPDATE whitelabel_paginas
    SET
      slug = COALESCE($3, slug),
      titulo = COALESCE($4, titulo),
      conteudo = COALESCE($5, conteudo),
      conteudo_html = COALESCE($6, conteudo_html),
      meta_titulo = COALESCE($7, meta_titulo),
      meta_descricao = COALESCE($8, meta_descricao),
      meta_imagem_url = COALESCE($9, meta_imagem_url),
      publicada = COALESCE($10, publicada),
      mostrar_menu = COALESCE($11, mostrar_menu),
      ordem_menu = COALESCE($12, ordem_menu),
      template = COALESCE($13, template)
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [
    id, empresaId,
    slug, titulo, conteudo, conteudoHtml,
    metaTitulo, metaDescricao, metaImagemUrl,
    publicada, mostrarMenu, ordemMenu, template
  ]);

  return resultado.rows[0] || null;
}

/**
 * Deletar página
 */
async function deletarPagina(id, empresaId) {
  const sql = 'DELETE FROM whitelabel_paginas WHERE id = $1 AND empresa_id = $2';
  await query(sql, [id, empresaId]);
}

// ==================== SCRIPTS ====================

/**
 * Listar scripts de uma empresa
 */
async function listarScripts(empresaId) {
  const sql = `
    SELECT * FROM whitelabel_scripts
    WHERE empresa_id = $1
    ORDER BY ordem ASC, criado_em ASC
  `;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

/**
 * Buscar script por ID
 */
async function buscarScriptPorId(id, empresaId) {
  const sql = 'SELECT * FROM whitelabel_scripts WHERE id = $1 AND empresa_id = $2';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Criar script
 */
async function criarScript(dados) {
  const { empresaId, nome, descricao, script, posicao, ativo, ordem } = dados;

  const sql = `
    INSERT INTO whitelabel_scripts (
      empresa_id, nome, descricao, script, posicao, ativo, ordem
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const resultado = await query(sql, [
    empresaId, nome, descricao, script,
    posicao || 'head', ativo !== false, ordem || 0
  ]);

  return resultado.rows[0];
}

/**
 * Atualizar script
 */
async function atualizarScript(id, empresaId, dados) {
  const { nome, descricao, script, posicao, ativo, ordem } = dados;

  const sql = `
    UPDATE whitelabel_scripts
    SET
      nome = COALESCE($3, nome),
      descricao = COALESCE($4, descricao),
      script = COALESCE($5, script),
      posicao = COALESCE($6, posicao),
      ativo = COALESCE($7, ativo),
      ordem = COALESCE($8, ordem)
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [
    id, empresaId, nome, descricao, script, posicao, ativo, ordem
  ]);

  return resultado.rows[0] || null;
}

/**
 * Deletar script
 */
async function deletarScript(id, empresaId) {
  const sql = 'DELETE FROM whitelabel_scripts WHERE id = $1 AND empresa_id = $2';
  await query(sql, [id, empresaId]);
}

// ==================== REDIRECIONAMENTOS ====================

/**
 * Listar redirecionamentos
 */
async function listarRedirecionamentos(empresaId) {
  const sql = `
    SELECT * FROM whitelabel_redirecionamentos
    WHERE empresa_id = $1
    ORDER BY criado_em DESC
  `;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

/**
 * Buscar redirecionamento por origem
 */
async function buscarRedirecionamentoPorOrigem(origem, empresaId) {
  const sql = `
    SELECT * FROM whitelabel_redirecionamentos
    WHERE origem = $1 AND empresa_id = $2 AND ativo = true
  `;
  const resultado = await query(sql, [origem, empresaId]);
  return resultado.rows[0] || null;
}

/**
 * Criar redirecionamento
 */
async function criarRedirecionamento(dados) {
  const { empresaId, origem, destino, tipo, ativo } = dados;

  const sql = `
    INSERT INTO whitelabel_redirecionamentos (
      empresa_id, origem, destino, tipo, ativo
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const resultado = await query(sql, [
    empresaId, origem, destino, tipo || 301, ativo !== false
  ]);

  return resultado.rows[0];
}

/**
 * Registrar acesso a redirecionamento
 */
async function registrarAcessoRedirecionamento(id, empresaId) {
  const sql = `
    UPDATE whitelabel_redirecionamentos
    SET
      total_acessos = total_acessos + 1,
      ultimo_acesso = NOW()
    WHERE id = $1 AND empresa_id = $2
  `;
  await query(sql, [id, empresaId]);
}

/**
 * Deletar redirecionamento
 */
async function deletarRedirecionamento(id, empresaId) {
  const sql = 'DELETE FROM whitelabel_redirecionamentos WHERE id = $1 AND empresa_id = $2';
  await query(sql, [id, empresaId]);
}

// ==================== VERIFICAÇÕES DNS ====================

/**
 * Criar verificação DNS
 */
async function criarVerificacaoDNS(dados) {
  const {
    dominioId, empresaId, tipoRegistro, nome, valorEsperado
  } = dados;

  const sql = `
    INSERT INTO whitelabel_verificacoes_dns (
      dominio_id, empresa_id, tipo_registro, nome, valor_esperado,
      status, tentativas, proxima_tentativa
    ) VALUES ($1, $2, $3, $4, $5, 'pendente', 0, NOW())
    RETURNING *
  `;

  const resultado = await query(sql, [
    dominioId, empresaId, tipoRegistro, nome, valorEsperado
  ]);

  return resultado.rows[0];
}

/**
 * Atualizar verificação DNS
 */
async function atualizarVerificacaoDNS(id, dados) {
  const { valorEncontrado, status, mensagem } = dados;

  const sql = `
    UPDATE whitelabel_verificacoes_dns
    SET
      valor_encontrado = $2,
      status = $3,
      mensagem = $4,
      tentativas = tentativas + 1,
      ultima_tentativa = NOW(),
      proxima_tentativa = NOW() + INTERVAL '1 hour'
    WHERE id = $1
    RETURNING *
  `;

  const resultado = await query(sql, [id, valorEncontrado, status, mensagem]);
  return resultado.rows[0] || null;
}

/**
 * Listar verificações pendentes
 */
async function listarVerificacoesPendentes() {
  const sql = `
    SELECT v.*, d.dominio
    FROM whitelabel_verificacoes_dns v
    JOIN whitelabel_dominios d ON d.id = v.dominio_id
    WHERE v.status = 'pendente'
    AND v.proxima_tentativa <= NOW()
    AND v.tentativas < 10
    ORDER BY v.proxima_tentativa ASC
    LIMIT 50
  `;
  const resultado = await query(sql);
  return resultado.rows;
}

// ==================== CERTIFICADOS SSL ====================

/**
 * Criar registro de certificado SSL
 */
async function criarCertificadoSSL(dados) {
  const {
    dominioId, empresaId, emissor, emitidoEm, expiraEm,
    tipo, algoritmo, fingerprint
  } = dados;

  const sql = `
    INSERT INTO whitelabel_certificados_ssl (
      dominio_id, empresa_id, emissor, emitido_em, expira_em,
      tipo, algoritmo, fingerprint, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ativo')
    RETURNING *
  `;

  const resultado = await query(sql, [
    dominioId, empresaId, emissor, emitidoEm, expiraEm,
    tipo, algoritmo, fingerprint
  ]);

  return resultado.rows[0];
}

/**
 * Listar certificados de um domínio
 */
async function listarCertificadosDominio(dominioId, empresaId) {
  const sql = `
    SELECT * FROM whitelabel_certificados_ssl
    WHERE dominio_id = $1 AND empresa_id = $2
    ORDER BY criado_em DESC
  `;
  const resultado = await query(sql, [dominioId, empresaId]);
  return resultado.rows;
}

module.exports = {
  // Configurações
  buscarConfig,
  salvarConfig,

  // Domínios
  listarDominios,
  buscarDominioPorId,
  buscarDominioPorNome,
  buscarDominioPrincipal,
  criarDominio,
  atualizarDominio,
  deletarDominio,

  // Páginas
  listarPaginas,
  buscarPaginaPorId,
  buscarPaginaPorSlug,
  criarPagina,
  atualizarPagina,
  deletarPagina,

  // Scripts
  listarScripts,
  buscarScriptPorId,
  criarScript,
  atualizarScript,
  deletarScript,

  // Redirecionamentos
  listarRedirecionamentos,
  buscarRedirecionamentoPorOrigem,
  criarRedirecionamento,
  registrarAcessoRedirecionamento,
  deletarRedirecionamento,

  // Verificações DNS
  criarVerificacaoDNS,
  atualizarVerificacaoDNS,
  listarVerificacoesPendentes,

  // Certificados SSL
  criarCertificadoSSL,
  listarCertificadosDominio
};
