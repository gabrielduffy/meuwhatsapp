const { query } = require('../config/database');
const emailRepo = require('../repositorios/email.repositorio');
const { emailQueue } = require('../queues/emailQueue');
const logger = require('../config/logger');

/**
 * Motor de Execução de Automações de Email
 */

async function iniciarAutomacaoParaLead(leadId, empresaId, triggerTipo) {
    try {
        // 1. Buscar automações ativas para este gatilho
        const automacoes = await emailRepo.listarAutomacoes(empresaId);
        const ativas = automacoes.filter(a => a.ativa && a.gatilho?.tipo === triggerTipo);

        for (const auto of ativas) {
            const fluxo = auto.fluxo_json;
            if (!fluxo || !fluxo.nodes) continue;

            // Encontrar o nó de gatilho
            const triggerNode = fluxo.nodes.find(n => n.type === 'trigger');
            if (!triggerNode) continue;

            // Iniciar progresso
            await query(`
                INSERT INTO leads_automacao_progresso (automacao_id, lead_id, empresa_id, no_atual_id, status)
                VALUES ($1, $2, $3, $4, 'ativo')
                ON CONFLICT (automacao_id, lead_id) DO UPDATE SET no_atual_id = $4, status = 'ativo'
            `, [auto.id, leadId, empresaId, triggerNode.id]);

            // Processar próximo passo
            await processarProximoPasso(auto.id, leadId, empresaId);
        }
    } catch (error) {
        logger.error('[AutomationEngine] Erro ao iniciar automação:', error.message);
    }
}

async function processarProximoPasso(automacaoId, leadId, empresaId) {
    try {
        // 1. Carregar progresso e fluxo
        const progRes = await query(`
            SELECT p.*, a.fluxo_json 
            FROM leads_automacao_progresso p
            JOIN automacoes_email a ON p.automacao_id = a.id
            WHERE p.automacao_id = $1 AND p.lead_id = $2
        `, [automacaoId, leadId]);

        if (progRes.rows.length === 0) return;
        const progresso = progRes.rows[0];
        const fluxo = progresso.fluxo_json;

        // 2. Encontrar aresta saindo do nó atual
        let edge;
        const currentNode = fluxo.nodes.find(n => n.id === progresso.no_atual_id);

        if (currentNode && currentNode.type === 'condition') {
            const conditionMet = await avaliarCondicao(progresso, currentNode);
            edge = fluxo.edges.find(e =>
                e.source === progresso.no_atual_id &&
                e.sourceHandle === (conditionMet ? 'yes' : 'no')
            );
        } else {
            edge = fluxo.edges.find(e => e.source === progresso.no_atual_id);
        }

        if (!edge) {
            // Fim do fluxo ou ramificação sem saída configurada
            await finalizarProgresso(progresso.id, 'concluído');
            return;
        }

        const nextNode = fluxo.nodes.find(n => n.id === edge.target);
        if (!nextNode) return;

        // 3. Executar o nó
        switch (nextNode.type) {
            case 'action':
                await executarAcaoEmail(progresso, nextNode);
                await atualizarNoAtual(progresso.id, nextNode.id);
                // Continua para o próximo após disparar a ação
                await processarProximoPasso(automacaoId, leadId, empresaId);
                break;

            case 'delay':
                await agendarDelay(progresso, nextNode);
                break;

            case 'condition':
                // Move para o nó de condição e processa imediatamente
                await atualizarNoAtual(progresso.id, nextNode.id);
                await processarProximoPasso(automacaoId, leadId, empresaId);
                break;

            default:
                await atualizarNoAtual(progresso.id, nextNode.id);
                await processarProximoPasso(automacaoId, leadId, empresaId);
        }

    } catch (error) {
        logger.error(`[AutomationEngine] Erro ao processar passo (${automacaoId}):`, error.message);
    }
}

async function avaliarCondicao(progresso, node) {
    const { conditionType } = node.data; // opened, clicked, replied
    const { ultimo_disparo_id } = progresso.dados_contexto || {};

    if (!ultimo_disparo_id) return false;

    const disparoRes = await query('SELECT * FROM disparos_email WHERE id = $1', [ultimo_disparo_id]);
    const disparo = disparoRes.rows[0];

    if (!disparo) return false;

    if (conditionType === 'opened') return !!disparo.aberto;
    if (conditionType === 'clicked') return !!disparo.clicado;
    if (conditionType === 'replied') {
        // Lógica de resposta pode ser integrada com o chat/tickets
        return false;
    }

    return false;
}

async function executarAcaoEmail(progresso, node) {
    const { templateId } = node.data;
    if (!templateId) return;

    logger.info(`[AutomationEngine] Enviando email da automação ${progresso.automacao_id} para lead ${progresso.lead_id}`);

    // Adicionar à fila de email (reutilizando a infra de disparos)
    // Para automação, precisamos de um método que envie 1 email específico imediatamente ou via fila
    await emailQueue.add('enviar-unico', {
        empresaId: progresso.empresa_id,
        leadId: progresso.lead_id,
        templateId,
        automacaoId: progresso.automacao_id
    });
}

async function agendarDelay(progresso, node) {
    const { value, unit } = node.data;
    let ms = 0;
    if (unit === 'minutes') ms = value * 60 * 1000;
    if (unit === 'hours') ms = value * 60 * 60 * 1000;
    if (unit === 'days') ms = value * 24 * 60 * 60 * 1000;

    const proximaExec = new Date(Date.now() + ms);

    await query(`
        UPDATE leads_automacao_progresso 
        SET proxima_execucao = $1, status = 'aguardando', no_atual_id = $2
        WHERE id = $3
    `, [proximaExec, node.id, progresso.id]);

    logger.info(`[AutomationEngine] Delay agendado para ${proximaExec.toISOString()} (Lead: ${progresso.lead_id})`);

    // Podemos usar Bull com delay para acordar o processo
    await emailQueue.add('acordar-automacao', {
        progressoId: progresso.id,
        automacaoId: progresso.automacao_id,
        leadId: progresso.lead_id,
        empresaId: progresso.empresa_id
    }, { delay: ms });
}

async function atualizarNoAtual(id, noId) {
    await query('UPDATE leads_automacao_progresso SET no_atual_id = $1 WHERE id = $2', [noId, id]);
}

async function finalizarProgresso(id, status) {
    await query('UPDATE leads_automacao_progresso SET status = $1, no_atual_id = NULL WHERE id = $2', [status, id]);
}

module.exports = {
    iniciarAutomacaoParaLead,
    processarProximoPasso
};
