const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Gerenciamento de Templates do WhatsApp (Meta Cloud API)
 */

/**
 * @swagger
 * /template/list:
 *   get:
 *     summary: Lista todos os templates da conta business
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: instanceName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de templates
 */
router.get('/list', async (req, res) => {
    try {
        const { instanceName } = req.query;
        if (!instanceName) return res.status(400).json({ erro: 'instanceName é obrigatório' });

        const templates = await whatsapp.getTemplates(instanceName);
        res.json(templates);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

/**
 * @swagger
 * /template/create:
 *   post:
 *     summary: Cria um novo template na Meta
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instanceName:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [AUTHENTICATION, MARKETING, UTILITY]
 *               language:
 *                 type: string
 *                 default: pt_BR
 *               components:
 *                 type: array
 *                 items:
 *                   type: object
 *             example:
 *               instanceName: "minha_instancia"
 *               name: "boas_vindas_v1"
 *               category: "UTILITY"
 *               language: "pt_BR"
 *               components:
 *                 - type: "BODY"
 *                   text: "Olá {{1}}, bem-vindo à nossa plataforma!"
 *                   example:
 *                     body_text: [["Gabriel"]]
 *     responses:
 *       201:
 *         description: Template criado
 */
router.post('/create', async (req, res) => {
    try {
        const { instanceName, ...templateData } = req.body;
        if (!instanceName) return res.status(400).json({ erro: 'instanceName é obrigatório' });

        const result = await whatsapp.createTemplate(instanceName, templateData);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

/**
 * @swagger
 * /template/delete:
 *   delete:
 *     summary: Remove um template da Meta
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: instanceName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template removido
 */
router.delete('/delete', async (req, res) => {
    try {
        const { instanceName, name } = req.query;
        if (!instanceName || !name) return res.status(400).json({ erro: 'instanceName e name são obrigatórios' });

        const result = await whatsapp.deleteTemplate(instanceName, name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
