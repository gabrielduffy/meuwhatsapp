/**
 * Validadores Zod para rotas de Empresa
 */

const { z } = require('zod');

// Schema para atualizar empresa
const atualizarEmpresaSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(200, 'Nome não pode ter mais de 200 caracteres')
    .optional(),

  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),

  telefone: z.string()
    .regex(/^\d{10,15}$/, 'Telefone deve conter apenas números (10-15 dígitos)')
    .optional()
    .nullable(),

  documento: z.string()
    .regex(/^\d{11}$|^\d{14}$/, 'Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)')
    .optional()
    .nullable(),

  endereco: z.string()
    .max(500, 'Endereço não pode ter mais de 500 caracteres')
    .optional()
    .nullable(),

  cidade: z.string()
    .max(100, 'Cidade não pode ter mais de 100 caracteres')
    .optional()
    .nullable(),

  estado: z.string()
    .length(2, 'Estado deve ter 2 caracteres (ex: SP)')
    .toUpperCase()
    .optional()
    .nullable(),

  cep: z.string()
    .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos')
    .optional()
    .nullable()
});

// Schema para configurações white-label
const whitelabelSchema = z.object({
  logo_url: z.string()
    .url('URL do logo inválida')
    .optional()
    .nullable(),

  dominio_customizado: z.string()
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Domínio inválido')
    .optional()
    .nullable(),

  cor_primaria: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor primária deve ser hexadecimal (ex: #8B5CF6)')
    .optional()
    .nullable(),

  cor_secundaria: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor secundária deve ser hexadecimal (ex: #3B82F6)')
    .optional()
    .nullable()
});

module.exports = {
  atualizarEmpresaSchema,
  whitelabelSchema
};
