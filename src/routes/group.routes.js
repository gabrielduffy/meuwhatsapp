const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');

// Criar grupo
router.post('/create', async (req, res) => {
  try {
    const { instanceName, groupName, participants } = req.body;

    if (!instanceName || !groupName || !participants || !participants.length) {
      return res.status(400).json({ error: 'instanceName, groupName e participants são obrigatórios' });
    }

    const result = await whatsapp.createGroup(instanceName, groupName, participants);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar grupos
router.get('/list/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const groups = await whatsapp.getGroups(instanceName);
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Informações do grupo
router.get('/info/:instanceName/:groupId', async (req, res) => {
  try {
    const { instanceName, groupId } = req.params;
    const info = await whatsapp.getGroupInfo(instanceName, groupId);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter link de convite
router.get('/invite-code/:instanceName/:groupId', async (req, res) => {
  try {
    const { instanceName, groupId } = req.params;
    const result = await whatsapp.getGroupInviteCode(instanceName, groupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revogar link de convite
router.post('/revoke-invite/:instanceName/:groupId', async (req, res) => {
  try {
    const { instanceName, groupId } = req.params;
    const result = await whatsapp.revokeGroupInvite(instanceName, groupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Entrar em grupo por código/link
router.post('/join', async (req, res) => {
  try {
    const { instanceName, inviteCode } = req.body;

    if (!instanceName || !inviteCode) {
      return res.status(400).json({ error: 'instanceName e inviteCode são obrigatórios' });
    }

    const result = await whatsapp.joinGroupByCode(instanceName, inviteCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sair do grupo
router.post('/leave', async (req, res) => {
  try {
    const { instanceName, groupId } = req.body;

    if (!instanceName || !groupId) {
      return res.status(400).json({ error: 'instanceName e groupId são obrigatórios' });
    }

    const result = await whatsapp.leaveGroup(instanceName, groupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar participantes
router.post('/participants/add', async (req, res) => {
  try {
    const { instanceName, groupId, participants } = req.body;

    if (!instanceName || !groupId || !participants) {
      return res.status(400).json({ error: 'instanceName, groupId e participants são obrigatórios' });
    }

    const result = await whatsapp.updateGroupParticipants(instanceName, groupId, participants, 'add');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover participantes
router.post('/participants/remove', async (req, res) => {
  try {
    const { instanceName, groupId, participants } = req.body;

    if (!instanceName || !groupId || !participants) {
      return res.status(400).json({ error: 'instanceName, groupId e participants são obrigatórios' });
    }

    const result = await whatsapp.updateGroupParticipants(instanceName, groupId, participants, 'remove');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promover a admin
router.post('/participants/promote', async (req, res) => {
  try {
    const { instanceName, groupId, participants } = req.body;

    if (!instanceName || !groupId || !participants) {
      return res.status(400).json({ error: 'instanceName, groupId e participants são obrigatórios' });
    }

    const result = await whatsapp.updateGroupParticipants(instanceName, groupId, participants, 'promote');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rebaixar de admin
router.post('/participants/demote', async (req, res) => {
  try {
    const { instanceName, groupId, participants } = req.body;

    if (!instanceName || !groupId || !participants) {
      return res.status(400).json({ error: 'instanceName, groupId e participants são obrigatórios' });
    }

    const result = await whatsapp.updateGroupParticipants(instanceName, groupId, participants, 'demote');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar nome do grupo
router.post('/update/subject', async (req, res) => {
  try {
    const { instanceName, groupId, subject } = req.body;

    if (!instanceName || !groupId || !subject) {
      return res.status(400).json({ error: 'instanceName, groupId e subject são obrigatórios' });
    }

    const result = await whatsapp.updateGroupSubject(instanceName, groupId, subject);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar descrição do grupo
router.post('/update/description', async (req, res) => {
  try {
    const { instanceName, groupId, description } = req.body;

    if (!instanceName || !groupId) {
      return res.status(400).json({ error: 'instanceName e groupId são obrigatórios' });
    }

    const result = await whatsapp.updateGroupDescription(instanceName, groupId, description || '');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar foto do grupo
router.post('/update/picture', async (req, res) => {
  try {
    const { instanceName, groupId, imageUrl } = req.body;

    if (!instanceName || !groupId || !imageUrl) {
      return res.status(400).json({ error: 'instanceName, groupId e imageUrl são obrigatórios' });
    }

    const result = await whatsapp.updateGroupPicture(instanceName, groupId, imageUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configurações do grupo
router.post('/update/settings', async (req, res) => {
  try {
    const { instanceName, groupId, setting } = req.body;

    if (!instanceName || !groupId || !setting) {
      return res.status(400).json({ error: 'instanceName, groupId e setting são obrigatórios' });
    }

    // setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
    const result = await whatsapp.updateGroupSettings(instanceName, groupId, setting);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
