const nodemailer = require('nodemailer');
const emailRepo = require('../repositorios/email.repositorio');
const logger = require('../config/logger');

/**
 * Serviço de Email Marketing
 */

// Pool de transportes ativos (cache para não recriar conexão toda vez)
const transporterPool = new Map();

/**
 * Obtém ou cria um transportador Nodemailer para uma conexão SMTP específica
 */
async function getTransporter(conexaoSmtpId, empresaId) {
    const cacheKey = `${empresaId}:${conexaoSmtpId}`;

    if (transporterPool.has(cacheKey)) {
        return transporterPool.get(cacheKey);
    }

    const conexao = await emailRepo.buscarConexaoSMTPPorId(conexaoSmtpId, empresaId);
    if (!conexao) throw new Error('Configuração SMTP não encontrada');

    const transporter = nodemailer.createTransport({
        host: conexao.host,
        port: conexao.porta,
        secure: conexao.secure,
        auth: {
            user: conexao.usuario,
            pass: conexao.senha
        }
    });

    // Verificar conexão
    try {
        await transporter.verify();
        transporterPool.set(cacheKey, transporter);
        return transporter;
    } catch (error) {
        logger.error(`Erro ao validar SMTP ${conexao.nome}:`, error.message);
        throw new Error(`Falha na conexão SMTP: ${error.message}`);
    }
}

/**
 * Envia um email individual
 */
async function enviarEmail(dados) {
    const { empresaId, conexaoSmtpId, to, subject, html, text, fromName, fromEmail } = dados;

    try {
        const transporter = await getTransporter(conexaoSmtpId, empresaId);

        // Buscar conexão para pegar o remetente padrão se não enviado
        const conexao = await emailRepo.buscarConexaoSMTPPorId(conexaoSmtpId, empresaId);

        const mailOptions = {
            from: `"${fromName || conexao.from_name}" <${fromEmail || conexao.from_email}>`,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email enviado com sucesso para ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Erro ao enviar email para ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Processa o envio de uma campanha
 * Aqui entrará a lógica da fila futuramente
 */
async function dispararCampanha(campanhaId, empresaId) {
    // Implementação básica para teste, será delegada para a fila Bull
    const { emailQueue } = require('../queues/emailQueue');
    await emailQueue.add({ campanhaId, empresaId });
    return { mensagem: 'Campanha enviada para a fila de processamento' };
}

module.exports = {
    enviarEmail,
    getTransporter,
    dispararCampanha
};
