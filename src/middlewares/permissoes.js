/**
 * Verificar se usuário tem permissão
 */
function verificarPermissao(permissaoRequerida) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }

    // Administrador do sistema tem todas as permissões
    if (usuario.funcao === 'administrador') {
      return next();
    }

    // Dono da empresa tem todas as permissões da empresa
    if (usuario.funcao === 'empresa') {
      return next();
    }

    // Verificar permissão específica
    const permissoes = usuario.permissoes || {};

    // Formato: "chat:escrever", "ia:gerenciar"
    const [recurso, acao] = permissaoRequerida.split(':');

    // Verificar se tem permissão para o recurso e ação
    if (permissoes[recurso]) {
      if (permissoes[recurso].includes('*') || permissoes[recurso].includes(acao)) {
        return next();
      }
    }

    return res.status(403).json({
      erro: 'Sem permissão para esta ação',
      permissao_requerida: permissaoRequerida
    });
  };
}

/**
 * Verificar se é administrador do sistema
 */
function exigirAdministrador(req, res, next) {
  if (req.usuario?.funcao !== 'administrador') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
  }
  next();
}

/**
 * Verificar se é dono da empresa
 */
function exigirDonoEmpresa(req, res, next) {
  if (req.usuario?.funcao !== 'empresa' && req.usuario?.funcao !== 'administrador') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas dono da empresa.' });
  }
  next();
}

/**
 * Verificar se é afiliado
 */
function exigirAfiliado(req, res, next) {
  if (req.usuario?.funcao !== 'afiliado' && req.usuario?.funcao !== 'administrador') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas afiliados.' });
  }
  next();
}

module.exports = {
  verificarPermissao,
  exigirAdministrador,
  exigirDonoEmpresa,
  exigirAfiliado
};
