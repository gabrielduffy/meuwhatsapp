const express = require('express');
const router = express.Router();
const usuarioRepo = require('../repositorios/usuario.repositorio');
const { gerarHashSenha } = require('../utilitarios/senha');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarLimite } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/permissoes');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Criar usuário (apenas empresa ou administrador)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, senha]
 *             properties:
 *               nome: { type: string, example: "Novo Usuário" }
 *               email: { type: string, example: "novo@example.com" }
 *               senha: { type: string, example: "senha123" }
 *               funcao: { type: string, enum: [usuario, empresa, administrador], example: "usuario" }
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/',
  verificarPermissao(['empresa', 'administrador']),
  verificarLimite('usuarios'),
  async (req, res) => {
    try {
      const { nome, email, senha, funcao = 'usuario', permissoes = [] } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
      }

      // Verificar se email já existe
      const usuarioExistente = await usuarioRepo.buscarPorEmail(email);

      if (usuarioExistente) {
        return res.status(400).json({ erro: 'Email já está em uso' });
      }

      // Hash da senha
      const senhaHash = await gerarHashSenha(senha);

      // Criar usuário
      const usuario = await usuarioRepo.criar({
        empresaId: req.empresaId,
        email,
        senhaHash,
        nome,
        funcao,
        permissoes,
        emailVerificado: true // Usuários criados pelo admin já são verificados
      });

      // Remover senha do retorno
      const { senha_hash, ...usuarioLimpo } = usuario;

      res.status(201).json({
        mensagem: 'Usuário criado com sucesso',
        usuario: usuarioLimpo
      });
    } catch (erro) {
      console.error('[Usuários] Erro ao criar:', erro);
      res.status(400).json({ erro: erro.message });
    }
  }
);

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Listar usuários da empresa
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ativo
 *         schema: { type: boolean }
 *       - in: query
 *         name: funcao
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {
      ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined,
      funcao: req.query.funcao,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const usuarios = await usuarioRepo.listarPorEmpresa(req.empresaId, filtros);

    // Remover senhas
    const usuariosLimpos = usuarios.map(u => {
      const { senha_hash, token_verificacao_email, token_redefinir_senha, ...limpo } = u;
      return limpo;
    });

    res.json({
      usuarios: usuariosLimpos,
      total: usuariosLimpos.length
    });
  } catch (erro) {
    console.error('[Usuários] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/usuarios/:id
 * Buscar usuário por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Remover dados sensíveis
    const { senha_hash, token_verificacao_email, token_redefinir_senha, ...usuarioLimpo } = usuario;

    res.json({ usuario: usuarioLimpo });
  } catch (erro) {
    console.error('[Usuários] Erro ao buscar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/usuarios/:id
 * Atualizar usuário
 */
router.put('/:id', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Campos permitidos para atualização
    const dadosAtualizacao = {};

    if (req.body.nome) dadosAtualizacao.nome = req.body.nome;
    if (req.body.email) dadosAtualizacao.email = req.body.email;
    if (req.body.funcao) dadosAtualizacao.funcao = req.body.funcao;
    if (req.body.permissoes) dadosAtualizacao.permissoes = req.body.permissoes;
    if (req.body.ativo !== undefined) dadosAtualizacao.ativo = req.body.ativo;

    const usuarioAtualizado = await usuarioRepo.atualizar(req.params.id, dadosAtualizacao);

    // Remover dados sensíveis
    const { senha_hash, ...usuarioLimpo } = usuarioAtualizado;

    res.json({
      mensagem: 'Usuário atualizado com sucesso',
      usuario: usuarioLimpo
    });
  } catch (erro) {
    console.error('[Usuários] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Deletar usuário
 */
router.delete('/:id', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Não pode deletar a si mesmo
    if (usuario.id === req.usuarioId) {
      return res.status(400).json({ erro: 'Você não pode deletar sua própria conta' });
    }

    await usuarioRepo.deletar(req.params.id);

    res.json({ mensagem: 'Usuário deletado com sucesso' });
  } catch (erro) {
    console.error('[Usuários] Erro ao deletar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/usuarios/:id/ativar
 * Ativar usuário
 */
router.post('/:id/ativar', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const usuarioAtualizado = await usuarioRepo.atualizar(req.params.id, { ativo: true });

    const { senha_hash, ...usuarioLimpo } = usuarioAtualizado;

    res.json({
      mensagem: 'Usuário ativado com sucesso',
      usuario: usuarioLimpo
    });
  } catch (erro) {
    console.error('[Usuários] Erro ao ativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/usuarios/:id/desativar
 * Desativar usuário
 */
router.post('/:id/desativar', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Não pode desativar a si mesmo
    if (usuario.id === req.usuarioId) {
      return res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
    }

    const usuarioAtualizado = await usuarioRepo.atualizar(req.params.id, { ativo: false });

    const { senha_hash, ...usuarioLimpo } = usuarioAtualizado;

    res.json({
      mensagem: 'Usuário desativado com sucesso',
      usuario: usuarioLimpo
    });
  } catch (erro) {
    console.error('[Usuários] Erro ao desativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/usuarios/:id/redefinir-senha
 * Redefinir senha de usuário (apenas admin)
 */
router.post('/:id/redefinir-senha', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const { nova_senha } = req.body;

    if (!nova_senha) {
      return res.status(400).json({ erro: 'Nova senha é obrigatória' });
    }

    const usuario = await usuarioRepo.buscarPorId(req.params.id);

    if (!usuario || usuario.empresa_id !== req.empresaId) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const senhaHash = await gerarHashSenha(nova_senha);

    await usuarioRepo.atualizar(req.params.id, { senhaHash });

    res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (erro) {
    console.error('[Usuários] Erro ao redefinir senha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/usuarios/me/token
 * Obter token de API do usuário atual
 */
router.get('/me/token', async (req, res) => {
  try {
    const usuario = await usuarioRepo.buscarPorId(req.usuarioId);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    if (!usuario.api_token) {
      // Gera se não existir
      const token = uuidv4();
      await usuarioRepo.atualizar(req.usuarioId, { api_token: token });
      return res.json({ token });
    }

    res.json({ token: usuario.api_token });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/**
 * POST /api/usuarios/me/token
 * Regenerar token de API
 */
router.post('/me/token', async (req, res) => {
  try {
    const token = uuidv4();
    await usuarioRepo.atualizar(req.usuarioId, { api_token: token });
    res.json({ token, mensagem: 'Token regenerado com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

module.exports = router;
