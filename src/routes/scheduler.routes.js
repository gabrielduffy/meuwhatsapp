const express = require('express');
const router = express.Router();
const {
  scheduleMessage,
  cancelScheduledMessage,
  getScheduledMessages,
  getScheduledMessageStatus,
  cleanupOldMessages
} = require('../services/scheduler');

// Agendar nova mensagem
router.post('/schedule', async (req, res) => {
  try {
    const result = await scheduleMessage(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Listar mensagens agendadas de uma instância
router.get('/list/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { status } = req.query;

    const messages = getScheduledMessages(instanceName, status);

    res.json({
      success: true,
      instanceName,
      total: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter status de uma mensagem específica
router.get('/status/:messageId', (req, res) => {
  try {
    const { messageId } = req.params;
    const message = getScheduledMessageStatus(messageId);

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Cancelar mensagem agendada
router.delete('/cancel/:messageId', (req, res) => {
  try {
    const { messageId } = req.params;
    const result = cancelScheduledMessage(messageId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Limpar mensagens antigas
router.post('/cleanup', (req, res) => {
  try {
    const cleaned = cleanupOldMessages();

    res.json({
      success: true,
      message: `${cleaned} mensagens antigas removidas`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
