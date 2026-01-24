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
        const { host, porta, usuario, senha, secure, testEmail, fromEmail, fromName } = req.body;
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port: porta,
            secure,
            auth: { user: usuario, pass: senha }
        });

        await transporter.verify();

        if (testEmail) {
            await transporter.sendMail({
                from: `"${fromName || 'Teste SMTP'}" <${fromEmail || usuario}>`,
                to: testEmail,
                subject: '🚀 Teste de Conexão SMTP - MeuWhatsapp',
                text: 'Se você está recebendo este e-mail, sua configuração SMTP está funcionando perfeitamente!',
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #8b5cf6;">🚀 Conexão SMTP Sucesso!</h2>
                        <p>Sua configuração de e-mail marketing no <b>MeuWhatsapp</b> foi validada com sucesso.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <small style="color: #999;">Este é um e-mail automático de teste.</small>
                    </div>
                `
            });
            return res.json({ mensagem: 'Conexão validada e e-mail de teste enviado!' });
        }

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
        const { dadosJson, corpoHtml } = req.body;
        // Se tiver dados do builder mas não tiver HTML pronto, gera no backend
        if (dadosJson && (!corpoHtml || corpoHtml === '<!-- Gerado pelo Builder -->')) {
            const { exportHtml } = require('../utilitarios/emailExport');
            req.body.corpoHtml = exportHtml(dadosJson);
        }
        const template = await emailRepo.criarTemplate(req.empresaId, req.body);
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/templates/:id', async (req, res) => {
    try {
        const { dadosJson, corpoHtml } = req.body;
        if (dadosJson && (!corpoHtml || corpoHtml === '<!-- Gerado pelo Builder -->')) {
            const { exportHtml } = require('../utilitarios/emailExport');
            req.body.corpoHtml = exportHtml(dadosJson);
        }
        const template = await emailRepo.atualizarTemplate(req.params.id, req.empresaId, req.body);
        res.json(template);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/templates/:id', async (req, res) => {
    try {
        await emailRepo.deletarTemplate(req.params.id, req.empresaId);
        res.json({ mensagem: 'Template removido' });
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

// =====================================================
// AUTOMAÇÕES
// =====================================================

router.get('/automacoes', async (req, res) => {
    try {
        const automacoes = await emailRepo.listarAutomacoes(req.empresaId);
        res.json(automacoes);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

router.post('/automacoes', async (req, res) => {
    try {
        const automacao = await emailRepo.criarAutomacao(req.empresaId, req.body);
        res.status(201).json(automacao);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/automacoes/:id', async (req, res) => {
    try {
        const automacao = await emailRepo.atualizarAutomacao(req.params.id, req.empresaId, req.body);
        res.json(automacao);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/automacoes/:id', async (req, res) => {
    try {
        await emailRepo.deletarAutomacao(req.params.id, req.empresaId);
        res.json({ mensagem: 'Automação removida' });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

module.exports = router;

