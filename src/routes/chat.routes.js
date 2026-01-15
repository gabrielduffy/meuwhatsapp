const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');

// Listar chats
router.get('/list/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const chats = await whatsapp.getChats(instanceName);
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar contatos
router.get('/contacts/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const contacts = await whatsapp.getContacts(instanceName);
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Arquivar chat
router.post('/archive', async (req, res) => {
  try {
    const { instanceName, remoteJid, archive } = req.body;

    if (!instanceName || !remoteJid) {
      return res.status(400).json({ error: 'instanceName e remoteJid são obrigatórios' });
    }

    const result = await whatsapp.archiveChat(instanceName, remoteJid, archive !== false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fixar chat
router.post('/pin', async (req, res) => {
  try {
    const { instanceName, remoteJid, pin } = req.body;

    if (!instanceName || !remoteJid) {
      return res.status(400).json({ error: 'instanceName e remoteJid são obrigatórios' });
    }

    const result = await whatsapp.pinChat(instanceName, remoteJid, pin !== false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Silenciar chat
router.post('/mute', async (req, res) => {
  try {
    const { instanceName, remoteJid, duration } = req.body;

    if (!instanceName || !remoteJid) {
      return res.status(400).json({ error: 'instanceName e remoteJid são obrigatórios' });
    }

    // duration em segundos, null para desmutar
    const result = await whatsapp.muteChat(instanceName, remoteJid, duration);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bloquear contato
router.post('/block', async (req, res) => {
  try {
    const { instanceName, remoteJid } = req.body;

    if (!instanceName || !remoteJid) {
      return res.status(400).json({ error: 'instanceName e remoteJid são obrigatórios' });
    }

    const result = await whatsapp.blockContact(instanceName, remoteJid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desbloquear contato
router.post('/unblock', async (req, res) => {
  try {
    const { instanceName, remoteJid } = req.body;

    if (!instanceName || !remoteJid) {
      return res.status(400).json({ error: 'instanceName e remoteJid são obrigatórios' });
    }

    const result = await whatsapp.unblockContact(instanceName, remoteJid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
