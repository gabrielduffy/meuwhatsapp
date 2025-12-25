const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_SERVIDOR || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORTA) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USUARIO,
    pass: process.env.SMTP_SENHA
  }
};

const REMETENTE = process.env.SMTP_REMETENTE || 'WhatsBenemax <noreply@whatsbenemax.com>';
const URL_APP = process.env.URL_APP || 'http://localhost:3000';

/**
 * Criar transporter do Nodemailer
 */
function criarTransporter() {
  return nodemailer.createTransporter(SMTP_CONFIG);
}

/**
 * Enviar email genérico
 */
async function enviarEmail({ para, assunto, html, texto }) {
  try {
    const transporter = criarTransporter();

    const info = await transporter.sendMail({
      from: REMETENTE,
      to: para,
      subject: assunto,
      html: html,
      text: texto || html.replace(/<[^>]*>/g, '') // Remove HTML tags
    });

    console.log('[Email] Enviado:', info.messageId);
    return { sucesso: true, messageId: info.messageId };
  } catch (erro) {
    console.error('[Email] Erro ao enviar:', erro.message);
    return { sucesso: false, erro: erro.message };
  }
}

/**
 * Email de verificação de conta
 */
async function enviarEmailVerificacao(usuario, token) {
  const urlVerificacao = `${URL_APP}/verificar/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #5B21B6; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #5B21B6, #10B981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📱 WhatsBenemax</div>
        </div>
        <div class="content">
          <h2>Bem-vindo, ${usuario.nome}!</h2>
          <p>Obrigado por se cadastrar no WhatsBenemax.</p>
          <p>Para ativar sua conta, clique no botão abaixo:</p>
          <p style="text-align: center;">
            <a href="${urlVerificacao}" class="button">Verificar Email</a>
          </p>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="background: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${urlVerificacao}
          </p>
          <p><small>Este link expira em 24 horas.</small></p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} WhatsBenemax. Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail({
    para: usuario.email,
    assunto: 'Verifique seu email - WhatsBenemax',
    html
  });
}

/**
 * Email de redefinição de senha
 */
async function enviarEmailRedefinirSenha(usuario, token) {
  const urlReset = `${URL_APP}/redefinir-senha/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #5B21B6; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #5B21B6, #10B981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📱 WhatsBenemax</div>
        </div>
        <div class="content">
          <h2>Redefinir Senha</h2>
          <p>Olá, ${usuario.nome}!</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${urlReset}" class="button">Redefinir Senha</a>
          </p>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="background: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${urlReset}
          </p>
          <p><small>Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.</small></p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} WhatsBenemax. Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail({
    para: usuario.email,
    assunto: 'Redefinir sua senha - WhatsBenemax',
    html
  });
}

/**
 * Email de boas-vindas
 */
async function enviarEmailBoasVindas(usuario, empresa) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #5B21B6; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #5B21B6, #10B981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        .features { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .features ul { list-style: none; padding: 0; }
        .features li { padding: 10px 0; border-bottom: 1px solid #eee; }
        .features li:before { content: '✓ '; color: #10B981; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📱 WhatsBenemax</div>
        </div>
        <div class="content">
          <h2>Bem-vindo ao WhatsBenemax, ${usuario.nome}! 🎉</h2>
          <p>Sua conta foi criada com sucesso!</p>
          <p>Empresa: <strong>${empresa.nome}</strong></p>

          <div class="features">
            <h3>O que você pode fazer agora:</h3>
            <ul>
              <li>Conectar suas instâncias WhatsApp</li>
              <li>Configurar seu Agente IA personalizado</li>
              <li>Iniciar conversas com seus clientes</li>
              <li>Criar campanhas de prospecção</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${URL_APP}/painel" class="button">Acessar Painel</a>
          </p>

          <p>Se precisar de ajuda, nossa equipe está à disposição!</p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} WhatsBenemax. Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail({
    para: usuario.email,
    assunto: `Bem-vindo ao WhatsBenemax! 🚀`,
    html
  });
}

module.exports = {
  enviarEmail,
  enviarEmailVerificacao,
  enviarEmailRedefinirSenha,
  enviarEmailBoasVindas,
  criarTransporter
};
