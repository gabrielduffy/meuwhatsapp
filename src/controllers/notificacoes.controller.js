const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Controller para gerenciar notificações
 */

// Listar notificações do usuário
async function listarNotificacoes(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { lida, limite = 50, offset = 0 } = req.query;

    let sql = `
      SELECT
        n.*,
        u.nome as usuario_nome
      FROM notificacoes n
      LEFT JOIN usuarios u ON n.usuario_id = u.id
      WHERE n.usuario_id = $1
    `;
    const params = [usuarioId];
    let paramCount = 1;

    // Filtro opcional por lida/não lida
    if (lida !== undefined) {
      paramCount++;
      sql += ` AND n.lida = $${paramCount}`;
      params.push(lida === 'true');
    }

    sql += ` ORDER BY n.criado_em DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limite), parseInt(offset));

    const result = await query(sql, params);

    // Contar total
    let countSql = `
      SELECT COUNT(*) as total
      FROM notificacoes
      WHERE usuario_id = $1
    `;
    const countParams = [usuarioId];

    if (lida !== undefined) {
      countSql += ' AND lida = $2';
      countParams.push(lida === 'true');
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Contar não lidas
    const naoLidasResult = await query(
      'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = $1 AND lida = false',
      [usuarioId]
    );
    const totalNaoLidas = parseInt(naoLidasResult.rows[0].total);

    res.json({
      notificacoes: result.rows,
      paginacao: {
        total,
        limite: parseInt(limite),
        offset: parseInt(offset),
        totalPaginas: Math.ceil(total / limite)
      },
      totalNaoLidas
    });
  } catch (error) {
    logger.error('Erro ao listar notificações:', error);
    res.status(500).json({ erro: 'Erro ao listar notificações' });
  }
}

// Marcar notificação como lida
async function marcarComoLida(req, res) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const result = await query(
      `UPDATE notificacoes
       SET lida = true, lida_em = NOW()
       WHERE id = $1 AND usuario_id = $2
       RETURNING *`,
      [id, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Notificação não encontrada' });
    }

    res.json({ notificacao: result.rows[0], mensagem: 'Notificação marcada como lida' });
  } catch (error) {
    logger.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ erro: 'Erro ao marcar notificação como lida' });
  }
}

// Marcar todas como lidas
async function marcarTodasComoLidas(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const result = await query(
      `UPDATE notificacoes
       SET lida = true, lida_em = NOW()
       WHERE usuario_id = $1 AND lida = false
       RETURNING COUNT(*) as total`,
      [usuarioId]
    );

    res.json({
      mensagem: 'Todas as notificações foram marcadas como lidas',
      total: result.rowCount
    });
  } catch (error) {
    logger.error('Erro ao marcar todas notificações como lidas:', error);
    res.status(500).json({ erro: 'Erro ao marcar notificações como lidas' });
  }
}

// Deletar notificação
async function deletarNotificacao(req, res) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const result = await query(
      'DELETE FROM notificacoes WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Notificação não encontrada' });
    }

    res.json({ mensagem: 'Notificação deletada com sucesso' });
  } catch (error) {
    logger.error('Erro ao deletar notificação:', error);
    res.status(500).json({ erro: 'Erro ao deletar notificação' });
  }
}

// Deletar todas notificações lidas
async function deletarTodasLidas(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const result = await query(
      'DELETE FROM notificacoes WHERE usuario_id = $1 AND lida = true',
      [usuarioId]
    );

    res.json({
      mensagem: 'Notificações lidas deletadas com sucesso',
      total: result.rowCount
    });
  } catch (error) {
    logger.error('Erro ao deletar notificações lidas:', error);
    res.status(500).json({ erro: 'Erro ao deletar notificações' });
  }
}

// Criar notificação (para uso interno/sistema)
async function criarNotificacao(req, res) {
  try {
    const { usuario_id, tipo, titulo, mensagem, url_acao, texto_acao, metadados } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!usuario_id || !tipo || !titulo) {
      return res.status(400).json({ erro: 'Campos obrigatórios: usuario_id, tipo, titulo' });
    }

    const result = await query(
      `INSERT INTO notificacoes
       (usuario_id, empresa_id, tipo, titulo, mensagem, url_acao, texto_acao, metadados)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [usuario_id, empresaId, tipo, titulo, mensagem, url_acao, texto_acao, JSON.stringify(metadados || {})]
    );

    // TODO: Emitir evento Socket.IO para notificação em tempo real
    // io.to(`usuario:${usuario_id}`).emit('nova_notificacao', result.rows[0]);

    res.status(201).json({
      notificacao: result.rows[0],
      mensagem: 'Notificação criada com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao criar notificação:', error);
    res.status(500).json({ erro: 'Erro ao criar notificação' });
  }
}

// Obter estatísticas de notificações
async function obterEstatisticas(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lida = false) as nao_lidas,
        COUNT(*) FILTER (WHERE lida = true) as lidas,
        COUNT(*) FILTER (WHERE tipo = 'sistema') as sistema,
        COUNT(*) FILTER (WHERE tipo = 'mensagem') as mensagens,
        COUNT(*) FILTER (WHERE tipo = 'alerta') as alertas
       FROM notificacoes
       WHERE usuario_id = $1`,
      [usuarioId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao obter estatísticas de notificações:', error);
    res.status(500).json({ erro: 'Erro ao obter estatísticas' });
  }
}

module.exports = {
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  deletarNotificacao,
  deletarTodasLidas,
  criarNotificacao,
  obterEstatisticas
};
