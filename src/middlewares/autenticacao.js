const { verificarToken } = require('../utilitarios/jwt');
const usuarioRepositorio = require('../repositorios/usuario.repositorio');
const empresaRepositorio = require('../repositorios/empresa.repositorio');

/**
 * Middleware de autenticação JWT
 * Verifica se o usuário está autenticado
 */
async function autenticarMiddleware(req, res, next) {
  try {
    // Extrair token do header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({ erro: 'Formato de token inválido' });
    }

    const token = partes[1];

    // DEMO BYPASS
    if (token === 'DEMO_TOKEN' || process.env.NODE_ENV === 'development') {
      const { query } = require('../config/database');

      // Buscar ÚLTIMA empresa e usuário para simular sessão (alinhar com whatsapp.js)
      const empresaRes = await query('SELECT * FROM empresas ORDER BY criado_em DESC LIMIT 1');
      if (empresaRes.rows.length > 0) {
        console.log('[Auth Bypass] Usando Empresa ID:', empresaRes.rows[0].id);
      }
      const usuarioRes = await query('SELECT * FROM usuarios LIMIT 1');

      if (empresaRes.rows.length > 0) {
        req.empresa = empresaRes.rows[0];
        req.empresaId = req.empresa.id;

        if (usuarioRes.rows.length > 0) {
          req.usuario = usuarioRes.rows[0];
          req.usuarioId = req.usuario.id;
        } else {
          // Mock user se não houver usuários (FORMATO UUID VÁLIDO)
          const demoUuid = '00000000-0000-0000-0000-000000000000';
          req.usuario = { id: demoUuid, nome: 'Demo User', empresa_id: req.empresaId };
          req.usuarioId = demoUuid;
        }
        return next();
      }
    }

    // Verificar token
    let usuarioId;

    try {
      const payload = verificarToken(token);
      usuarioId = payload.usuarioId;
    } catch (e) {
      // Se JWT falhar, verifica se é um API TOKEN
      // Apenas se o formato parecer um UUID (para evitar query desnecessária com strings JWT longas)
      if (token.length < 100) { // UUID tem 36, assumindo token simples
        const { query } = require('../config/database');
        // Verifica se coluna existe primeiro para evitar erro em migração pendente? O setup já deve ter rodado.
        // Mas por segurança, wrap em try
        try {
          const userRes = await query('SELECT id FROM usuarios WHERE api_token = $1', [token]);
          if (userRes && userRes.rows.length > 0) {
            usuarioId = userRes.rows[0].id;
          } else {
            throw e; // Não achou token
          }
        } catch (dbErr) {
          throw e; // Erro de DB ou coluna inexistente
        }
      } else {
        throw e;
      }
    }

    // Buscar usuário
    const usuario = await usuarioRepositorio.buscarPorId(usuarioId);
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário não encontrado ou inativo' });
    }

    // Buscar empresa (se existir)
    let empresa = null;
    if (usuario.empresa_id) {
      empresa = await empresaRepositorio.buscarPorId(usuario.empresa_id);
      if (empresa.status !== 'ativo') {
        return res.status(403).json({ erro: 'Empresa inativa. Verifique sua assinatura.' });
      }
    }

    // Adicionar dados ao request
    req.usuario = usuario;
    req.empresa = empresa;
    req.usuarioId = usuario.id;
    req.empresaId = empresa?.id || null;

    next();
  } catch (erro) {
    if (erro.message === 'Token expirado') {
      return res.status(401).json({ erro: 'Token expirado', codigo: 'TOKEN_EXPIRADO' });
    }
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

/**
 * Middleware opcional de autenticação
 * Não bloqueia se não houver token, mas adiciona dados se houver
 */
async function autenticarOpcional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return next();
    }

    const token = partes[1];
    const payload = verificarToken(token);

    const usuario = await usuarioRepositorio.buscarPorId(payload.usuarioId);
    if (usuario && usuario.ativo) {
      req.usuario = usuario;
      req.usuarioId = usuario.id;

      if (usuario.empresa_id) {
        const empresa = await empresaRepositorio.buscarPorId(usuario.empresa_id);
        if (empresa && empresa.status === 'ativo') {
          req.empresa = empresa;
          req.empresaId = empresa.id;
        }
      }
    }

    next();
  } catch (erro) {
    // Ignora erros em autenticação opcional
    next();
  }
}

module.exports = {
  autenticarMiddleware,
  autenticarOpcional
};
