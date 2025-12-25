const jwt = require('jsonwebtoken');

const JWT_SEGREDO = process.env.JWT_SEGREDO || 'sua-chave-super-secreta-aqui-mude-em-producao';
const JWT_EXPIRA_EM = process.env.JWT_EXPIRA_EM || '15m';
const JWT_ATUALIZACAO_EXPIRA_EM = process.env.JWT_ATUALIZACAO_EXPIRA_EM || '7d';

/**
 * Gerar token de acesso (curta duração)
 */
function gerarTokenAcesso(usuario, empresa = null) {
  const payload = {
    usuarioId: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    funcao: usuario.funcao,
    permissoes: usuario.permissoes || {},
    empresaId: empresa?.id || usuario.empresa_id || null,
    empresaNome: empresa?.nome || null
  };

  return jwt.sign(payload, JWT_SEGREDO, {
    expiresIn: JWT_EXPIRA_EM
  });
}

/**
 * Gerar token de atualização (longa duração)
 */
function gerarTokenAtualizacao(usuarioId) {
  const payload = {
    usuarioId,
    tipo: 'atualizacao'
  };

  return jwt.sign(payload, JWT_SEGREDO, {
    expiresIn: JWT_ATUALIZACAO_EXPIRA_EM
  });
}

/**
 * Verificar token
 */
function verificarToken(token) {
  try {
    return jwt.verify(token, JWT_SEGREDO);
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (erro.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw erro;
  }
}

/**
 * Decodificar token sem verificar (útil para debug)
 */
function decodificarToken(token) {
  return jwt.decode(token);
}

/**
 * Calcular timestamp de expiração
 */
function calcularExpiracao(duracao) {
  const duracoes = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  const milissegundos = duracoes[duracao] || duracoes['7d'];
  return new Date(Date.now() + milissegundos);
}

module.exports = {
  gerarTokenAcesso,
  gerarTokenAtualizacao,
  verificarToken,
  decodificarToken,
  calcularExpiracao,
  JWT_SEGREDO
};
