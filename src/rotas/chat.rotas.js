const express = require('express');
const router = express.Router();
const chatServico = require('../servicos/chat.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// CONVERSAS
// =====================================================

/**
 * GET /api/chat/conversas
 * Listar conversas
 */
router.get('/conversas', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      atribuidoPara: req.query.atribuido_para,
      departamento: req.query.departamento,
      naoLidas: req.query.nao_lidas === 'true',
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const conversas = await chatServico.listarConversas(req.empresaId, filtros);

    res.json({
      conversas,
      total: conversas.length
    });
  } catch (erro) {
    console.error('[Chat] Erro ao listar conversas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/chat/conversas/:id
 * Buscar conversa por ID
 */
router.get('/conversas/:id', async (req, res) => {
  try {
    const conversa = await chatServico.buscarConversa(req.empresaId, req.params.id);

    res.json({ conversa });
  } catch (erro) {
    console.error('[Chat] Erro ao buscar conversa:', erro);
    res.status(404).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/conversas/:id/atribuir
 * Atribuir conversa a usuário
 */
router.post('/conversas/:id/atribuir', async (req, res) => {
  try {
    const { usuario_id, departamento } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ erro: 'ID do usuário é obrigatório' });
    }

    const conversa = await chatServico.atribuirConversa(
      req.empresaId,
      req.params.id,
      usuario_id,
      departamento
    );

    res.json({
      mensagem: 'Conversa atribuída com sucesso',
      conversa
    });
  } catch (erro) {
    console.error('[Chat] Erro ao atribuir conversa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/conversas/:id/fechar
 * Fechar conversa
 */
router.post('/conversas/:id/fechar', async (req, res) => {
  try {
    const conversa = await chatServico.fecharConversa(req.empresaId, req.params.id);

    res.json({
      mensagem: 'Conversa fechada com sucesso',
      conversa
    });
  } catch (erro) {
    console.error('[Chat] Erro ao fechar conversa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/conversas/:id/reabrir
 * Reabrir conversa
 */
router.post('/conversas/:id/reabrir', async (req, res) => {
  try {
    const conversa = await chatServico.reabrirConversa(req.empresaId, req.params.id);

    res.json({
      mensagem: 'Conversa reaberta com sucesso',
      conversa
    });
  } catch (erro) {
    console.error('[Chat] Erro ao reabrir conversa:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/conversas/:id/marcar-lida
 * Marcar conversa como lida
 */
router.post('/conversas/:id/marcar-lida', async (req, res) => {
  try {
    const conversa = await chatServico.marcarComoLida(req.empresaId, req.params.id);

    res.json({
      mensagem: 'Conversa marcada como lida',
      conversa
    });
  } catch (erro) {
    console.error('[Chat] Erro ao marcar como lida:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// MENSAGENS
// =====================================================

/**
 * GET /api/chat/conversas/:id/mensagens
 * Listar mensagens da conversa
 */
router.get('/conversas/:id/mensagens', async (req, res) => {
  try {
    const filtros = {
      direcao: req.query.direcao,
      limite: parseInt(req.query.limite) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const mensagens = await chatServico.listarMensagens(
      req.empresaId,
      req.params.id,
      filtros
    );

    res.json({
      mensagens,
      total: mensagens.length
    });
  } catch (erro) {
    console.error('[Chat] Erro ao listar mensagens:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/conversas/:id/mensagens
 * Enviar mensagem
 */
router.post('/conversas/:id/mensagens', async (req, res) => {
  try {
    const {
      tipo_mensagem,
      conteudo,
      midia_url,
      midia_tipo,
      midia_nome_arquivo
    } = req.body;

    if (!tipo_mensagem) {
      return res.status(400).json({ erro: 'Tipo de mensagem é obrigatório' });
    }

    if (tipo_mensagem === 'texto' && !conteudo) {
      return res.status(400).json({ erro: 'Conteúdo é obrigatório para mensagens de texto' });
    }

    const mensagem = await chatServico.enviarMensagem(
      req.empresaId,
      req.params.id,
      req.usuarioId,
      {
        tipoMensagem: tipo_mensagem,
        conteudo,
        midiaUrl: midia_url,
        midiaTipo: midia_tipo,
        midiaNomeArquivo: midia_nome_arquivo
      }
    );

    res.status(201).json({
      mensagem: 'Mensagem enviada com sucesso',
      dados: mensagem
    });
  } catch (erro) {
    console.error('[Chat] Erro ao enviar mensagem:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/chat/mensagens/:id
 * Deletar mensagem
 */
router.delete('/mensagens/:id', async (req, res) => {
  try {
    await chatServico.deletarMensagem(req.empresaId, req.params.id);

    res.json({ mensagem: 'Mensagem deletada com sucesso' });
  } catch (erro) {
    console.error('[Chat] Erro ao deletar mensagem:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// WEBHOOKS (Receber mensagens do WhatsApp)
// =====================================================

/**
 * POST /api/chat/webhook/mensagem
 * Webhook para receber mensagens do WhatsApp
 */
router.post('/webhook/mensagem', async (req, res) => {
  try {
    const {
      instancia_id,
      contato_telefone,
      contato_nome,
      whatsapp_mensagem_id,
      tipo_mensagem,
      conteudo,
      midia_url,
      midia_tipo,
      midia_nome_arquivo,
      metadados
    } = req.body;

    if (!instancia_id || !contato_telefone) {
      return res.status(400).json({ erro: 'Instância e telefone do contato são obrigatórios' });
    }

    const resultado = await chatServico.receberMensagem(
      req.empresaId,
      instancia_id,
      {
        contatoTelefone: contato_telefone,
        contatoNome: contato_nome,
        whatsappMensagemId: whatsapp_mensagem_id,
        tipoMensagem: tipo_mensagem || 'texto',
        conteudo,
        midiaUrl: midia_url,
        midiaTipo: midia_tipo,
        midiaNomeArquivo: midia_nome_arquivo,
        metadados: metadados || {}
      }
    );

    res.json({
      mensagem: 'Mensagem recebida com sucesso',
      ...resultado
    });
  } catch (erro) {
    console.error('[Chat] Erro ao receber mensagem:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/chat/webhook/status
 * Webhook para atualizar status de mensagem
 */
router.post('/webhook/status', async (req, res) => {
  try {
    const { whatsapp_mensagem_id, status } = req.body;

    if (!whatsapp_mensagem_id || !status) {
      return res.status(400).json({ erro: 'ID da mensagem e status são obrigatórios' });
    }

    await chatServico.atualizarStatusMensagem(
      req.empresaId,
      whatsapp_mensagem_id,
      status
    );

    res.json({ mensagem: 'Status atualizado com sucesso' });
  } catch (erro) {
    console.error('[Chat] Erro ao atualizar status:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// ESTATÍSTICAS
// =====================================================

/**
 * GET /api/chat/estatisticas
 * Obter estatísticas do chat
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      atribuidoPara: req.query.atribuido_para
    };

    const estatisticas = await chatServico.obterEstatisticas(req.empresaId, filtros);

    res.json(estatisticas);
  } catch (erro) {
    console.error('[Chat] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/chat/metricas
 * Obter métricas de atendimento
 */
router.get('/metricas', async (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || null;

    const metricas = await chatServico.obterMetricas(req.empresaId, usuarioId);

    res.json(metricas);
  } catch (erro) {
    console.error('[Chat] Erro ao obter métricas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
