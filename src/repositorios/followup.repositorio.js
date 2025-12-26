const { query } = require('../config/database');

/**
 * Repositório de Follow-up Inteligente
 */

// =====================================================
// SEQUÊNCIAS
// =====================================================

/**
 * Criar sequência
 */
async function criarSequencia(dados) {
  const {
    empresaId,
    nome,
    descricao = null,
    gatilhoTipo,
    gatilhoConfig = {},
    instanciaId = null,
    usarAgenteIa = false,
    agenteId = null,
    horarioInicio = 8,
    horarioFim = 20,
    enviarFimSemana = false
  } = dados;

  const sql = `
    INSERT INTO sequencias_followup (
      empresa_id,
      nome,
      descricao,
      gatilho_tipo,
      gatilho_config,
      instancia_id,
      usar_agente_ia,
      agente_id,
      horario_inicio,
      horario_fim,
      enviar_fim_semana
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const valores = [
    empresaId,
    nome,
    descricao,
    gatilhoTipo,
    JSON.stringify(gatilhoConfig),
    instanciaId,
    usarAgenteIa,
    agenteId,
    horarioInicio,
    horarioFim,
    enviarFimSemana
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar sequência por ID
 */
async function buscarSequenciaPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM sequencias_followup WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar sequências
 */
async function listarSequencias(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM sequencias_followup WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.ativo !== undefined) {
    sql += ` AND ativo = $${paramIndex}`;
    params.push(filtros.ativo);
    paramIndex++;
  }

  if (filtros.gatilhoTipo) {
    sql += ` AND gatilho_tipo = $${paramIndex}`;
    params.push(filtros.gatilhoTipo);
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
 * Atualizar sequência
 */
async function atualizarSequencia(id, empresaId, dados) {
  const camposPermitidos = [
    'nome',
    'descricao',
    'gatilho_tipo',
    'gatilho_config',
    'instancia_id',
    'usar_agente_ia',
    'agente_id',
    'horario_inicio',
    'horario_fim',
    'enviar_fim_semana',
    'ativo'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      if (campo === 'gatilho_config') {
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
    UPDATE sequencias_followup
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar sequência
 */
async function deletarSequencia(id, empresaId) {
  const sql = 'DELETE FROM sequencias_followup WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Ativar/Desativar sequência
 */
async function alterarStatusSequencia(id, empresaId, ativo) {
  const sql = `
    UPDATE sequencias_followup
    SET ativo = $1
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [ativo, id, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar estatísticas da sequência
 */
async function atualizarEstatisticasSequencia(sequenciaId) {
  const sql = `
    UPDATE sequencias_followup
    SET
      total_inscritos = (
        SELECT COUNT(*) FROM inscricoes_followup
        WHERE sequencia_id = $1
      ),
      total_concluidos = (
        SELECT COUNT(*) FROM inscricoes_followup
        WHERE sequencia_id = $1 AND status = 'concluida'
      ),
      total_responderam = (
        SELECT COUNT(*) FROM inscricoes_followup
        WHERE sequencia_id = $1 AND status = 'respondeu'
      )
    WHERE id = $1
    RETURNING *
  `;

  const resultado = await query(sql, [sequenciaId]);
  return resultado.rows[0];
}

// =====================================================
// ETAPAS
// =====================================================

/**
 * Criar etapa
 */
async function criarEtapa(dados) {
  const {
    sequenciaId,
    empresaId,
    ordem,
    delayValor,
    delayUnidade = 'horas',
    tipoAcao = 'mensagem',
    tipoMensagem = 'texto',
    conteudo = null,
    midiaUrl = null,
    condicao = {},
    funilDestinoId = null,
    etapaDestinoId = null,
    webhookUrl = null
  } = dados;

  const sql = `
    INSERT INTO etapas_followup (
      sequencia_id,
      empresa_id,
      ordem,
      delay_valor,
      delay_unidade,
      tipo_acao,
      tipo_mensagem,
      conteudo,
      midia_url,
      condicao,
      funil_destino_id,
      etapa_destino_id,
      webhook_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const valores = [
    sequenciaId,
    empresaId,
    ordem,
    delayValor,
    delayUnidade,
    tipoAcao,
    tipoMensagem,
    conteudo,
    midiaUrl,
    JSON.stringify(condicao),
    funilDestinoId,
    etapaDestinoId,
    webhookUrl
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Listar etapas da sequência
 */
async function listarEtapas(sequenciaId, empresaId) {
  const sql = `
    SELECT * FROM etapas_followup
    WHERE sequencia_id = $1 AND empresa_id = $2
    ORDER BY ordem ASC
  `;

  const resultado = await query(sql, [sequenciaId, empresaId]);
  return resultado.rows;
}

/**
 * Buscar etapa por ID
 */
async function buscarEtapaPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM etapas_followup WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Atualizar etapa
 */
async function atualizarEtapa(id, empresaId, dados) {
  const camposPermitidos = [
    'ordem',
    'delay_valor',
    'delay_unidade',
    'tipo_acao',
    'tipo_mensagem',
    'conteudo',
    'midia_url',
    'condicao',
    'funil_destino_id',
    'etapa_destino_id',
    'webhook_url',
    'ativo'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      if (campo === 'condicao') {
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
    UPDATE etapas_followup
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar etapa
 */
async function deletarEtapa(id, empresaId) {
  const sql = 'DELETE FROM etapas_followup WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

// =====================================================
// INSCRIÇÕES
// =====================================================

/**
 * Inscrever contato
 */
async function inscreverContato(dados) {
  const {
    sequenciaId,
    contatoId,
    empresaId,
    inscritoPor = 'manual',
    proximaExecucao = null
  } = dados;

  const sql = `
    INSERT INTO inscricoes_followup (
      sequencia_id,
      contato_id,
      empresa_id,
      inscrito_por,
      proxima_execucao
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (sequencia_id, contato_id) DO NOTHING
    RETURNING *
  `;

  const valores = [sequenciaId, contatoId, empresaId, inscritoPor, proximaExecucao];

  const resultado = await query(sql, valores);

  // Atualizar estatísticas
  if (resultado.rows[0]) {
    await atualizarEstatisticasSequencia(sequenciaId);
  }

  return resultado.rows[0];
}

/**
 * Listar inscritos da sequência
 */
async function listarInscritos(sequenciaId, empresaId, filtros = {}) {
  let sql = `
    SELECT i.*, c.nome as contato_nome, c.telefone as contato_telefone
    FROM inscricoes_followup i
    LEFT JOIN contatos c ON i.contato_id = c.id
    WHERE i.sequencia_id = $1 AND i.empresa_id = $2
  `;

  const params = [sequenciaId, empresaId];
  let paramIndex = 3;

  if (filtros.status) {
    sql += ` AND i.status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  sql += ' ORDER BY i.criado_em DESC';

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
 * Buscar inscrição por ID
 */
async function buscarInscricaoPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM inscricoes_followup WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Buscar inscrição por contato e sequência
 */
async function buscarInscricaoPorContato(sequenciaId, contatoId, empresaId) {
  const sql = `
    SELECT * FROM inscricoes_followup
    WHERE sequencia_id = $1 AND contato_id = $2 AND empresa_id = $3
    LIMIT 1
  `;

  const resultado = await query(sql, [sequenciaId, contatoId, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar status da inscrição
 */
async function atualizarStatusInscricao(id, status, dados = {}) {
  const statusValidos = ['ativa', 'pausada', 'concluida', 'cancelada', 'respondeu'];

  if (!statusValidos.includes(status)) {
    throw new Error('Status inválido');
  }

  const campos = ['status = $1'];
  const valores = [status];
  let paramIndex = 2;

  // Atualizar timestamps baseado no status
  if (status === 'concluida') {
    campos.push('concluido_em = NOW()');
  } else if (status === 'cancelada') {
    campos.push('cancelado_em = NOW()');
  } else if (status === 'respondeu') {
    campos.push('respondeu_em = NOW()');
  }

  // Atualizar próxima execução se fornecida
  if (dados.proximaExecucao !== undefined) {
    campos.push(`proxima_execucao = $${paramIndex}`);
    valores.push(dados.proximaExecucao);
    paramIndex++;
  }

  // Atualizar etapa atual se fornecida
  if (dados.etapaAtual !== undefined) {
    campos.push(`etapa_atual = $${paramIndex}`);
    valores.push(dados.etapaAtual);
    paramIndex++;
  }

  valores.push(id);

  const sql = `
    UPDATE inscricoes_followup
    SET ${campos.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const resultado = await query(sql, valores);

  // Atualizar estatísticas da sequência
  if (resultado.rows[0]) {
    await atualizarEstatisticasSequencia(resultado.rows[0].sequencia_id);
  }

  return resultado.rows[0];
}

/**
 * Deletar inscrição
 */
async function deletarInscricao(id, empresaId) {
  const sql = 'DELETE FROM inscricoes_followup WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);

  if (resultado.rows[0]) {
    await atualizarEstatisticasSequencia(resultado.rows[0].sequencia_id);
  }

  return resultado.rows[0];
}

/**
 * Buscar inscrições prontas para executar
 */
async function buscarInscricoesProntasParaExecutar() {
  const sql = `
    SELECT i.*, s.horario_inicio, s.horario_fim, s.enviar_fim_semana
    FROM inscricoes_followup i
    JOIN sequencias_followup s ON s.id = i.sequencia_id
    WHERE i.status = 'ativa'
    AND i.proxima_execucao IS NOT NULL
    AND i.proxima_execucao <= NOW()
    AND s.ativo = true
    ORDER BY i.proxima_execucao ASC
    LIMIT 100
  `;

  const resultado = await query(sql);
  return resultado.rows;
}

// =====================================================
// EXECUÇÕES
// =====================================================

/**
 * Criar execução
 */
async function criarExecucao(dados) {
  const {
    inscricaoId,
    etapaId,
    empresaId,
    status,
    mensagemId = null,
    erro = null
  } = dados;

  const sql = `
    INSERT INTO execucoes_followup (
      inscricao_id,
      etapa_id,
      empresa_id,
      status,
      mensagem_id,
      erro
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const valores = [inscricaoId, etapaId, empresaId, status, mensagemId, erro];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Listar execuções da inscrição
 */
async function listarExecucoes(inscricaoId, empresaId) {
  const sql = `
    SELECT e.*, et.ordem as etapa_ordem, et.tipo_acao, et.delay_valor, et.delay_unidade
    FROM execucoes_followup e
    LEFT JOIN etapas_followup et ON e.etapa_id = et.id
    WHERE e.inscricao_id = $1 AND e.empresa_id = $2
    ORDER BY e.executado_em DESC
  `;

  const resultado = await query(sql, [inscricaoId, empresaId]);
  return resultado.rows;
}

module.exports = {
  // Sequências
  criarSequencia,
  buscarSequenciaPorId,
  listarSequencias,
  atualizarSequencia,
  deletarSequencia,
  alterarStatusSequencia,
  atualizarEstatisticasSequencia,

  // Etapas
  criarEtapa,
  listarEtapas,
  buscarEtapaPorId,
  atualizarEtapa,
  deletarEtapa,

  // Inscrições
  inscreverContato,
  listarInscritos,
  buscarInscricaoPorId,
  buscarInscricaoPorContato,
  atualizarStatusInscricao,
  deletarInscricao,
  buscarInscricoesProntasParaExecutar,

  // Execuções
  criarExecucao,
  listarExecucoes
};
