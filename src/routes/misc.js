const express = require('express');
const router = express.Router();
const { checkNumberLimiter } = require('../middlewares/rateLimit');
const whatsapp = require('../services/whatsapp');

const { query } = require('../config/database');

// Rota de Setup para Demo (Garante que existe empresa para vincular mensagens)
router.get('/setup-demo', async (req, res) => {
  try {
    // 1. Criar empresa se não existir
    let empRes = await query('SELECT * FROM empresas LIMIT 1');
    if (empRes.rows.length === 0) {
      empRes = await query(`
              INSERT INTO empresas (nome, slug, email, plano, ativo, criado_em)
              VALUES ('Empresa Demo', 'demo', 'admin@demo.com', 'pro', true, NOW())
              RETURNING *
          `);
    }
    const empresa = empRes.rows[0];

    // 2. Criar usuário se não existir
    let userRes = await query('SELECT * FROM usuarios LIMIT 1');
    if (userRes.rows.length === 0) {
      userRes = await query(`
              INSERT INTO usuarios (empresa_id, nome, email, senha, perfil, criado_em)
              VALUES ($1, 'Admin Demo', 'admin@demo.com', '$2b$10$demoHashPlaceholder', 'admin', NOW())
              RETURNING *
          `, [empresa.id]);
    }

    res.json({
      success: true,
      message: 'Ambiente Demo configurado com sucesso. Tente enviar mensagens novamente.',
      empresaId: empresa.id,
      usuarioId: userRes.rows[0].id
    });
  } catch (err) {
    console.error('Erro no setup-demo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verificar se número existe no WhatsApp
router.get('/check-number/:instanceName/:number', checkNumberLimiter, async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const result = await whatsapp.checkNumberExists(instanceName, number);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar múltiplos números
router.post('/check-numbers', checkNumberLimiter, async (req, res) => {
  try {
    const { instanceName, numbers } = req.body;

    if (!instanceName || !numbers || !numbers.length) {
      return res.status(400).json({ error: 'instanceName e numbers são obrigatórios' });
    }

    const results = [];
    for (const number of numbers) {
      try {
        const result = await whatsapp.checkNumberExists(instanceName, number);
        results.push({ number, ...result });
      } catch (error) {
        results.push({ number, error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter foto de perfil
router.get('/profile-picture/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const result = await whatsapp.getProfilePicture(instanceName, number);
    res.json(result);
  } catch (error) {
    res.json({ url: null });
  }
});

// Obter perfil business
router.get('/business-profile/:instanceName/:number', async (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const profile = await whatsapp.getBusinessProfile(instanceName, number);
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
