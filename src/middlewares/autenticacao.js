const { verificarToken } = require('../utilitarios/jwt');
const usuarioRepositorio = require('../repositorios/usuario.repositorio');
const empresaRepositorio = require('../repositorios/empresa.repositorio');

/**
 * Middleware de autenticação JWT
 * Verifica se o usuário está autenticado
 */
async function autenticarMiddleware(req, res, next) {
  try {
    //

 Extrair token do header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({ erro: 'Formato de token inválido' });
    }

    const token = partes[1];

    // Verificar token
    const payload = verificarToken(token);

    // Buscar usuário
    const usuario = await usuarioRepositorio.buscarPorId(payload.usuarioId);
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
