const express = require('express');
const router = express.Router();
const emailRepo = require('../repositorios/email.repositorio');
const emailServico = require('../servicos/email.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// CONEXÕES SMTP
// =====================================================

router.get('/conexoes', async (req, res) => {
    try {
        const conexoes = await emailRepo.listarConexoesSMTP(req.empresaId);
        res.json(conexoes);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

router.post('/conexoes', async (req, res) => {
    try {
        const conexao = await emailRepo.criarConexaoSMTP(req.empresaId, req.body);
        res.status(201).json(conexao);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.post('/conexoes/testar', async (req, res) => {
    try {
        const { host, porta, usuario, senha, secure } = req.body;
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port: porta,
            secure,
            auth: { user: usuario, pass: senha }
        });
        await transporter.verify();
        res.json({ mensagem: 'Conexão SMTP válida!' });
    } catch (error) {
        res.status(400).json({ erro: `Falha na conexão: ${error.message}` });
    }
});

// =====================================================
// TEMPLATES
// =====================================================

router.get('/templates', async (req, res) => {
    try {
        const templates = await emailRepo.listarTemplates(req.empresaId);
        res.json(templates);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

router.post('/templates', async (req, res) => {
    try {
        const template = await emailRepo.criarTemplate(req.empresaId, req.body);
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// =====================================================
// CAMPANHAS
// =====================================================

router.get('/campanhas', async (req, res) => {
    try {
        const campanhas = await emailRepo.listarCampanhas(req.empresaId);
        res.json(campanhas);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

router.post('/campanhas', async (req, res) => {
    try {
        const campanha = await emailRepo.criarCampanha(req.empresaId, req.body);
        res.status(201).json(campanha);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.post('/campanhas/:id/disparar', async (req, res) => {
    try {
        const resultado = await emailServico.dispararCampanha(req.params.id, req.empresaId);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

module.exports = router;
