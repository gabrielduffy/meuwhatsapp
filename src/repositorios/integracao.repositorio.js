const { query } = require('../config/database');

/**
 * Repositório de Integrações (Webhooks, APIs)
 */

// =====================================================
// INTEGRAÇÕES
// =====================================================

/**
 * Criar integração
 */
async function criar(dados) {
  const {
    empresaId,
    tipo,
    nome,
    descricao = null,
    configuracoes = {}
  } = dados;

  const sql = `
    INSERT INTO integracoes (
      empresa_id,
      tipo,
      nome,
      descricao,
      configuracoes
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const valores = [
    empresaId,
    tipo,
    nome,
    descricao,
    JSON.stringify(configuracoes)
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar integração por ID
 */
async function buscarPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM integracoes WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar integrações da empresa
 */
async function listar(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM integracoes WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.tipo) {
    sql += ` AND tipo = $${paramIndex}`;
    params.push(filtros.tipo);
    paramIndex++;
  }

  if (filtros.ativo !== undefined) {
    sql += ` AND ativo = $${paramIndex}`;
    params.push(filtros.ativo);
    paramIndex++;
  }

  sql += ' ORDER BY criado_em DESC';

  if (filtros.limite) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(filtros.limite);
    paramIndex++;
  }

  if (filtros.offset) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(filtros.offset);
  }

  const resultado = await query(sql, params);
  return resultado.rows;
}

/**
 * Atualizar integração
 */
async function atualizar(id, empresaId, dados) {
  const camposPermitidos = ['nome', 'descricao', 'configuracoes', 'ativo'];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      if (campo === 'configuracoes') {
        camposAtualizar.push(`${campo} = $${paramIndex}::jsonb`);
        valores.push(JSON.stringify(dados[campo]));
      } else {
        camposAtualizar.push(`${campo} = $${paramIndex}`);
        valores.push(dados[campo]);
      }
      paramIndex++;
    }
  }

  if (camposAtualizar.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  valores.push(id);
  valores.push(empresaId);

  const sql = `
    UPDATE integracoes
    SET ${camposAtualizar.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar integração
 */
async function deletar(id, empresaId) {
  const sql = 'DELETE FROM integracoes WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Ativar/Desativar integração
 */
async function alterarStatus(id, empresaId, ativo) {
  const sql = `
    UPDATE integracoes
    SET ativo = $1, atualizado_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [ativo, id, empresaId]);
  return resultado.rows[0];
}

/**
 * Incrementar contadores
 */
async function incrementarContador(id, tipo) {
  const camposValidos = {
    requisicao: 'total_requisicoes',
    sucesso: 'requisicoes_sucesso',
    erro: 'requisicoes_erro'
  };

  const campo = camposValidos[tipo];

  if (!campo) {
    throw new Error('Tipo de contador inválido');
  }

  const sql = `
    UPDATE integracoes
    SET ${campo} = ${campo} + 1,
        ultimo_uso_em = NOW()
    WHERE id = $1
    RETURNING ${campo}
  `;

  const resultado = await query(sql, [id]);
  return resultado.rows[0]?.[campo];
}

// =====================================================
// LOGS
// =====================================================

/**
 * Criar log de integração
 */
async function criarLog(dados) {
  const {
    integracaoId,
    empresaId,
    tipoEvento,
    direcao,
    url,
    metodo,
    payloadEnviado = null,
    payloadRecebido = null,
    codigoHttp = null,
    status,
    duracaoMs = null,
    mensagemErro = null
  } = dados;

  const sql = `
    INSERT INTO logs_integracao (
      integracao_id,
      empresa_id,
      tipo_evento,
      direcao,
      url,
      metodo,
      payload_enviado,
      payload_recebido,
      codigo_http,
      status,
      duracao_ms,
      mensagem_erro
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const valores = [
    integracaoId,
    empresaId,
    tipoEvento,
    direcao,
    url,
    metodo,
    payloadEnviado ? JSON.stringify(payloadEnviado) : null,
    payloadRecebido ? JSON.stringify(payloadRecebido) : null,
    codigoHttp,
    status,
    duracaoMs,
    mensagemErro
  ];

  const resultado = await query(sql, valores);

  // Incrementar contador
  await incrementarContador(integracaoId, status === 'sucesso' ? 'sucesso' : 'erro');

  return resultado.rows[0];
}

/**
 * Listar logs da integração
 */
async function listarLogs(integracaoId, empresaId, filtros = {}) {
  let sql = `
    SELECT * FROM logs_integracao
    WHERE integracao_id = $1 AND empresa_id = $2
  `;

  const params = [integracaoId, empresaId];
  let paramIndex = 3;

  if (filtros.status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  if (filtros.tipoEvento) {
    sql += ` AND tipo_evento = $${paramIndex}`;
    params.push(filtros.tipoEvento);
    paramIndex++;
  }

  sql += ' ORDER BY criado_em DESC';

  if (filtros.limite) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(filtros.limite);
    paramIndex++;
  }

  if (filtros.offset) {
    sql += ` OFFSET $${paramIndex}`;
    params.push(filtros.offset);
  }

  const resultado = await query(sql, params);
  return resultado.rows;
}

/**
 * Buscar log por ID
 */
async function buscarLogPorId(id, empresaId) {
  const sql = 'SELECT * FROM logs_integracao WHERE id = $1 AND empresa_id = $2';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Limpar logs antigos (por data)
 */
async function limparLogsAntigos(integracaoId, diasAntigos = 30) {
  const sql = `
    DELETE FROM logs_integracao
    WHERE integracao_id = $1
    AND criado_em < NOW() - INTERVAL '${diasAntigos} days'
    RETURNING COUNT(*)
  `;

  const resultado = await query(sql, [integracaoId]);
  return parseInt(resultado.rows[0]?.count || 0);
}

/**
 * Obter estatísticas de logs
 */
async function obterEstatisticasLogs(integracaoId, empresaId, periodo = '24 hours') {
  const sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sucesso' THEN 1 ELSE 0 END) as sucessos,
      SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as erros,
      AVG(duracao_ms) as tempo_medio_ms,
      MAX(duracao_ms) as tempo_maximo_ms,
      MIN(duracao_ms) as tempo_minimo_ms
    FROM logs_integracao
    WHERE integracao_id = $1
    AND empresa_id = $2
    AND criado_em >= NOW() - INTERVAL '${periodo}'
  `;

  const resultado = await query(sql, [integracaoId, empresaId]);
  const stats = resultado.rows[0];

  return {
    total: parseInt(stats.total),
    sucessos: parseInt(stats.sucessos),
    erros: parseInt(stats.erros),
    taxa_sucesso: stats.total > 0 ? ((stats.sucessos / stats.total) * 100).toFixed(2) : 0,
    tempo_medio_ms: stats.tempo_medio_ms ? parseFloat(stats.tempo_medio_ms).toFixed(2) : 0,
    tempo_maximo_ms: stats.tempo_maximo_ms || 0,
    tempo_minimo_ms: stats.tempo_minimo_ms || 0,
    periodo
  };
}

module.exports = {
  // Integrações
  criar,
  buscarPorId,
  listar,
  atualizar,
  deletar,
  alterarStatus,
  incrementarContador,

  // Logs
  criarLog,
  listarLogs,
  buscarLogPorId,
  limparLogsAntigos,
  obterEstatisticasLogs
};
