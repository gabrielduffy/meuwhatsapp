const express = require('express');
const router = express.Router();
const whitelabelRepo = require('../repositorios/whitelabel.repositorio');
const whitelabelServico = require('../servicos/whitelabel.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');

// Aplicar autenticação em todas as rotas
router.use(autenticarMiddleware);

// ==================== CONFIGURAÇÕES ====================

/**
 * Buscar configuração de white label
 */
router.get('/config', async (req, res) => {
  try {
    const config = await whitelabelServico.buscarConfigCompleta(req.empresaId);
    res.json(config || {});
  } catch (erro) {
    console.error('Erro ao buscar configuração:', erro);
    res.status(500).json({ erro: 'Erro ao buscar configuração' });
  }
});

/**
 * Salvar configuração geral
 */
router.put('/config', async (req, res) => {
  try {
    const config = await whitelabelRepo.salvarConfig(req.empresaId, {
      nomeSistema: req.body.nome_sistema,
      logoUrl: req.body.logo_url,
      logoPequenaUrl: req.body.logo_pequena_url,
      faviconUrl: req.body.favicon_url,
      telefoneSuporte: req.body.telefone_suporte,
      emailSuporte: req.body.email_suporte,
      endereco: req.body.endereco,
      metaTitulo: req.body.meta_titulo,
      metaDescricao: req.body.meta_descricao,
      metaPalavrasChave: req.body.meta_palavras_chave,
      mostrarPoweredBy: req.body.mostrar_powered_by,
      permitirCadastroPublico: req.body.permitir_cadastro_publico,
      ativo: req.body.ativo
    });

    res.json({
      mensagem: 'Configuração salva com sucesso!',
      config
    });
  } catch (erro) {
    console.error('Erro ao salvar configuração:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Aplicar tema (cores e fontes)
 */
router.put('/config/tema', async (req, res) => {
  try {
    const config = await whitelabelServico.aplicarTema(req.empresaId, req.body);

    res.json({
      mensagem: 'Tema aplicado com sucesso!',
      config
    });
  } catch (erro) {
    console.error('Erro ao aplicar tema:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Salvar CSS customizado
 */
router.put('/config/css', async (req, res) => {
  try {
    const { css_customizado } = req.body;

    const config = await whitelabelRepo.salvarConfig(req.empresaId, {
      cssCustomizado: css_customizado
    });

    res.json({
      mensagem: 'CSS customizado salvo com sucesso!',
      config
    });
  } catch (erro) {
    console.error('Erro ao salvar CSS:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Salvar redes sociais
 */
router.put('/config/redes-sociais', async (req, res) => {
  try {
    const config = await whitelabelRepo.salvarConfig(req.empresaId, {
      facebookUrl: req.body.facebook_url,
      instagramUrl: req.body.instagram_url,
      twitterUrl: req.body.twitter_url,
      linkedinUrl: req.body.linkedin_url,
      youtubeUrl: req.body.youtube_url
    });

    res.json({
      mensagem: 'Redes sociais salvas com sucesso!',
      config
    });
  } catch (erro) {
    console.error('Erro ao salvar redes sociais:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== EMAIL ====================

/**
 * Salvar configuração de email
 */
router.put('/config/email', async (req, res) => {
  try {
    const config = await whitelabelServico.salvarConfigEmail(req.empresaId, req.body);

    res.json({
      mensagem: 'Configuração de email salva com sucesso!',
      config
    });
  } catch (erro) {
    console.error('Erro ao salvar configuração de email:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Testar configuração de email
 */
router.post('/config/email/testar', async (req, res) => {
  try {
    const { email_destino } = req.body;

    if (!email_destino) {
      return res.status(400).json({ erro: 'Email de destino é obrigatório' });
    }

    const resultado = await whitelabelServico.testarConfigEmail(req.empresaId, email_destino);

    res.json(resultado);
  } catch (erro) {
    console.error('Erro ao testar email:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== DOMÍNIOS ====================

/**
 * Listar domínios
 */
router.get('/dominios', async (req, res) => {
  try {
    const dominios = await whitelabelRepo.listarDominios(req.empresaId);
    res.json(dominios);
  } catch (erro) {
    console.error('Erro ao listar domínios:', erro);
    res.status(500).json({ erro: 'Erro ao listar domínios' });
  }
});

/**
 * Buscar domínio por ID
 */
router.get('/dominios/:id', async (req, res) => {
  try {
    const dominio = await whitelabelRepo.buscarDominioPorId(req.params.id, req.empresaId);

    if (!dominio) {
      return res.status(404).json({ erro: 'Domínio não encontrado' });
    }

    res.json(dominio);
  } catch (erro) {
    console.error('Erro ao buscar domínio:', erro);
    res.status(500).json({ erro: 'Erro ao buscar domínio' });
  }
});

/**
 * Adicionar domínio customizado
 */
router.post('/dominios', async (req, res) => {
  try {
    const { dominio, tipo } = req.body;

    if (!dominio) {
      return res.status(400).json({ erro: 'Domínio é obrigatório' });
    }

    const resultado = await whitelabelServico.adicionarDominio(req.empresaId, dominio, tipo);

    res.status(201).json({
      mensagem: 'Domínio adicionado com sucesso! Agora você precisa verificá-lo.',
      dominio: resultado
    });
  } catch (erro) {
    console.error('Erro ao adicionar domínio:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Verificar domínio
 */
router.post('/dominios/:id/verificar', async (req, res) => {
  try {
    const resultado = await whitelabelServico.verificarDominio(req.params.id, req.empresaId);

    if (resultado.verificado) {
      res.json({
        mensagem: resultado.mensagem,
        verificado: true
      });
    } else {
      res.status(400).json({
        mensagem: resultado.mensagem,
        verificado: false,
        erro: resultado.erro
      });
    }
  } catch (erro) {
    console.error('Erro ao verificar domínio:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Ativar domínio
 */
router.post('/dominios/:id/ativar', async (req, res) => {
  try {
    const { principal } = req.body;

    const dominio = await whitelabelServico.ativarDominio(req.params.id, req.empresaId, principal);

    res.json({
      mensagem: 'Domínio ativado com sucesso!',
      dominio
    });
  } catch (erro) {
    console.error('Erro ao ativar domínio:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Definir como domínio principal
 */
router.post('/dominios/:id/principal', async (req, res) => {
  try {
    const dominio = await whitelabelServico.definirDominioPrincipal(req.params.id, req.empresaId);

    res.json({
      mensagem: 'Domínio definido como principal com sucesso!',
      dominio
    });
  } catch (erro) {
    console.error('Erro ao definir domínio principal:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar domínio
 */
router.delete('/dominios/:id', async (req, res) => {
  try {
    await whitelabelRepo.deletarDominio(req.params.id, req.empresaId);

    res.json({ mensagem: 'Domínio excluído com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar domínio:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== PÁGINAS ====================

/**
 * Listar páginas
 */
router.get('/paginas', async (req, res) => {
  try {
    const { publicada } = req.query;
    const paginas = await whitelabelRepo.listarPaginas(
      req.empresaId,
      publicada !== undefined ? publicada === 'true' : null
    );
    res.json(paginas);
  } catch (erro) {
    console.error('Erro ao listar páginas:', erro);
    res.status(500).json({ erro: 'Erro ao listar páginas' });
  }
});

/**
 * Buscar página por ID
 */
router.get('/paginas/:id', async (req, res) => {
  try {
    const pagina = await whitelabelRepo.buscarPaginaPorId(req.params.id, req.empresaId);

    if (!pagina) {
      return res.status(404).json({ erro: 'Página não encontrada' });
    }

    res.json(pagina);
  } catch (erro) {
    console.error('Erro ao buscar página:', erro);
    res.status(500).json({ erro: 'Erro ao buscar página' });
  }
});

/**
 * Buscar página por slug
 */
router.get('/paginas/slug/:slug', async (req, res) => {
  try {
    const pagina = await whitelabelRepo.buscarPaginaPorSlug(req.params.slug, req.empresaId);

    if (!pagina) {
      return res.status(404).json({ erro: 'Página não encontrada' });
    }

    res.json(pagina);
  } catch (erro) {
    console.error('Erro ao buscar página:', erro);
    res.status(500).json({ erro: 'Erro ao buscar página' });
  }
});

/**
 * Criar página
 */
router.post('/paginas', async (req, res) => {
  try {
    const pagina = await whitelabelRepo.criarPagina({
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Página criada com sucesso!',
      pagina
    });
  } catch (erro) {
    console.error('Erro ao criar página:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Atualizar página
 */
router.put('/paginas/:id', async (req, res) => {
  try {
    const pagina = await whitelabelRepo.atualizarPagina(req.params.id, req.empresaId, req.body);

    if (!pagina) {
      return res.status(404).json({ erro: 'Página não encontrada' });
    }

    res.json({
      mensagem: 'Página atualizada com sucesso!',
      pagina
    });
  } catch (erro) {
    console.error('Erro ao atualizar página:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar página
 */
router.delete('/paginas/:id', async (req, res) => {
  try {
    await whitelabelRepo.deletarPagina(req.params.id, req.empresaId);

    res.json({ mensagem: 'Página excluída com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar página:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== SCRIPTS ====================

/**
 * Listar scripts
 */
router.get('/scripts', async (req, res) => {
  try {
    const scripts = await whitelabelRepo.listarScripts(req.empresaId);
    res.json(scripts);
  } catch (erro) {
    console.error('Erro ao listar scripts:', erro);
    res.status(500).json({ erro: 'Erro ao listar scripts' });
  }
});

/**
 * Buscar script por ID
 */
router.get('/scripts/:id', async (req, res) => {
  try {
    const script = await whitelabelRepo.buscarScriptPorId(req.params.id, req.empresaId);

    if (!script) {
      return res.status(404).json({ erro: 'Script não encontrado' });
    }

    res.json(script);
  } catch (erro) {
    console.error('Erro ao buscar script:', erro);
    res.status(500).json({ erro: 'Erro ao buscar script' });
  }
});

/**
 * Criar script
 */
router.post('/scripts', async (req, res) => {
  try {
    const script = await whitelabelRepo.criarScript({
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Script criado com sucesso!',
      script
    });
  } catch (erro) {
    console.error('Erro ao criar script:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Atualizar script
 */
router.put('/scripts/:id', async (req, res) => {
  try {
    const script = await whitelabelRepo.atualizarScript(req.params.id, req.empresaId, req.body);

    if (!script) {
      return res.status(404).json({ erro: 'Script não encontrado' });
    }

    res.json({
      mensagem: 'Script atualizado com sucesso!',
      script
    });
  } catch (erro) {
    console.error('Erro ao atualizar script:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar script
 */
router.delete('/scripts/:id', async (req, res) => {
  try {
    await whitelabelRepo.deletarScript(req.params.id, req.empresaId);

    res.json({ mensagem: 'Script excluído com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar script:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== REDIRECIONAMENTOS ====================

/**
 * Listar redirecionamentos
 */
router.get('/redirecionamentos', async (req, res) => {
  try {
    const redirecionamentos = await whitelabelRepo.listarRedirecionamentos(req.empresaId);
    res.json(redirecionamentos);
  } catch (erro) {
    console.error('Erro ao listar redirecionamentos:', erro);
    res.status(500).json({ erro: 'Erro ao listar redirecionamentos' });
  }
});

/**
 * Criar redirecionamento
 */
router.post('/redirecionamentos', async (req, res) => {
  try {
    const redirecionamento = await whitelabelRepo.criarRedirecionamento({
      empresaId: req.empresaId,
      ...req.body
    });

    res.status(201).json({
      mensagem: 'Redirecionamento criado com sucesso!',
      redirecionamento
    });
  } catch (erro) {
    console.error('Erro ao criar redirecionamento:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Deletar redirecionamento
 */
router.delete('/redirecionamentos/:id', async (req, res) => {
  try {
    await whitelabelRepo.deletarRedirecionamento(req.params.id, req.empresaId);

    res.json({ mensagem: 'Redirecionamento excluído com sucesso!' });
  } catch (erro) {
    console.error('Erro ao deletar redirecionamento:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ==================== PREVIEW ====================

/**
 * Gerar preview do tema atual
 */
router.get('/preview/css', async (req, res) => {
  try {
    const config = await whitelabelRepo.buscarConfig(req.empresaId);

    if (!config) {
      return res.status(404).json({ erro: 'Configuração não encontrada' });
    }

    const css = whitelabelServico.gerarCSSCustomizado(config);

    res.type('text/css').send(css);
  } catch (erro) {
    console.error('Erro ao gerar preview CSS:', erro);
    res.status(500).json({ erro: 'Erro ao gerar preview' });
  }
});

module.exports = router;
