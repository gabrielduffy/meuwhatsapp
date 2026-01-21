const { query } = require('../config/database');
const { criptografar, descriptografar } = require('../utilitarios/criptografia');

/**
 * Repositório para o módulo de Email Marketing
 */

// =====================================================
// CONEXÕES SMTP
// =====================================================


async function criarConexaoSMTP(empresaId, dados) {
  const { nome, host, porta, usuario, senha, secure, fromEmail, fromName } = dados;
  const senhaCripto = criptografar(senha);

  const sql = `
    INSERT INTO conexoes_smtp (
      empresa_id, nome, host, porta, usuario, senha, secure, from_email, from_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, nome, host, porta, usuario, secure, from_email, from_name, ativo, criado_em
  `;

  const resultado = await query(sql, [
    empresaId, nome, host, porta, usuario, senhaCripto, secure, fromEmail, fromName
  ]);
  return resultado.rows[0];
}

async function listarConexoesSMTP(empresaId) {
  const sql = `
    SELECT id, nome, host, porta, usuario, secure, from_email, from_name, ativo, criado_em
    FROM conexoes_smtp
    WHERE empresa_id = $1
    ORDER BY criado_em DESC
  `;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

async function buscarConexaoSMTPPorId(id, empresaId) {
  const sql = `SELECT * FROM conexoes_smtp WHERE id = $1 AND empresa_id = $2`;
  const resultado = await query(sql, [id, empresaId]);
  const conexao = resultado.rows[0];

  if (conexao && conexao.senha) {
    conexao.senha = descriptografar(conexao.senha);
  }

  return conexao;
}

// =====================================================
// TEMPLATES
// =====================================================


async function criarTemplate(empresaId, dados) {
  const { nome, assunto, corpoHtml, corpoTexto, variaveis = [] } = dados;
  const sql = `
    INSERT INTO templates_email (empresa_id, nome, assunto, corpo_html, corpo_texto, variaveis)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const resultado = await query(sql, [empresaId, nome, assunto, corpoHtml, corpoTexto, JSON.stringify(variaveis)]);
  return resultado.rows[0];
}

async function listarTemplates(empresaId) {
  const sql = `SELECT * FROM templates_email WHERE empresa_id = $1 ORDER BY criado_em DESC`;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

// =====================================================
// CAMPANHAS
// =====================================================


async function criarCampanha(empresaId, dados) {
  const { nome, assunto, conexaoSmtpId, templateId, agendarPara } = dados;
  const sql = `
    INSERT INTO campanhas_email (empresa_id, nome, assunto, conexao_smtp_id, template_id, agendar_para)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const resultado = await query(sql, [empresaId, nome, assunto, conexaoSmtpId, templateId, agendarPara]);
  return resultado.rows[0];
}

async function listarCampanhas(empresaId) {
  const sql = `
    SELECT c.*, t.nome as template_nome, s.nome as smtp_nome
    FROM campanhas_email c
    LEFT JOIN templates_email t ON c.template_id = t.id
    LEFT JOIN conexoes_smtp s ON c.conexao_smtp_id = s.id
    WHERE c.empresa_id = $1
    ORDER BY c.criado_em DESC
  `;
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

module.exports = {
  criarConexaoSMTP,
  listarConexoesSMTP,
  buscarConexaoSMTPPorId,
  criarTemplate,
  listarTemplates,
  criarCampanha,
  listarCampanhas
};
