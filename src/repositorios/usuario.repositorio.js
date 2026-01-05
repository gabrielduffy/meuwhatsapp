const { query } = require('../config/database');

const usuarioRepositorio = {
  /**
   * Criar usuário
   */
  async criar(dados) {
    const sql = `
      INSERT INTO usuarios (
        empresa_id, email, senha_hash, nome, avatar_url, telefone,
        funcao, permissoes, email_verificado, token_verificacao_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const valores = [
      dados.empresa_id || null,
      dados.email,
      dados.senha_hash,
      dados.nome,
      dados.avatar_url || null,
      dados.telefone || null,
      dados.funcao || 'usuario',
      JSON.stringify(dados.permissoes || {}),
      dados.email_verificado || false,
      dados.token_verificacao_email || null
    ];

    const resultado = await query(sql, valores);
    return resultado.rows[0];
  },

  /**
   * Buscar por ID
   */
  async buscarPorId(id) {
    const sql = 'SELECT * FROM usuarios WHERE id = $1';
    const resultado = await query(sql, [id]);
    return resultado.rows[0];
  },

  /**
   * Buscar por email
   */
  async buscarPorEmail(email) {
    const sql = 'SELECT * FROM usuarios WHERE email = $1';
    const resultado = await query(sql, [email]);
    return resultado.rows[0];
  },

  /**
   * Listar usuários da empresa
   */
  async listarPorEmpresa(empresaId, opcoes = {}) {
    const {
      limite = 50,
      offset = 0,
      funcao = null,
      ativo = null,
      busca = null
    } = opcoes;

    let sql = 'SELECT * FROM usuarios WHERE empresa_id = $1';
    const valores = [empresaId];
    let contador = 2;

    if (funcao) {
      sql += ` AND funcao = $${contador}`;
      valores.push(funcao);
      contador++;
    }

    if (ativo !== null) {
      sql += ` AND ativo = $${contador}`;
      valores.push(ativo);
      contador++;
    }

    if (busca) {
      sql += ` AND (nome ILIKE $${contador} OR email ILIKE $${contador})`;
      valores.push(`%${busca}%`);
      contador++;
    }

    sql += ` ORDER BY criado_em DESC LIMIT $${contador} OFFSET $${contador + 1}`;
    valores.push(limite, offset);

    const resultado = await query(sql, valores);
    return resultado.rows;
  },

  /**
   * Contar usuários da empresa
   */
  async contarPorEmpresa(empresaId) {
    const sql = 'SELECT COUNT(*) FROM usuarios WHERE empresa_id = $1';
    const resultado = await query(sql, [empresaId]);
    return parseInt(resultado.rows[0].count);
  },

  /**
   * Atualizar usuário
   */
  async atualizar(id, dados) {
    const campos = [];
    const valores = [];
    let contador = 1;

    if (dados.nome !== undefined) {
      campos.push(`nome = $${contador}`);
      valores.push(dados.nome);
      contador++;
    }

    if (dados.email !== undefined) {
      campos.push(`email = $${contador}`);
      valores.push(dados.email);
      contador++;
    }

    if (dados.senha_hash !== undefined) {
      campos.push(`senha_hash = $${contador}`);
      valores.push(dados.senha_hash);
      contador++;
    }

    if (dados.avatar_url !== undefined) {
      campos.push(`avatar_url = $${contador}`);
      valores.push(dados.avatar_url);
      contador++;
    }

    if (dados.telefone !== undefined) {
      campos.push(`telefone = $${contador}`);
      valores.push(dados.telefone);
      contador++;
    }

    if (dados.funcao !== undefined) {
      campos.push(`funcao = $${contador}`);
      valores.push(dados.funcao);
      contador++;
    }

    if (dados.permissoes !== undefined) {
      campos.push(`permissoes = $${contador}`);
      valores.push(JSON.stringify(dados.permissoes));
      contador++;
    }

    if (dados.ativo !== undefined) {
      campos.push(`ativo = $${contador}`);
      valores.push(dados.ativo);
      contador++;
    }

    if (dados.email_verificado !== undefined) {
      campos.push(`email_verificado = $${contador}`);
      valores.push(dados.email_verificado);
      contador++;
    }

    if (dados.preferencias !== undefined) {
      campos.push(`preferencias = $${contador}`);
      valores.push(JSON.stringify(dados.preferencias));
      contador++;
    }

    if (dados.api_token !== undefined) {
      campos.push(`api_token = $${contador}`);
      valores.push(dados.api_token);
      contador++;
    }

    if (campos.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    valores.push(id);
    const sql = `
      UPDATE usuarios
      SET ${campos.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;

    const resultado = await query(sql, valores);
    return resultado.rows[0];
  },

  /**
   * Deletar usuário
   */
  async deletar(id) {
    const sql = 'DELETE FROM usuarios WHERE id = $1 RETURNING id';
    const resultado = await query(sql, [id]);
    return resultado.rowCount > 0;
  },

  /**
   * Atualizar último login
   */
  async atualizarUltimoLogin(id) {
    const sql = 'UPDATE usuarios SET ultimo_login_em = NOW() WHERE id = $1';
    await query(sql, [id]);
  },

  /**
   * Definir token de redefinição de senha
   */
  async definirTokenResetSenha(id, token, expiracao) {
    const sql = `
      UPDATE usuarios
      SET token_redefinir_senha = $1, expira_token_senha = $2
      WHERE id = $3
      RETURNING *
    `;
    const resultado = await query(sql, [token, expiracao, id]);
    return resultado.rows[0];
  },

  /**
   * Buscar por token de reset
   */
  async buscarPorTokenReset(token) {
    const sql = `
      SELECT * FROM usuarios
      WHERE token_redefinir_senha = $1
      AND expira_token_senha > NOW()
    `;
    const resultado = await query(sql, [token]);
    return resultado.rows[0];
  },

  /**
   * Limpar token de reset
   */
  async limparTokenReset(id) {
    const sql = `
      UPDATE usuarios
      SET token_redefinir_senha = NULL, expira_token_senha = NULL
      WHERE id = $1
    `;
    await query(sql, [id]);
  },

  /**
   * Buscar por token de verificação de email
   */
  async buscarPorTokenVerificacao(token) {
    const sql = 'SELECT * FROM usuarios WHERE token_verificacao_email = $1';
    const resultado = await query(sql, [token]);
    return resultado.rows[0];
  },

  /**
   * Verificar email
   */
  async verificarEmail(id) {
    const sql = `
      UPDATE usuarios
      SET email_verificado = true, token_verificacao_email = NULL
      WHERE id = $1
      RETURNING *
    `;
    const resultado = await query(sql, [id]);
    return resultado.rows[0];
  }
};

module.exports = usuarioRepositorio;
