const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.get('/db', async (req, res) => {
    try {
        const empresas = await query('SELECT id, nome, criado_em FROM empresas ORDER BY criado_em ASC');
        const usuarios = await query('SELECT id, nome, email, empresa_id FROM usuarios');
        const conversas = await query('SELECT id, empresa_id, contato_id, instancia_id FROM conversas_chat ORDER BY criado_em DESC LIMIT 10');
        const mensagens = await query('SELECT id, conversa_id, empresa_id, direcao, conteudo, criado_em FROM mensagens_chat ORDER BY criado_em DESC LIMIT 10');
        const contatos = await query('SELECT id, nome, telefone, empresa_id FROM contatos ORDER BY criado_em DESC LIMIT 10');

        res.json({
            empresas: empresas.rows,
            usuarios: usuarios.rows,
            conversas: conversas.rows,
            mensagens: mensagens.rows,
            contatos: contatos.rows,
            time: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

module.exports = router;
