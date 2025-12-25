const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CUSTO_SALT = 10;

/**
 * Gerar hash de senha
 */
async function gerarHashSenha(senha) {
  return await bcrypt.hash(senha, CUSTO_SALT);
}

/**
 * Comparar senha com hash
 */
async function compararSenha(senha, hash) {
  return await bcrypt.compare(senha, hash);
}

/**
 * Gerar token aleatório (para email, reset senha, etc)
 */
function gerarToken(tamanho = 32) {
  return crypto.randomBytes(tamanho).toString('hex');
}

/**
 * Validar força da senha
 */
function validarForcaSenha(senha) {
  const erros = [];

  if (senha.length < 8) {
    erros.push('Senha deve ter no mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(senha)) {
    erros.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(senha)) {
    erros.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(senha)) {
    erros.push('Senha deve conter pelo menos um número');
  }

  // Opcional: caractere especial
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) {
  //   erros.push('Senha deve conter pelo menos um caractere especial');
  // }

  return {
    valida: erros.length === 0,
    erros
  };
}

/**
 * Gerar senha aleatória forte
 */
function gerarSenhaAleatoria(tamanho = 12) {
  const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const especiais = '!@#$%^&*()';

  const todos = maiusculas + minusculas + numeros + especiais;

  let senha = '';

  // Garantir pelo menos um de cada tipo
  senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
  senha += minusculas[Math.floor(Math.random() * minusculas.length)];
  senha += numeros[Math.floor(Math.random() * numeros.length)];
  senha += especiais[Math.floor(Math.random() * especiais.length)];

  // Completar o restante
  for (let i = senha.length; i < tamanho; i++) {
    senha += todos[Math.floor(Math.random() * todos.length)];
  }

  // Embaralhar
  return senha.split('').sort(() => Math.random() - 0.5).join('');
}

module.exports = {
  gerarHashSenha,
  compararSenha,
  gerarToken,
  validarForcaSenha,
  gerarSenhaAleatoria
};
