const axios = require('axios');
const config = require('../config/env');

/**
 * Serviço de notificações para integrar com apps externos (Slack, Discord, etc)
 */

async function enviarNotificacaoSlack(webhookUrl, payload) {
    if (!webhookUrl) return;
    try {
        await axios.post(webhookUrl, {
            text: payload.text || 'Nova Notificação',
            attachments: payload.attachments || []
        });
        return true;
    } catch (error) {
        console.error('Erro ao enviar para Slack:', error.message);
        return false;
    }
}

async function notificarFimDeCampanha(campanha, estatisticas) {
    // Exemplo de integração: Se houver um webhook configurado no ENV ou na empresa
    const slackWebhook = config.slackWebhookUrl;
    if (!slackWebhook) return;

    const attachment = {
        color: '#8b5cf6',
        title: `📧 Campanha Finalizada: ${campanha.nome}`,
        fields: [
            { title: 'Enviados', value: estatisticas.enviados, short: true },
            { title: 'Falhas', value: estatisticas.falhas, short: true },
            { title: 'Taxa de Entrega', value: `${((estatisticas.enviados / (estatisticas.enviados + estatisticas.falhas)) * 100).toFixed(2)}%`, short: true }
        ],
        footer: 'MeuWhatsapp Email Marketing'
    };

    return enviarNotificacaoSlack(slackWebhook, { text: 'Relatório de Campanha', attachments: [attachment] });
}

module.exports = {
    enviarNotificacaoSlack,
    notificarFimDeCampanha
};
