const whitelabelServico = require('../servicos/whitelabel.servico');

/**
 * Middleware para detectar e aplicar configurações de white label baseado no domínio
 */
async function detectarWhiteLabel(req, res, next) {
  try {
    // Obter domínio do request
    const host = req.get('host') || req.hostname;

    if (!host) {
      return next();
    }

    // Buscar configuração por domínio
    const config = await whitelabelServico.buscarConfigPorDominio(host);

    if (config) {
      // Anexar configuração ao request
      req.whitelabel = config;
      req.empresaIdWhitelabel = config.empresa_id;

      // Se a rota for pública, definir empresa_id automaticamente
      if (!req.empresaId && config.empresa_id) {
        req.empresaId = config.empresa_id;
      }
    }

    next();
  } catch (erro) {
    console.error('[White Label Middleware] Erro:', erro);
    // Não bloquear request em caso de erro
    next();
  }
}

/**
 * Middleware para processar redirecionamentos
 */
async function processarRedirecionamentos(req, res, next) {
  try {
    // Apenas processar para empresas com white label
    if (!req.whitelabel) {
      return next();
    }

    const origem = req.path;
    const empresaId = req.whitelabel.empresa_id;

    // Buscar redirecionamento
    const redirect = await whitelabelServico.processarRedirecionamento(origem, empresaId);

    if (redirect) {
      return res.redirect(redirect.tipo, redirect.destino);
    }

    next();
  } catch (erro) {
    console.error('[Redirecionamento Middleware] Erro:', erro);
    next();
  }
}

/**
 * Middleware para injetar CSS customizado nas respostas HTML
 */
function injetarCSSCustomizado(req, res, next) {
  if (!req.whitelabel) {
    return next();
  }

  // Interceptar res.send para injetar CSS
  const originalSend = res.send;

  res.send = function(data) {
    // Apenas processar HTML
    const contentType = res.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return originalSend.call(this, data);
    }

    // Se tiver CSS customizado, injetar
    if (req.whitelabel.css_gerado) {
      const css = `<style>${req.whitelabel.css_gerado}</style>`;

      if (typeof data === 'string' && data.includes('</head>')) {
        data = data.replace('</head>', `${css}</head>`);
      }
    }

    // Injetar scripts customizados
    if (req.whitelabel.scripts && req.whitelabel.scripts.length > 0) {
      const scriptsHead = req.whitelabel.scripts
        .filter(s => s.posicao === 'head')
        .map(s => s.script)
        .join('\n');

      const scriptsBodyInicio = req.whitelabel.scripts
        .filter(s => s.posicao === 'body_inicio')
        .map(s => s.script)
        .join('\n');

      const scriptsBodyFim = req.whitelabel.scripts
        .filter(s => s.posicao === 'body_fim')
        .map(s => s.script)
        .join('\n');

      if (typeof data === 'string') {
        if (scriptsHead && data.includes('</head>')) {
          data = data.replace('</head>', `${scriptsHead}\n</head>`);
        }

        if (scriptsBodyInicio && data.includes('<body>')) {
          data = data.replace('<body>', `<body>\n${scriptsBodyInicio}`);
        } else if (scriptsBodyInicio && data.includes('<body')) {
          // Caso tenha atributos no body
          data = data.replace(/(<body[^>]*>)/, `$1\n${scriptsBodyInicio}`);
        }

        if (scriptsBodyFim && data.includes('</body>')) {
          data = data.replace('</body>', `${scriptsBodyFim}\n</body>`);
        }
      }
    }

    // Substituir branding
    if (req.whitelabel.nome_sistema && typeof data === 'string') {
      // Substituir título padrão
      data = data.replace(/WhatsBenemax/g, req.whitelabel.nome_sistema);

      // Trocar logo se configurado
      if (req.whitelabel.logo_url) {
        data = data.replace(
          /src=["']([^"']*logo[^"']*)["']/gi,
          `src="${req.whitelabel.logo_url}"`
        );
      }

      // Trocar favicon se configurado
      if (req.whitelabel.favicon_url) {
        data = data.replace(
          /href=["']([^"']*favicon[^"']*)["']/gi,
          `href="${req.whitelabel.favicon_url}"`
        );
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware para adicionar meta tags customizadas
 */
function adicionarMetaTags(req, res, next) {
  if (!req.whitelabel) {
    return next();
  }

  // Armazenar meta tags para uso nos templates
  res.locals.metaTags = {
    titulo: req.whitelabel.meta_titulo || req.whitelabel.nome_sistema || 'WhatsBenemax',
    descricao: req.whitelabel.meta_descricao || 'Plataforma de automação de WhatsApp',
    palavrasChave: req.whitelabel.meta_palavras_chave || 'whatsapp,automação,chatbot'
  };

  res.locals.whitelabel = req.whitelabel;

  next();
}

/**
 * Middleware combinado para white label
 */
async function whitelabelMiddleware(req, res, next) {
  await detectarWhiteLabel(req, res, async () => {
    await processarRedirecionamentos(req, res, () => {
      injetarCSSCustomizado(req, res, () => {
        adicionarMetaTags(req, res, next);
      });
    });
  });
}

module.exports = {
  whitelabelMiddleware,
  detectarWhiteLabel,
  processarRedirecionamentos,
  injetarCSSCustomizado,
  adicionarMetaTags
};
