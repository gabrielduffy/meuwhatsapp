const Bull = require('bull');
const config = require('../config/env');
const logger = require('../config/logger');
const emailRepo = require('../repositorios/email.repositorio');
const emailServico = require('../servicos/email.servico');

// Criar fila Redis para emails
const emailQueue = new Bull('email-marketing', config.redisUrl || 'redis://127.0.0.1:6379');

// Processador da fila
emailQueue.process(async (job) => {
    const { campanhaId, empresaId } = job.data;

    logger.info(`[Fila Email] Iniciando processamento da campanha ${campanhaId}`);

    try {
        // 1. Marcar campanha como em andamento
        // TODO: Implementar atualizarStatusCampanha no repositório

        // 2. Buscar leads/destinatários
        // Por enquanto, vamos buscar do repositório de contatos (leads da empresa)
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
            // Personalizar corpo se houver variáveis
            let html = template.corpo_html;
            html = html.replace(/{{nome}}/g, lead.nome || 'Cliente');

            await emailServico.enviarEmail({
                empresaId,
                conexaoSmtpId: campanha.conexao_smtp_id,
                to: lead.email,
                subject: campanha.assunto || template.assunto,
                html: html
            });

            // throttling simples
            await new Promise(r => setTimeout(r, 1000));
        }

        logger.info(`[Fila Email] Campanha ${campanhaId} concluída. Total: ${leads.length}`);
        return { total: leads.length };

    } catch (error) {
        logger.error(`[Fila Email] Erro ao processar campanha ${campanhaId}:`, error.message);
        throw error;
    }
});

module.exports = { emailQueue };
