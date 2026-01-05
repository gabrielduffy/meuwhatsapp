const express = require('express');
const router = express.Router();
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { query } = require('../config/database');

router.use(autenticarMiddleware);

/**
 * GET /api/dashboard/kpis
 */
router.get('/kpis', async (req, res) => {
    try {
        const empresaId = req.empresaId;

        // Instâncias conectadas
        const { getInstance } = require('../services/whatsapp');
        // Este é um mock simples pois precisaríamos iterar nas instâncias
        // Para simplificar, vamos buscar do banco se houver registro de status
        const instRes = await query('SELECT COUNT(*) FROM whatsapp_instances WHERE empresa_id = $1 AND status = $2', [empresaId, 'connected']);

        // Contatos ativos
        const contRes = await query('SELECT COUNT(*) FROM contatos WHERE empresa_id = $1', [empresaId]);

        // Mensagens hoje
        const msgRes = await query('SELECT COUNT(*) FROM chat_mensagens WHERE empresa_id = $1 AND criado_em >= CURRENT_DATE', [empresaId]);

        // Créditos restantes (SaaS)
        const empRes = await query('SELECT saldo_creditos FROM empresas WHERE id = $1', [empresaId]);

        res.json({
            instanciasConectadas: parseInt(instRes.rows[0]?.count || 0),
            mensagensHoje: parseInt(msgRes.rows[0]?.count || 0),
            contatosAtivos: parseInt(contRes.rows[0]?.count || 0),
            creditosRestantes: parseFloat(empRes.rows[0]?.saldo_creditos || 0)
        });
    } catch (error) {
        console.error('[Dashboard] Erro KPIs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/mensagens-grafico
 */
router.get('/mensagens-grafico', async (req, res) => {
    try {
        const empresaId = req.empresaId;

        // Buscar últimos 7 dias
        const sql = `
      SELECT 
        to_char(criado_em, 'DD/MM') as data,
        COUNT(*) FILTER (WHERE direcao = 'enviada') as enviadas,
        COUNT(*) FILTER (WHERE direcao = 'recebida') as recebidas
      FROM chat_mensagens
      WHERE empresa_id = $1 AND criado_em >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY to_char(criado_em, 'DD/MM'), date_trunc('day', criado_em)
      ORDER BY date_trunc('day', criado_em) ASC
    `;

        const { rows } = await query(sql, [empresaId]);
        res.json(rows);
    } catch (error) {
        console.error('[Dashboard] Erro gráfico:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/dashboard/atividades
 */
router.get('/atividades', async (req, res) => {
    try {
        const empresaId = req.empresaId;

        // Buscar histórico de negociações e mensagens recentes
        const sql = `
      (SELECT 'Mensagem de ' || c.nome as descricao, m.criado_em 
       FROM chat_mensagens m 
       JOIN chat_conversas cv ON m.conversa_id = cv.id
       JOIN contatos c ON cv.contato_id = c.id
       WHERE m.empresa_id = $1 AND m.direcao = 'recebida'
       ORDER BY m.criado_em DESC LIMIT 5)
      UNION ALL
      (SELECT 'Negociação: ' || h.tipo || ' - ' || n.titulo as descricao, h.criado_em
       FROM historico_negociacao h
       JOIN negociacoes n ON h.negociacao_id = n.id
       WHERE h.empresa_id = $1
       ORDER BY h.criado_em DESC LIMIT 5)
      ORDER BY criado_em DESC LIMIT 10
    `;

        const { rows } = await query(sql, [empresaId]);
        res.json(rows);
    } catch (error) {
        console.error('[Dashboard] Erro atividades:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
