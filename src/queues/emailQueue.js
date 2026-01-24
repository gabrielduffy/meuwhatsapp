const Bull = require('bull');
const config = require('../config/env');
const logger = require('../config/logger');
const emailRepo = require('../repositorios/email.repositorio');
const emailServico = require('../servicos/email.servico');
const { notificarFimDeCampanha } = require('../servicos/notificacao.servico');

// Criar fila Redis para emails
const emailQueue = new Bull('email-marketing', config.redisUrl || 'redis://127.0.0.1:6379');

/**
 * PROCESSADOR: CAMPANHA EM MASSA
 */
emailQueue.process('processar-campanha', async (job) => {
    const { campanhaId, empresaId } = job.data;
    let enviando = 0;
    let falhas = 0;

    logger.info(`[Fila Email] Iniciando processamento da campanha ${campanhaId}`);

    try {
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'enviando');

        const { query } = require('../config/database');
        const leadsRes = await query('SELECT * FROM contatos WHERE empresa_id = $1 AND email IS NOT NULL AND email != \'\'', [empresaId]);
        const leads = leadsRes.rows;

        const campanhas = await emailRepo.listarCampanhas(empresaId);
        const campanha = campanhas.find(c => c.id === campanhaId);

        if (!campanha) throw new Error('Campanha não encontrada');

        const template = (await emailRepo.listarTemplates(empresaId)).find(t => t.id === campanha.template_id);

        for (const lead of leads) {
            try {
                let html = template.corpo_html || '';
                if (!html && template.dados_json) {
                    const { exportHtml } = require('../utilitarios/emailExport');
                    html = exportHtml(template.dados_json);
                }

                html = html.replace(/{{nome}}/g, lead.nome || 'Cliente');

                await emailServico.enviarEmail({
                    empresaId,
                    conexaoSmtpId: campanha.conexao_smtp_id,
                    to: lead.email,
                    subject: campanha.assunto || template.assunto,
                    html: html
                });
                enviando++;
            } catch (err) {
                logger.error(`[Fila Email] Erro ao enviar para ${lead.email}:`, err.message);
                falhas++;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        const estatisticas = { enviados: enviando, falhas, total: leads.length };
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'concluida', estatisticas);
        await notificarFimDeCampanha(campanha, estatisticas);

        return estatisticas;
    } catch (error) {
        logger.error(`[Fila Email] Erro crítico na campanha ${campanhaId}:`, error.message);
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'erro', { erro: error.message });
        throw error;
    }
});

/**
 * PROCESSADOR: ENVIAR EMAIL ÚNICO (AUTOMAÇÃO)
 */
emailQueue.process('enviar-unico', async (job) => {
    const { empresaId, leadId, templateId, automacaoId } = job.data;
    try {
        const templates = await emailRepo.listarTemplates(empresaId);
        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template não encontrado');

        const { query } = require('../config/database');
        const leadRes = await query('SELECT * FROM contatos WHERE id = $1', [leadId]);
        const lead = leadRes.rows[0];
        if (!lead || !lead.email) throw new Error('Lead sem email');

        // Buscar conexão SMTP ativa da empresa (pega a primeira ou padrão)
        const conexoes = await emailRepo.listarConexoesSMTP(empresaId);
        const conexao = conexoes.find(c => c.ativo) || conexoes[0];
        if (!conexao) throw new Error('Nenhuma conexão SMTP configurada');

        let html = template.corpo_html || '';
        if (!html && template.dados_json) {
            const { exportHtml } = require('../utilitarios/emailExport');
            html = exportHtml(template.dados_json);
        }

        html = html.replace(/{{nome}}/g, lead.nome || 'Cliente');

        // Gerar tracking_id se precisar rastrear aberturas/cliques
        const trackingId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Adicionar pixel de rastreio de abertura
        const trackingPixel = `<img src="${config.apiUrl || 'http://localhost:3000'}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none" />`;
        const htmlComTracking = html + trackingPixel;

        await emailServico.enviarEmail({
            empresaId,
            conexaoSmtpId: conexao.id,
            to: lead.email,
            subject: template.assunto,
            html: htmlComTracking
        });

        // Registrar disparo para rastreamento de aberturas/cliques e condições
        const disparoRes = await query(`
            INSERT INTO disparos_email (empresa_id, lead_id, email_destino, status, tracking_id, enviado_em)
            VALUES ($1, $2, $3, 'enviado', $4, NOW())
            RETURNING id
        `, [empresaId, leadId, lead.email, trackingId]);

        const disparoId = disparoRes.rows[0].id;

        // Atualizar contexto da automação para o nó de condição poder verificar
        await query(`
            UPDATE leads_automacao_progresso
            SET dados_contexto = dados_contexto || jsonb_build_object('ultimo_disparo_id', $1)
            WHERE automacao_id = $2 AND lead_id = $3
        `, [disparoId, automacaoId, leadId]);

        logger.info(`[Fila Email] Email de automação (${automacaoId}) enviado para ${lead.email} (Disparo: ${disparoId})`);
        return { success: true, disparoId };
    } catch (error) {
        logger.error('[Fila Email] Erro ao enviar email único:', error.message);
        throw error;
    }
});

/**
 * PROCESSADOR: ACORDAR AUTOMAÇÃO (PÓS-DELAY)
 */
emailQueue.process('acordar-automacao', async (job) => {
    const { automacaoId, leadId, empresaId } = job.data;
    try {
        const { processarProximoPasso } = require('../servicos/automation.servico');
        await processarProximoPasso(automacaoId, leadId, empresaId);
        return { success: true };
    } catch (error) {
        logger.error('[Fila Email] Erro ao acordar automação:', error.message);
        throw error;
    }
});

// Retrocompatibilidade (se cair sem nome de processo)
emailQueue.process(async (job) => {
    if (!job.name || job.name === '__default__') {
        const { processarCampanha } = require('./emailQueue'); // Referência local
        // Por padrão, se não tiver nome, tratamos como campanha massa (retrocompatibilidade)
        // Mas o ideal é que todos tenham nome agora.
        return;
    }
});

module.exports = { emailQueue };
