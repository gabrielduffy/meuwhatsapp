const Bull = require('bull');
const config = require('../config/env');
const logger = require('../config/logger');
const emailRepo = require('../repositorios/email.repositorio');
const emailServico = require('../servicos/email.servico');
const { notificarFimDeCampanha } = require('../servicos/notificacao.servico');

// Criar fila Redis para emails
const emailQueue = new Bull('email-marketing', config.redisUrl || 'redis://127.0.0.1:6379');

// Processador da fila
emailQueue.process(async (job) => {
    const { campanhaId, empresaId } = job.data;
    let enviando = 0;
    let falhas = 0;

    logger.info(`[Fila Email] Iniciando processamento da campanha ${campanhaId}`);

    try {
        // 1. Marcar campanha como em andamento
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'enviando');

        // 2. Buscar leads/destinatários
        const { query } = require('../config/database');
        const leadsRes = await query('SELECT * FROM contatos WHERE empresa_id = $1 AND email IS NOT NULL AND email != \'\'', [empresaId]);
        const leads = leadsRes.rows;

        // 3. Buscar template e conexão
        const campanhas = await emailRepo.listarCampanhas(empresaId);
        const campanha = campanhas.find(c => c.id === campanhaId);

        if (!campanha) throw new Error('Campanha não encontrada');

        const template = (await emailRepo.listarTemplates(empresaId)).find(t => t.id === campanha.template_id);

        // 4. Disparar emails (com delay para evitar spam/bloqueio)
        for (const lead of leads) {
            try {
                // Personalizar corpo se houver variáveis
                let html = template.corpo_html || '';
                // Placeholder para fallback se template estiver vazio
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

            // throttling simples
            await new Promise(r => setTimeout(r, 1000));
        }

        const estatisticas = { enviados: enviando, falhas, total: leads.length };

        // 5. Finalizar status
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'concluida', estatisticas);

        // 6. Notificar via Slack (Connect Apps Skill)
        await notificarFimDeCampanha(campanha, estatisticas);

        logger.info(`[Fila Email] Campanha ${campanhaId} concluída. Sucesso: ${enviando}, Falhas: ${falhas}`);
        return estatisticas;

    } catch (error) {
        logger.error(`[Fila Email] Erro crítico na campanha ${campanhaId}:`, error.message);
        await emailRepo.atualizarStatusCampanha(campanhaId, empresaId, 'erro', { erro: error.message });
        throw error;
    }
});

module.exports = { emailQueue };
