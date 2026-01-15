const { z } = require('zod');

const loginSchema = z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    senha: z.string().min(1, 'Senha é obrigatória')
});

const registroSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100).optional().or(z.literal('')),
    email: z.string().email('Email inválido').toLowerCase().trim(),
    senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    nomeEmpresa: z.string().min(3, 'Nome da empresa deve ter pelo menos 3 caracteres').optional().or(z.literal('')),
    codigoAfiliado: z.string().optional()
});

const esqueciSenhaSchema = z.object({
    email: z.string().email('Email inválido').toLowerCase().trim()
});

const redefinirSenhaSchema = z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    novaSenha: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres')
});

module.exports = {
    loginSchema,
    registroSchema,
    esqueciSenhaSchema,
    redefinirSenhaSchema
};
