const express = require('express');
const router = express.Router();
const integracaoServico = require('../servicos/integracao.servico');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarFuncionalidade } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

// =====================================================
// CRUD DE INTEGRAÇÕES
// =====================================================

/**
 * POST /api/integracoes
 * Criar integração
 */
router.post('/', verificarFuncionalidade('integracoes'), async (req, res) => {
  try {
    const integracao = await integracaoServico.criarIntegracao(req.empresaId, req.body);

    res.status(201).json({
      mensagem: 'Integração criada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao criar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes
 * Listar integrações
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {
      tipo: req.query.tipo,
      ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const integracoes = await integracaoServico.listarIntegracoes(req.empresaId, filtros);

    res.json({
      integracoes,
      total: integracoes.length
    });
  } catch (erro) {
    console.error('[Integração] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes/:id
 * Buscar integração por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const integracao = await integracaoServico.buscarIntegracao(req.empresaId, req.params.id);

    res.json({ integracao });
  } catch (erro) {
    console.error('[Integração] Erro ao buscar:', erro);
    res.status(404).json({ erro: erro.message });
  }
});

/**
 * PUT /api/integracoes/:id
 * Atualizar integração
 */
router.put('/:id', async (req, res) => {
  try {
    const integracao = await integracaoServico.atualizarIntegracao(
      req.empresaId,
      req.params.id,
      req.body
    );

    res.json({
      mensagem: 'Integração atualizada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/integracoes/:id
 * Deletar integração
 */
router.delete('/:id', async (req, res) => {
  try {
    await integracaoServico.deletarIntegracao(req.empresaId, req.params.id);

    res.json({ mensagem: 'Integração deletada com sucesso' });
  } catch (erro) {
    console.error('[Integração] Erro ao deletar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/ativar
 * Ativar integração
 */
router.post('/:id/ativar', async (req, res) => {
  try {
    const integracao = await integracaoServico.alterarStatus(
      req.empresaId,
      req.params.id,
      true
    );

    res.json({
      mensagem: 'Integração ativada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao ativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/desativar
 * Desativar integração
 */
router.post('/:id/desativar', async (req, res) => {
  try {
    const integracao = await integracaoServico.alterarStatus(
      req.empresaId,
      req.params.id,
      false
    );

    res.json({
      mensagem: 'Integração desativada com sucesso',
      integracao
    });
  } catch (erro) {
    console.error('[Integração] Erro ao desativar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// EXECUTAR/TESTAR INTEGRAÇÕES
// =====================================================

/**
 * POST /api/integracoes/:id/testar
 * Testar integração
 */
router.post('/:id/testar', async (req, res) => {
  try {
    const resultado = await integracaoServico.testarIntegracao(req.empresaId, req.params.id);

    res.json({
      mensagem: 'Teste realizado',
      ...resultado
    });
  } catch (erro) {
    console.error('[Integração] Erro ao testar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/:id/disparar
 * Disparar webhook manualmente
 */
router.post('/:id/disparar', async (req, res) => {
  try {
    const { evento, dados } = req.body;

    if (!evento) {
      return res.status(400).json({ erro: 'Evento é obrigatório' });
    }

    const resultado = await integracaoServico.dispararWebhook(
      req.params.id,
      req.empresaId,
      evento,
      dados || {}
    );

    res.json({
      mensagem: 'Webhook disparado',
      ...resultado
    });
  } catch (erro) {
    console.error('[Integração] Erro ao disparar webhook:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/integracoes/test-webhook
 * Testador genérico de URL
 */
router.post('/test-webhook', async (req, res) => {
  try {
    const { url, payload, headers } = req.body;

    if (!url) {
      return res.status(400).json({ erro: 'URL é obrigatória' });
    }

    const axios = require('axios');
    const inicio = Date.now();

    try {
      const response = await axios({
        method: 'POST',
        url,
        data: payload || { test: true, message: 'Teste do WhatsBenemax' },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsBenemax-Webhook-Tester/1.0',
          ...headers
        },
        timeout: 10000
      });

      res.json({
        sucesso: true,
        tempo: `${Date.now() - inicio}ms`,
        status: response.status,
        dados: response.data
      });
    } catch (e) {
      res.status(400).json({
        sucesso: false,
        tempo: `${Date.now() - inicio}ms`,
        erro: e.message,
        status: e.response?.status,
        dados: e.response?.data
      });
    }
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// =====================================================
// LOGS
// =====================================================

/**
 * GET /api/integracoes/:id/logs
 * Listar logs da integração
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      tipoEvento: req.query.tipo_evento,
      limite: parseInt(req.query.limite) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const logs = await integracaoServico.listarLogs(req.empresaId, req.params.id, filtros);

    res.json({
      logs,
      total: logs.length
    });
  } catch (erro) {
    console.error('[Integração] Erro ao listar logs:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/integracoes/:id/estatisticas
 * Obter estatísticas da integração
 */
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const periodo = req.query.periodo || '24 hours';

    const estatisticas = await integracaoServico.obterEstatisticas(
      req.empresaId,
      req.params.id,
      periodo
    );

    res.json(estatisticas);
  } catch (erro) {
    console.error('[Integração] Erro ao obter estatísticas:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/integracoes/:id/logs
 * Limpar logs antigos
 */
router.delete('/:id/logs', async (req, res) => {
  try {
    const diasAntigos = parseInt(req.query.dias) || 30;

    const resultado = await integracaoServico.limparLogsAntigos(
      req.empresaId,
      req.params.id,
      diasAntigos
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Integração] Erro ao limpar logs:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// =====================================================
// WEBHOOK RECEBIDO (Público - sem autenticação JWT)
// =====================================================

/**
 * POST /api/integracoes/webhook/:integracaoId
 * Receber webhook de integração externa
 * Esta rota não usa autenticação JWT, usa validação por assinatura
 */
const routerPublico = express.Router();

routerPublico.post('/webhook/:integracaoId/:empresaId', async (req, res) => {
  try {
    const { integracaoId, empresaId } = req.params;

    const resultado = await integracaoServico.processarWebhookRecebido(
      empresaId,
      integracaoId,
      req.body,
      req.headers
    );

    res.json(resultado);
  } catch (erro) {
    console.error('[Integração] Erro ao processar webhook:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * Webhook Oficial (Meta Cloud API)
 */
const WebhookAdapter = require('../services/WebhookAdapter');
const whatsappService = require('../services/whatsapp');
const { query } = require('../config/database');

// GET: Verificação do Webhook (Meta Hub Challenge)
routerPublico.get('/official/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Idealmente, validar o token contra o banco, mas para simplificação inicial:
  if (mode === 'subscribe') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST: Recebimento de Mensagens
routerPublico.post('/official/webhook', async (req, res) => {
  try {
    const payload = req.body;

    // Identificar a instância baseada no payload (WABA ID ou Phone Number ID)
    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      return res.status(200).send('OK'); // Ignorar payloads sem ID de telefone
    }

    // Buscar a instância no banco pelo config da API Oficial
    const instanceRes = await query('SELECT instance_name FROM instances WHERE official_config->>\'phoneNumberId\' = $1', [phoneNumberId]);
    const instanceName = instanceRes.rows[0]?.instance_name;

    if (!instanceName) {
      console.warn(`[Webhook-Oficial] Instância não encontrada para PhoneID: ${phoneNumberId}`);
      return res.status(200).send('OK');
    }

    // Adaptar payload
    const normalized = WebhookAdapter.fromOfficial(payload, instanceName);

    if (normalized) {
      // Processar via whatsappService (isso disparará webhooks internos e salvará no chat)
      // Nota: o whatsappService.sendWebhook dispara o redirecionamento para o Lovable
      whatsappService.sendWebhook(instanceName, normalized);

      // Persistir no chat se houver empresaId
      const fullInstanceRes = await query('SELECT empresa_id FROM instances WHERE instance_name = $1', [instanceName]);
      const empresaId = fullInstanceRes.rows[0]?.empresa_id;

      if (empresaId) {
        const chatServico = require('../servicos/chat.servico');
        await chatServico.receberMensagem(empresaId, instanceName, normalized);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[Webhook-Oficial] Erro Crítico:', error.message);
    res.status(200).send('OK'); // Sempre retornar 200 para Meta não bloquear o webhook
  }
});

// Exportar ambas as rotas
module.exports = {
  rotasProtegidas: router,
  rotasPublicas: routerPublico
};
