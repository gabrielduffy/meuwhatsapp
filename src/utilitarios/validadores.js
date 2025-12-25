/**
 * Validar email
 */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validar telefone brasileiro
 */
function validarTelefone(telefone) {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '');

  // Deve ter 10 ou 11 dígitos (com ou sem 9)
  return numeros.length >= 10 && numeros.length <= 11;
}

/**
 * Validar CPF
 */
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');

  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;

  if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;

  return digitoVerificador2 === parseInt(cpf.charAt(10));
}

/**
 * Validar CNPJ
 */
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');

  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(0)) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  return resultado == digitos.charAt(1);
}

/**
 * Validar slug (para URLs)
 */
function validarSlug(slug) {
  const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return regex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

/**
 * Criar slug a partir de texto
 */
function criarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
}

/**
 * Validar UUID
 */
function validarUUID(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Validar URL
 */
function validarURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizar string (remover HTML, scripts, etc)
 */
function sanitizarString(str) {
  if (typeof str !== 'string') return '';

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Formatar CPF
 */
function formatarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formatar CNPJ
 */
function formatarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formatar telefone
 */
function formatarTelefone(telefone) {
  telefone = telefone.replace(/\D/g, '');

  if (telefone.length === 11) {
    return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telefone.length === 10) {
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
}

/**
 * Validar objeto com schema
 */
function validarSchema(dados, schema) {
  const erros = [];

  for (const campo in schema) {
    const regras = schema[campo];
    const valor = dados[campo];

    // Obrigatório
    if (regras.obrigatorio && (valor === undefined || valor === null || valor === '')) {
      erros.push(`Campo '${campo}' é obrigatório`);
      continue;
    }

    // Tipo
    if (valor !== undefined && valor !== null && regras.tipo) {
      const tipoValor = Array.isArray(valor) ? 'array' : typeof valor;
      if (tipoValor !== regras.tipo) {
        erros.push(`Campo '${campo}' deve ser do tipo ${regras.tipo}`);
      }
    }

    // Min/Max para strings
    if (typeof valor === 'string') {
      if (regras.min && valor.length < regras.min) {
        erros.push(`Campo '${campo}' deve ter no mínimo ${regras.min} caracteres`);
      }
      if (regras.max && valor.length > regras.max) {
        erros.push(`Campo '${campo}' deve ter no máximo ${regras.max} caracteres`);
      }
    }

    // Min/Max para números
    if (typeof valor === 'number') {
      if (regras.min !== undefined && valor < regras.min) {
        erros.push(`Campo '${campo}' deve ser no mínimo ${regras.min}`);
      }
      if (regras.max !== undefined && valor > regras.max) {
        erros.push(`Campo '${campo}' deve ser no máximo ${regras.max}`);
      }
    }

    // Validação customizada
    if (regras.validar && typeof regras.validar === 'function') {
      const resultadoValidacao = regras.validar(valor);
      if (resultadoValidacao !== true) {
        erros.push(resultadoValidacao || `Campo '${campo}' inválido`);
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = {
  validarEmail,
  validarTelefone,
  validarCPF,
  validarCNPJ,
  validarSlug,
  criarSlug,
  validarUUID,
  validarURL,
  sanitizarString,
  formatarCPF,
  formatarCNPJ,
  formatarTelefone,
  validarSchema
};
