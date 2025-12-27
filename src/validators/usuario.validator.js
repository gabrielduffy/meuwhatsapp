/**
 * Validadores Zod para rotas de Usuários
 * Garante validação forte de dados de entrada
 */

const { z } = require('zod');

// Schema para criar usuário
const criarUsuarioSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome deve conter apenas letras'),

  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  senha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha não pode ter mais de 100 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número'),

  funcao: z.enum(['administrador', 'empresa', 'usuario', 'afiliado'], {
    errorMap: () => ({ message: 'Função inválida' })
  }).default('usuario'),

  permissoes: z.array(z.string()).optional().default([]),

  ativo: z.boolean().optional().default(true)
});

// Schema para atualizar usuário (senha opcional)
const atualizarUsuarioSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome deve conter apenas letras')
    .optional(),

  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),

  funcao: z.enum(['administrador', 'empresa', 'usuario', 'afiliado'])
    .optional(),

  permissoes: z.array(z.string()).optional(),

  ativo: z.boolean().optional()
});

// Schema para login
const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  senha: z.string()
    .min(1, 'Senha é obrigatória')
});

// Schema para redefinir senha
const redefinirSenhaSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
});

// Schema para alterar senha
const alterarSenhaSchema = z.object({
  senhaAtual: z.string()
    .min(1, 'Senha atual é obrigatória'),

  novaSenha: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(100, 'Nova senha não pode ter mais de 100 caracteres')
    .regex(/[A-Z]/, 'Nova senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Nova senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Nova senha deve ter pelo menos um número')
});

module.exports = {
  criarUsuarioSchema,
  atualizarUsuarioSchema,
  loginSchema,
  redefinirSenhaSchema,
  alterarSenhaSchema
};
