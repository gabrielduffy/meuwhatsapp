const { z } = require('zod');

const criarUsuarioSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
    email: z.string().email('Email inválido').toLowerCase().trim(),
    senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    funcao: z.enum(['administrador', 'empresa', 'usuario']).default('usuario'),
    permissoes: z.array(z.string()).optional()
});

const atualizarUsuarioSchema = z.object({
    nome: z.string().min(3).max(100).optional(),
    email: z.string().email().optional(),
    funcao: z.enum(['administrador', 'empresa', 'usuario']).optional(),
    permissoes: z.array(z.string()).optional(),
    ativo: z.boolean().optional()
});

const redefinirSenhaUsuarioSchema = z.object({
    nova_senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

module.exports = {
    criarUsuarioSchema,
    atualizarUsuarioSchema,
    redefinirSenhaUsuarioSchema
};
