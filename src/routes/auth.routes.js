const express = require('express');
const router = express.Router();
const autenticacaoServico = require('../servicos/autenticacao.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { validate } = require('../middlewares/validation.middleware');
const { loginSchema, registroSchema, esqueciSenhaSchema, redefinirSenhaSchema } = require('../validators/auth.validator');
const { validarSchema } = require('../utilitarios/validadores');

/**
 * @swagger
 * /api/autenticacao/cadastrar:
 *   post:
 *     summary: Cadastrar novo usuário/empresa
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, senha, nomeEmpresa]
 *             properties:
 *               nome: { type: string, example: "João Silva" }
 *               email: { type: string, example: "joao@example.com" }
 *               senha: { type: string, example: "senha123" }
 *               nomeEmpresa: { type: string, example: "Minha Empresa" }
 *               codigoAfiliado: { type: string, example: "AFIL123" }
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/cadastrar', validate(registroSchema), async (req, res) => {
  try {
    const { nome, email, senha, nomeEmpresa, codigoAfiliado } = req.body;

    const resultado = await autenticacaoServico.cadastrar({
      nome,
      email,
      senha,
      nomeEmpresa,
      codigoAfiliado
    });

    res.status(201).json(resultado);
  } catch (erro) {
    console.error('[Cadastrar] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * @swagger
 * /api/autenticacao/entrar:
 *   post:
 *     summary: Fazer login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email: { type: string, example: "joao@example.com" }
 *               senha: { type: string, example: "senha123" }
 *     responses:
 *       200:
 *         description: Login bem sucedido
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/entrar', validate(loginSchema), async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Informações do dispositivo
    const infoDispositivo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    const resultado = await autenticacaoServico.entrar({ email, senha }, infoDispositivo);

    res.json(resultado);
  } catch (erro) {
    console.error('[Entrar] Erro:', erro);
    res.status(401).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/atualizar-token
 * Atualizar token de acesso usando refresh token
 */
router.post('/atualizar-token', async (req, res) => {
  try {
    const { tokenAtualizacao } = req.body;

    if (!tokenAtualizacao) {
      return res.status(400).json({ erro: 'Token de atualização é obrigatório' });
    }

    const resultado = await autenticacaoServico.atualizarToken(tokenAtualizacao);

    res.json(resultado);
  } catch (erro) {
    console.error('[Atualizar Token] Erro:', erro);
    res.status(401).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/sair
 * Fazer logout
 */
router.post('/sair', async (req, res) => {
  try {
    const { tokenAtualizacao } = req.body;

    if (tokenAtualizacao) {
      await autenticacaoServico.sair(tokenAtualizacao);
    }

    res.json({ mensagem: 'Saiu com sucesso' });
  } catch (erro) {
    console.error('[Sair] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/sair-todos
 * Sair de todos os dispositivos
 */
router.post('/sair-todos', autenticarMiddleware, async (req, res) => {
  try {
    const resultado = await autenticacaoServico.sairTodos(req.usuarioId);
    res.json(resultado);
  } catch (erro) {
    console.error('[Sair Todos] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/esqueci-senha
 * Solicitar redefinição de senha
 */
router.post('/esqueci-senha', validate(esqueciSenhaSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const resultado = await autenticacaoServico.esqueciSenha(email);

    res.json(resultado);
  } catch (erro) {
    console.error('[Esqueci Senha] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/redefinir-senha
 * Redefinir senha com token
 */
router.post('/redefinir-senha', validate(redefinirSenhaSchema), async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    const resultado = await autenticacaoServico.redefinirSenha(token, novaSenha);

    res.json(resultado);
  } catch (erro) {
    console.error('[Redefinir Senha] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/autenticacao/verificar/:token
 * Verificar email
 */
router.get('/verificar/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const resultado = await autenticacaoServico.verificarEmail(token);

    // Retornar HTML de sucesso
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verificado</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #5B21B6, #10B981); color: white; }
          .container { background: white; color: #333; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
          h1 { color: #5B21B6; }
          .button { display: inline-block; background: linear-gradient(135deg, #5B21B6, #10B981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Email Verificado!</h1>
          <p>Seu email foi verificado com sucesso.</p>
          <p>Agora você pode fazer login na plataforma.</p>
          <a href="/entrar" class="button">Fazer Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (erro) {
    console.error('[Verificar Email] Erro:', erro);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro na Verificação</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          h1 { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Erro na Verificação</h1>
          <p>${erro.message}</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /api/autenticacao/eu:
 *   get:
 *     summary: Obter dados do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário e empresa
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/eu', autenticarMiddleware, async (req, res) => {
  try {
    const { senha_hash, token_verificacao_email, token_redefinir_senha, ...usuarioLimpo } = req.usuario;

    res.json({
      usuario: usuarioLimpo,
      empresa: req.empresa ? {
        id: req.empresa.id,
        nome: req.empresa.nome,
        slug: req.empresa.slug,
        saldo_creditos: req.empresa.saldo_creditos,
        plano_nome: req.empresa.plano_nome
      } : null
    });
  } catch (erro) {
    console.error('[Eu] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/autenticacao/alterar-senha
 * Alterar senha (usuário autenticado)
 */
router.post('/alterar-senha', autenticarMiddleware, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }

    const resultado = await autenticacaoServico.alterarSenha(
      req.usuarioId,
      senhaAtual,
      novaSenha
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Alterar Senha] Erro:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
