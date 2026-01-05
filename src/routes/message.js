const express = require('express');
const router = express.Router();
const { messageLimiter } = require('../middlewares/rateLimit');
const whatsapp = require('../services/whatsapp');

const chatServico = require('../servicos/chat.servico');
const { query } = require('../config/database');

async function getEmpresaPadraoId() {
  try {
    const res = await query('SELECT id FROM empresas ORDER BY criado_em ASC LIMIT 1');
    return res.rows[0]?.id;
  } catch (e) { return null; }
}

// Helper para validar request
function validateMessageRequest(req, res, fields = ['instanceName', 'to']) {
  for (const field of fields) {
    if (!req.body[field]) {
      res.status(400).json({ error: `${field} é obrigatório` });
      return false;
    }
  }
  return true;
}

/**
 * @swagger
 * /message/send-text:
 *   post:
 *     summary: Enviar mensagem de texto
 *     tags: [WhatsApp]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, text]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               text: { type: string, example: "Olá Mundo!" }
 *     responses:
 *       200:
 *         description: Mensagem enviada
 */
router.post('/send-text', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'text'])) return;

    const { instanceName, to, text, options } = req.body;
    const result = await whatsapp.sendText(instanceName, to, text, options || {});

    // Persistir mensagem enviada
    try {
      const empresaId = await getEmpresaPadraoId();
      if (empresaId) {
        await chatServico.receberMensagem(empresaId, instanceName, {
          contatoTelefone: to,
          contatoNome: to, // Melhoraria se o usuário passasse o nome
          whatsappMensagemId: result.key?.id,
          tipoMensagem: 'texto',
          conteudo: text, // O conteúdo real enviado
          direcao: 'enviada',
          status: 'enviada'
        });
      }
    } catch (persistErr) {
      console.error('Erro ao salvar mensagem enviada:', persistErr);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /message/send-image:
 *   post:
 *     summary: Enviar mensagem com imagem
 *     tags: [WhatsApp]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, imageUrl]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               imageUrl: { type: string, example: "https://exemplo.com/imagem.jpg" }
 *               caption: { type: string, example: "Confira esta imagem" }
 *     responses:
 *       200:
 *         description: Imagem enviada
 */
router.post('/send-image', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'imageUrl'])) return;

    const { instanceName, to, imageUrl, caption, options } = req.body;
    const result = await whatsapp.sendImage(instanceName, to, imageUrl, caption, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar documento
router.post('/send-document', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'documentUrl'])) return;

    const { instanceName, to, documentUrl, fileName, mimetype, caption, options } = req.body;
    const result = await whatsapp.sendDocument(instanceName, to, documentUrl, fileName, mimetype, caption, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar áudio
router.post('/send-audio', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'audioUrl'])) return;

    const { instanceName, to, audioUrl, ptt, options } = req.body;
    const result = await whatsapp.sendAudio(instanceName, to, audioUrl, ptt !== false, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar vídeo
router.post('/send-video', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'videoUrl'])) return;

    const { instanceName, to, videoUrl, caption, options } = req.body;
    const result = await whatsapp.sendVideo(instanceName, to, videoUrl, caption, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar sticker
router.post('/send-sticker', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'stickerUrl'])) return;

    const { instanceName, to, stickerUrl, options } = req.body;
    const result = await whatsapp.sendSticker(instanceName, to, stickerUrl, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar localização
router.post('/send-location', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'latitude', 'longitude'])) return;

    const { instanceName, to, latitude, longitude, name, address, options } = req.body;
    const result = await whatsapp.sendLocation(instanceName, to, latitude, longitude, name, address, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar contato
router.post('/send-contact', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'contactName', 'contactNumber'])) return;

    const { instanceName, to, contactName, contactNumber, options } = req.body;
    const result = await whatsapp.sendContact(instanceName, to, contactName, contactNumber, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar botões
router.post('/send-buttons', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'text', 'buttons'])) return;

    const { instanceName, to, text, buttons, footer, options } = req.body;
    const result = await whatsapp.sendButtons(instanceName, to, text, buttons, footer, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar lista
router.post('/send-list', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'title', 'description', 'buttonText', 'sections'])) return;

    const { instanceName, to, title, description, buttonText, sections, footer, options } = req.body;
    const result = await whatsapp.sendList(instanceName, to, title, description, buttonText, sections, footer, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar enquete
router.post('/send-poll', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'name', 'values'])) return;

    const { instanceName, to, name, values, selectableCount, options } = req.body;
    const result = await whatsapp.sendPoll(instanceName, to, name, values, selectableCount, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar reação
router.post('/send-reaction', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'messageId', 'emoji'])) return;

    const { instanceName, to, messageId, emoji } = req.body;
    const result = await whatsapp.sendReaction(instanceName, to, messageId, emoji);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Encaminhar mensagem
router.post('/forward', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'message'])) return;

    const { instanceName, to, message } = req.body;
    const result = await whatsapp.forwardMessage(instanceName, to, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar mensagem
router.post('/delete', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'messageId'])) return;

    const { instanceName, remoteJid, messageId, forEveryone } = req.body;
    const result = await whatsapp.deleteMessage(instanceName, remoteJid, messageId, forEveryone !== false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar como lido
router.post('/mark-read', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'messageIds'])) return;

    const { instanceName, remoteJid, messageIds } = req.body;
    const result = await whatsapp.markAsRead(instanceName, remoteJid, messageIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar presença
router.post('/presence', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'presence'])) return;

    const { instanceName, remoteJid, presence } = req.body;
    // presence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'
    const result = await whatsapp.updatePresence(instanceName, remoteJid, presence);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
