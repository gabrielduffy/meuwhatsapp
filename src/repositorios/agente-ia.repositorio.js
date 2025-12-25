const { query } = require('../config/database');

/**
 * Repositório de Agentes IA
 */

/**
 * Criar novo agente
 */
async function criar(dados) {
  const {
    empresaId,
    instanciaId,
    nome,
    personalidade,
    tomDeVoz = 'profissional',
    regrasGerais,
    gatilhos = [],
    configuracoes = {}
  } = dados;

  const sql = `
    INSERT INTO agentes_ia (
      empresa_id,
      instancia_id,
      nome,
      personalidade,
      tom_de_voz,
      regras_gerais,
      gatilhos,
      configuracoes,
      ativo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
    RETURNING *
  `;

  const valores = [
    empresaId,
    instanciaId,
    nome,
    personalidade,
    tomDeVoz,
    regrasGerais,
    JSON.stringify(gatilhos),
    JSON.stringify(configuracoes)
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar agente por ID
 */
async function buscarPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM agentes_ia WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Buscar agente por instância
 */
async function buscarPorInstancia(instanciaId, empresaId = null) {
  let sql = 'SELECT * FROM agentes_ia WHERE instancia_id = $1';
  const params = [instanciaId];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar agentes da empresa
 */
async function listarPorEmpresa(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM agentes_ia WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

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
 * Atualizar agente
 */
async function atualizar(id, empresaId, dados) {
  const camposPermitidos = [
    'nome',
    'personalidade',
    'tom_de_voz',
    'regras_gerais',
    'gatilhos',
    'configuracoes',
    'ativo'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

      // Campos JSONB precisam ser stringificados
      if (campo === 'gatilhos' || campo === 'configuracoes') {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}::jsonb`);
        valores.push(JSON.stringify(dados[campo]));
      } else {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}`);
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
    UPDATE agentes_ia
    SET ${camposAtualizar.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar agente
 */
async function deletar(id, empresaId) {
  const sql = 'DELETE FROM agentes_ia WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Ativar/Desativar agente
 */
async function alterarStatus(id, empresaId, ativo) {
  const sql = `
    UPDATE agentes_ia
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
async function incrementarContadores(id, campo) {
  const camposValidos = ['total_conversas', 'total_mensagens', 'total_tokens'];

  if (!camposValidos.includes(campo)) {
    throw new Error('Campo inválido para incrementar');
  }

  const sql = `
    UPDATE agentes_ia
    SET ${campo} = ${campo} + 1, ultima_interacao_em = NOW()
    WHERE id = $1
    RETURNING ${campo}
  `;

  const resultado = await query(sql, [id]);
  return resultado.rows[0]?.[campo];
}

/**
 * Registrar uso de tokens
 */
async function registrarTokens(id, tokens) {
  const sql = `
    UPDATE agentes_ia
    SET total_tokens = total_tokens + $1, ultima_interacao_em = NOW()
    WHERE id = $2
    RETURNING total_tokens
  `;

  const resultado = await query(sql, [tokens, id]);
  return resultado.rows[0]?.total_tokens;
}

/**
 * Buscar estatísticas do agente
 */
async function obterEstatisticas(id, empresaId) {
  const agente = await buscarPorId(id, empresaId);

  if (!agente) {
    throw new Error('Agente não encontrado');
  }

  // Buscar conversas ativas
  const sqlConversas = `
    SELECT COUNT(*) as total_ativas
    FROM conversas_ia
    WHERE agente_id = $1 AND finalizada = false
  `;
  const conversas = await query(sqlConversas, [id]);

  // Buscar mensagens do mês
  const sqlMensagens = `
    SELECT COUNT(*) as total_mes
    FROM mensagens_ia
    WHERE agente_id = $1
    AND criado_em >= DATE_TRUNC('month', NOW())
  `;
  const mensagens = await query(sqlMensagens, [id]);

  return {
    total_conversas: agente.total_conversas || 0,
    total_mensagens: agente.total_mensagens || 0,
    total_tokens: agente.total_tokens || 0,
    conversas_ativas: parseInt(conversas.rows[0].total_ativas),
    mensagens_mes: parseInt(mensagens.rows[0].total_mes),
    ultima_interacao: agente.ultima_interacao_em,
    ativo: agente.ativo
  };
}

module.exports = {
  criar,
  buscarPorId,
  buscarPorInstancia,
  listarPorEmpresa,
  atualizar,
  deletar,
  alterarStatus,
  incrementarContadores,
  registrarTokens,
  obterEstatisticas
};
