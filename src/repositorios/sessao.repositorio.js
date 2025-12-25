const { query } = require('../config/database');

const sessaoRepositorio = {
  /**
   * Criar sessão (refresh token)
   */
  async criar(dados) {
    const sql = `
      INSERT INTO sessoes_usuario (
        usuario_id, token_atualizacao, info_dispositivo, endereco_ip, expira_em
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const valores = [
      dados.usuario_id,
      dados.token_atualizacao,
      JSON.stringify(dados.info_dispositivo || {}),
      dados.endereco_ip || null,
      dados.expira_em
    ];

    const resultado = await query(sql, valores);
    return resultado.rows[0];
  },

  /**
   * Buscar por token
   */
  async buscarPorToken(token) {
    const sql = `
      SELECT * FROM sessoes_usuario
      WHERE token_atualizacao = $1 AND expira_em > NOW()
    `;
    const resultado = await query(sql, [token]);
    return resultado.rows[0];
  },

  /**
   * Listar sessões do usuário
   */
  async listarPorUsuario(usuarioId) {
    const sql = `
      SELECT * FROM sessoes_usuario
      WHERE usuario_id = $1 AND expira_em > NOW()
      ORDER BY criado_em DESC
    `;
    const resultado = await query(sql, [usuarioId]);
    return resultado.rows;
  },

  /**
   * Deletar sessão específica
   */
  async deletar(token) {
    const sql = 'DELETE FROM sessoes_usuario WHERE token_atualizacao = $1';
    await query(sql, [token]);
  },

  /**
   * Deletar todas as sessões do usuário
   */
  async deletarTodasDoUsuario(usuarioId) {
    const sql = 'DELETE FROM sessoes_usuario WHERE usuario_id = $1';
    await query(sql, [usuarioId]);
  },

  /**
   * Limpar sessões expiradas (manutenção)
   */
  async limparExpiradas() {
    const sql = 'DELETE FROM sessoes_usuario WHERE expira_em <= NOW()';
    const resultado = await query(sql);
    return resultado.rowCount;
  }
};

module.exports = sessaoRepositorio;
