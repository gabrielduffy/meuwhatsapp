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

// Helper para validar request com suporte a aliases (compatibilidade Lovable/Evolution)
function validateMessageRequest(req, res) {
  // Alias de mapeamento
  const body = req.body;

  // Normalizar instanceName
  req.instanceName = body.instanceName || body.instance || body.instance_name;
  // Normalizar destinatário
  req.to = body.to || body.number || body.chatId || body.remoteJid;
  // Normalizar conteúdo
  req.text = body.text || body.body || body.content || body.message;
  // Normalizar opções
  req.options = body.options || {};

  if (!req.instanceName) {
    res.status(400).json({ success: false, error: 'instanceName ou instance é obrigatório' });
    return false;
  }
  if (!req.to) {
    res.status(400).json({ success: false, error: 'to ou number é obrigatório' });
    return false;
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
    if (!validateMessageRequest(req, res)) return;
    if (!req.text) return res.status(400).json({ success: false, error: 'text ou body é obrigatório' });

    const result = await whatsapp.sendText(req.instanceName, req.to, req.text, req.options);

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
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-document:
 *   post:
 *     summary: Enviar documento
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, documentUrl]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               documentUrl: { type: string, example: "https://exemplo.com/documento.pdf" }
 *               fileName: { type: string, example: "manual.pdf" }
 *               mimetype: { type: string, example: "application/pdf" }
 *               caption: { type: string, example: "Aqui está o manual solicitado" }
 *     responses:
 *       200:
 *         description: Documento enviado
 */
router.post('/send-document', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'documentUrl'])) return;

    const { instanceName, to, documentUrl, fileName, mimetype, caption, options } = req.body;
    const result = await whatsapp.sendDocument(instanceName, to, documentUrl, fileName, mimetype, caption, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-audio:
 *   post:
 *     summary: Enviar áudio (Gravado/PTT ou Arquivo)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, audioUrl]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               audioUrl: { type: string, example: "https://exemplo.com/audio.mp3" }
 *               ptt: { type: boolean, example: true, description: "Se true, envia como se tivesse sido gravado na hora" }
 *     responses:
 *       200:
 *         description: Áudio enviado
 */
router.post('/send-audio', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'audioUrl'])) return;

    const { instanceName, to, audioUrl, ptt, options } = req.body;
    const result = await whatsapp.sendAudio(instanceName, to, audioUrl, ptt !== false, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-video:
 *   post:
 *     summary: Enviar vídeo
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, videoUrl]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               videoUrl: { type: string, example: "https://exemplo.com/video.mp4" }
 *               caption: { type: string, example: "Veja este vídeo" }
 *     responses:
 *       200:
 *         description: Vídeo enviado
 */
router.post('/send-video', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'videoUrl'])) return;

    const { instanceName, to, videoUrl, caption, options } = req.body;
    const result = await whatsapp.sendVideo(instanceName, to, videoUrl, caption, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-sticker:
 *   post:
 *     summary: Enviar Figuninha (Sticker)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, stickerUrl]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               stickerUrl: { type: string, example: "https://exemplo.com/sticker.webp" }
 *     responses:
 *       200:
 *         description: Figurinha enviada
 */
router.post('/send-sticker', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'stickerUrl'])) return;

    const { instanceName, to, stickerUrl, options } = req.body;
    const result = await whatsapp.sendSticker(instanceName, to, stickerUrl, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-location:
 *   post:
 *     summary: Enviar localização
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, latitude, longitude]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               latitude: { type: number, example: -23.550520 }
 *               longitude: { type: number, example: -46.633308 }
 *               name: { type: string, example: "Praça da Sé" }
 *               address: { type: string, example: "São Paulo, SP" }
 *     responses:
 *       200:
 *         description: Localização enviada
 */
router.post('/send-location', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'latitude', 'longitude'])) return;

    const { instanceName, to, latitude, longitude, name, address, options } = req.body;
    const result = await whatsapp.sendLocation(instanceName, to, latitude, longitude, name, address, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-contact:
 *   post:
 *     summary: Enviar card de contato (VCard)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, contactName, contactNumber]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               contactName: { type: string, example: "Suporte Técnico" }
 *               contactNumber: { type: string, example: "5511999998888" }
 *     responses:
 *       200:
 *         description: Contato enviado
 */
router.post('/send-contact', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'contactName', 'contactNumber'])) return;

    const { instanceName, to, contactName, contactNumber, options } = req.body;
    const result = await whatsapp.sendContact(instanceName, to, contactName, contactNumber, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-poll:
 *   post:
 *     summary: Enviar Enquete (Poll)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, name, values]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               name: { type: string, example: "Qual o melhor dia para a reunião?" }
 *               values: { type: array, items: { type: string }, example: ["Segunda", "Quarta", "Sexta"] }
 *               selectableCount: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Enquete enviada
 */
router.post('/send-poll', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'name', 'values'])) return;

    const { instanceName, to, name, values, selectableCount, options } = req.body;
    const result = await whatsapp.sendPoll(instanceName, to, name, values, selectableCount, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-buttons:
 *   post:
 *     summary: Enviar Botões Interativos
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, text, buttons]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               text: { type: string, example: "Escolha uma opção:" }
 *               footer: { type: string, example: "WhatsBenemax API" }
 *               buttons: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "btn1" }
 *                     text: { type: string, example: "Opção 1" }
 *     responses:
 *       200:
 *         description: Botões enviados
 */
router.post('/send-buttons', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'text', 'buttons'])) return;

    const { instanceName, to, text, buttons, footer, options } = req.body;
    const result = await whatsapp.sendButtons(instanceName, to, text, buttons, footer, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-list:
 *   post:
 *     summary: Enviar Listas (Menu)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, title, description, buttonText, sections]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               title: { type: string, example: "Menu de Opções" }
 *               description: { type: string, example: "Selecione um serviço abaixo" }
 *               buttonText: { type: string, example: "Ver Catálogo" }
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title: { type: string, example: "Categoria 1" }
 *                     rows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title: { type: string, example: "Item 1" }
 *                           description: { type: string, example: "Descrição do item" }
 *                           rowId: { type: string, example: "id1" }
 *     responses:
 *       200:
 *         description: Lista enviada
 */
router.post('/send-list', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'title', 'description', 'buttonText', 'sections'])) return;

    const { instanceName, to, title, description, buttonText, sections, footer, options } = req.body;
    const result = await whatsapp.sendList(instanceName, to, title, description, buttonText, sections, footer, options || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/send-reaction:
 *   post:
 *     summary: Enviar Reação (Emoji)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, messageId, emoji]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               messageId: { type: string, example: "ABC12345" }
 *               emoji: { type: string, example: "👍" }
 *     responses:
 *       200:
 *         description: Reação enviada
 */
router.post('/send-reaction', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'messageId', 'emoji'])) return;

    const { instanceName, to, messageId, emoji } = req.body;
    const result = await whatsapp.sendReaction(instanceName, to, messageId, emoji);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/forward:
 *   post:
 *     summary: Encaminhar Mensagem
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, to, message]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               to: { type: string, example: "5511999999999" }
 *               message: { type: object, description: "Objeto bruto da mensagem original" }
 *     responses:
 *       200:
 *         description: Mensagem encaminhada
 */
router.post('/forward', messageLimiter, async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'to', 'message'])) return;

    const { instanceName, to, message } = req.body;
    const result = await whatsapp.forwardMessage(instanceName, to, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/delete:
 *   post:
 *     summary: Deletar Mensagem (Revogar)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, remoteJid, messageId]
 *             properties:
 *               instanceName: { type: string, example: "instancia_teste" }
 *               remoteJid: { type: string, example: "5511999999999@s.whatsapp.net" }
 *               messageId: { type: string }
 *               forEveryone: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Mensagem deletada
 */
router.post('/delete', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'messageId'])) return;

    const { instanceName, remoteJid, messageId, forEveryone } = req.body;
    const result = await whatsapp.deleteMessage(instanceName, remoteJid, messageId, forEveryone !== false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/mark-read:
 *   post:
 *     summary: Marcar Mensagens como Lidas
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, remoteJid, messageIds]
 *             properties:
 *               instanceName: { type: string }
 *               remoteJid: { type: string }
 *               messageIds: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Marcado como lido
 */
router.post('/mark-read', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'messageIds'])) return;

    const { instanceName, remoteJid, messageIds } = req.body;
    const result = await whatsapp.markAsRead(instanceName, remoteJid, messageIds);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /message/presence:
 *   post:
 *     summary: Atualizar Status de Presença (Digitando...)
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceName, remoteJid, presence]
 *             properties:
 *               instanceName: { type: string }
 *               remoteJid: { type: string }
 *               presence: { type: string, enum: ["available", "unavailable", "composing", "recording", "paused"] }
 *     responses:
 *       200:
 *         description: Presença atualizada
 */
router.post('/presence', async (req, res) => {
  try {
    if (!validateMessageRequest(req, res, ['instanceName', 'remoteJid', 'presence'])) return;

    const { instanceName, remoteJid, presence } = req.body;
    const result = await whatsapp.updatePresence(instanceName, remoteJid, presence);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
