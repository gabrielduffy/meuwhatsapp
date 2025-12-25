const { query } = require('../config/database');

/**
 * Repositório de CRM Kanban
 */

// =====================================================
// FUNIS
// =====================================================

/**
 * Criar funil
 */
async function criarFunil(dados) {
  const {
    empresaId,
    nome,
    descricao = null,
    cor = '#5B21B6',
    movimentacaoAutomatica = false,
    configIa = {},
    padrao = false
  } = dados;

  const sql = `
    INSERT INTO funis (
      empresa_id,
      nome,
      descricao,
      cor,
      movimentacao_automatica,
      config_ia,
      padrao
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const valores = [
    empresaId,
    nome,
    descricao,
    cor,
    movimentacaoAutomatica,
    JSON.stringify(configIa),
    padrao
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar funil por ID
 */
async function buscarFunilPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM funis WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar funis da empresa
 */
async function listarFunis(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM funis WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.ativo !== undefined) {
    sql += ` AND ativo = $${paramIndex}`;
    params.push(filtros.ativo);
    paramIndex++;
  }

  sql += ' ORDER BY ordem ASC, criado_em ASC';

  const resultado = await query(sql, params);
  return resultado.rows;
}

/**
 * Atualizar funil
 */
async function atualizarFunil(id, empresaId, dados) {
  const camposPermitidos = [
    'nome',
    'descricao',
    'cor',
    'movimentacao_automatica',
    'config_ia',
    'padrao',
    'ativo',
    'ordem'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

    if (dados[campoSnake] !== undefined) {
      if (campoSnake === 'config_ia') {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}::jsonb`);
        valores.push(JSON.stringify(dados[campoSnake]));
      } else {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}`);
        valores.push(dados[campoSnake]);
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
    UPDATE funis
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar funil
 */
async function deletarFunil(id, empresaId) {
  const sql = 'DELETE FROM funis WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

// =====================================================
// ETAPAS DO FUNIL
// =====================================================

/**
 * Criar etapa
 */
async function criarEtapa(dados) {
  const {
    funilId,
    empresaId,
    nome,
    cor = '#5B21B6',
    ordem = 0,
    limiteDias = null,
    aoEntrar = {}
  } = dados;

  const sql = `
    INSERT INTO etapas_funil (
      funil_id,
      empresa_id,
      nome,
      cor,
      ordem,
      limite_dias,
      ao_entrar
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const valores = [
    funilId,
    empresaId,
    nome,
    cor,
    ordem,
    limiteDias,
    JSON.stringify(aoEntrar)
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Listar etapas do funil
 */
async function listarEtapas(funilId, empresaId) {
  const sql = `
    SELECT * FROM etapas_funil
    WHERE funil_id = $1 AND empresa_id = $2
    ORDER BY ordem ASC
  `;

  const resultado = await query(sql, [funilId, empresaId]);
  return resultado.rows;
}

/**
 * Buscar etapa por ID
 */
async function buscarEtapaPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM etapas_funil WHERE id = $1';
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
  const camposPermitidos = ['nome', 'cor', 'ordem', 'limite_dias', 'ao_entrar'];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

    if (dados[campoSnake] !== undefined) {
      if (campoSnake === 'ao_entrar') {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}::jsonb`);
        valores.push(JSON.stringify(dados[campoSnake]));
      } else {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}`);
        valores.push(dados[campoSnake]);
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
    UPDATE etapas_funil
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
  const sql = 'DELETE FROM etapas_funil WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar estatísticas da etapa
 */
async function atualizarEstatisticasEtapa(etapaId) {
  const sql = `
    UPDATE etapas_funil
    SET
      total_negocios = (
        SELECT COUNT(*) FROM negociacoes
        WHERE etapa_id = $1 AND status = 'aberta'
      ),
      valor_total = (
        SELECT COALESCE(SUM(valor), 0) FROM negociacoes
        WHERE etapa_id = $1 AND status = 'aberta'
      )
    WHERE id = $1
    RETURNING *
  `;

  const resultado = await query(sql, [etapaId]);
  return resultado.rows[0];
}

// =====================================================
// NEGOCIAÇÕES
// =====================================================

/**
 * Criar negociação
 */
async function criarNegociacao(dados) {
  const {
    empresaId,
    funilId,
    etapaId = null,
    contatoId = null,
    titulo,
    valor = 0,
    responsavelId = null,
    origem = 'manual',
    origemId = null,
    dataPrevisaoFechamento = null,
    prioridade = 'normal',
    camposPersonalizados = {},
    etiquetas = []
  } = dados;

  const sql = `
    INSERT INTO negociacoes (
      empresa_id,
      funil_id,
      etapa_id,
      contato_id,
      titulo,
      valor,
      responsavel_id,
      origem,
      origem_id,
      data_previsao_fechamento,
      prioridade,
      campos_personalizados,
      etiquetas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const valores = [
    empresaId,
    funilId,
    etapaId,
    contatoId,
    titulo,
    valor,
    responsavelId,
    origem,
    origemId,
    dataPrevisaoFechamento,
    prioridade,
    JSON.stringify(camposPersonalizados),
    JSON.stringify(etiquetas)
  ];

  const resultado = await query(sql, valores);

  // Criar histórico
  await criarHistorico({
    negociacaoId: resultado.rows[0].id,
    empresaId,
    tipo: 'criada',
    usuarioId: responsavelId,
    dados: { origem }
  });

  // Atualizar estatísticas da etapa
  if (etapaId) {
    await atualizarEstatisticasEtapa(etapaId);
  }

  return resultado.rows[0];
}

/**
 * Buscar negociação por ID
 */
async function buscarNegociacaoPorId(id, empresaId = null) {
  let sql = `
    SELECT n.*,
           c.nome as contato_nome,
           c.telefone as contato_telefone,
           u.nome as responsavel_nome,
           e.nome as etapa_nome,
           f.nome as funil_nome
    FROM negociacoes n
    LEFT JOIN contatos c ON n.contato_id = c.id
    LEFT JOIN usuarios u ON n.responsavel_id = u.id
    LEFT JOIN etapas_funil e ON n.etapa_id = e.id
    LEFT JOIN funis f ON n.funil_id = f.id
    WHERE n.id = $1
  `;

  const params = [id];

  if (empresaId) {
    sql += ' AND n.empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar negociações
 */
async function listarNegociacoes(empresaId, filtros = {}) {
  let sql = `
    SELECT n.*,
           c.nome as contato_nome,
           u.nome as responsavel_nome,
           e.nome as etapa_nome
    FROM negociacoes n
    LEFT JOIN contatos c ON n.contato_id = c.id
    LEFT JOIN usuarios u ON n.responsavel_id = u.id
    LEFT JOIN etapas_funil e ON n.etapa_id = e.id
    WHERE n.empresa_id = $1
  `;

  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.funilId) {
    sql += ` AND n.funil_id = $${paramIndex}`;
    params.push(filtros.funilId);
    paramIndex++;
  }

  if (filtros.etapaId) {
    sql += ` AND n.etapa_id = $${paramIndex}`;
    params.push(filtros.etapaId);
    paramIndex++;
  }

  if (filtros.status) {
    sql += ` AND n.status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  if (filtros.responsavelId) {
    sql += ` AND n.responsavel_id = $${paramIndex}`;
    params.push(filtros.responsavelId);
    paramIndex++;
  }

  if (filtros.prioridade) {
    sql += ` AND n.prioridade = $${paramIndex}`;
    params.push(filtros.prioridade);
    paramIndex++;
  }

  sql += ' ORDER BY n.posicao ASC, n.criado_em DESC';

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
 * Atualizar negociação
 */
async function atualizarNegociacao(id, empresaId, dados, usuarioId = null) {
  const camposPermitidos = [
    'titulo',
    'valor',
    'responsavel_id',
    'data_previsao_fechamento',
    'prioridade',
    'campos_personalizados',
    'etiquetas'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;
  const alteracoes = {};

  for (const campo of camposPermitidos) {
    const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

    if (dados[campoSnake] !== undefined) {
      if (campoSnake === 'campos_personalizados' || campoSnake === 'etiquetas') {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}::jsonb`);
        valores.push(JSON.stringify(dados[campoSnake]));
      } else {
        camposAtualizar.push(`${campoSnake} = $${paramIndex}`);
        valores.push(dados[campoSnake]);
      }
      alteracoes[campo] = dados[campoSnake];
      paramIndex++;
    }
  }

  if (camposAtualizar.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  valores.push(id);
  valores.push(empresaId);

  const sql = `
    UPDATE negociacoes
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);

  // Criar histórico
  if (resultado.rows[0]) {
    await criarHistorico({
      negociacaoId: id,
      empresaId,
      tipo: 'editada',
      usuarioId,
      dados: { alteracoes }
    });
  }

  return resultado.rows[0];
}

/**
 * Mover negociação para outra etapa
 */
async function moverNegociacao(id, empresaId, novaEtapaId, dadosMovimentacao = {}) {
  // Buscar negociação e etapa atual
  const negociacaoAtual = await buscarNegociacaoPorId(id, empresaId);

  if (!negociacaoAtual) {
    throw new Error('Negociação não encontrada');
  }

  const etapaAnteriorNome = negociacaoAtual.etapa_nome;

  // Atualizar negociação
  const sql = `
    UPDATE negociacoes
    SET etapa_id = $1, entrou_etapa_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [novaEtapaId, id, empresaId]);

  // Buscar nova etapa
  const novaEtapa = await buscarEtapaPorId(novaEtapaId, empresaId);

  // Criar histórico
  await criarHistorico({
    negociacaoId: id,
    empresaId,
    tipo: 'movida',
    usuarioId: dadosMovimentacao.usuarioId || null,
    dados: {
      de_etapa: etapaAnteriorNome,
      para_etapa: novaEtapa.nome,
      automatico: dadosMovimentacao.automatico || false,
      motivo: dadosMovimentacao.motivo || null
    }
  });

  // Atualizar estatísticas das etapas
  if (negociacaoAtual.etapa_id) {
    await atualizarEstatisticasEtapa(negociacaoAtual.etapa_id);
  }
  await atualizarEstatisticasEtapa(novaEtapaId);

  return resultado.rows[0];
}

/**
 * Marcar negociação como ganha
 */
async function ganharNegociacao(id, empresaId, usuarioId = null) {
  const sql = `
    UPDATE negociacoes
    SET status = 'ganha', data_fechamento = NOW()
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [id, empresaId]);

  if (resultado.rows[0]) {
    // Criar histórico
    await criarHistorico({
      negociacaoId: id,
      empresaId,
      tipo: 'ganha',
      usuarioId,
      dados: { valor: resultado.rows[0].valor }
    });

    // Atualizar estatísticas
    if (resultado.rows[0].etapa_id) {
      await atualizarEstatisticasEtapa(resultado.rows[0].etapa_id);
    }
  }

  return resultado.rows[0];
}

/**
 * Marcar negociação como perdida
 */
async function perderNegociacao(id, empresaId, motivoPerda, usuarioId = null) {
  const sql = `
    UPDATE negociacoes
    SET status = 'perdida', motivo_perda = $1, data_fechamento = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [motivoPerda, id, empresaId]);

  if (resultado.rows[0]) {
    // Criar histórico
    await criarHistorico({
      negociacaoId: id,
      empresaId,
      tipo: 'perdida',
      usuarioId,
      dados: { motivo: motivoPerda }
    });

    // Atualizar estatísticas
    if (resultado.rows[0].etapa_id) {
      await atualizarEstatisticasEtapa(resultado.rows[0].etapa_id);
    }
  }

  return resultado.rows[0];
}

/**
 * Deletar negociação
 */
async function deletarNegociacao(id, empresaId) {
  const sql = 'DELETE FROM negociacoes WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);

  if (resultado.rows[0] && resultado.rows[0].etapa_id) {
    await atualizarEstatisticasEtapa(resultado.rows[0].etapa_id);
  }

  return resultado.rows[0];
}

// =====================================================
// HISTÓRICO
// =====================================================

/**
 * Criar histórico
 */
async function criarHistorico(dados) {
  const { negociacaoId, empresaId, tipo, usuarioId = null, dados: dadosAcao = {} } = dados;

  const sql = `
    INSERT INTO historico_negociacao (
      negociacao_id,
      empresa_id,
      tipo,
      usuario_id,
      dados
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const valores = [negociacaoId, empresaId, tipo, usuarioId, JSON.stringify(dadosAcao)];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Listar histórico da negociação
 */
async function listarHistorico(negociacaoId, empresaId) {
  const sql = `
    SELECT h.*, u.nome as usuario_nome
    FROM historico_negociacao h
    LEFT JOIN usuarios u ON h.usuario_id = u.id
    WHERE h.negociacao_id = $1 AND h.empresa_id = $2
    ORDER BY h.criado_em DESC
  `;

  const resultado = await query(sql, [negociacaoId, empresaId]);
  return resultado.rows;
}

// =====================================================
// TAREFAS
// =====================================================

/**
 * Criar tarefa
 */
async function criarTarefa(dados) {
  const {
    negociacaoId,
    empresaId,
    titulo,
    descricao = null,
    responsavelId = null,
    prazo = null,
    lembrarEm = null
  } = dados;

  const sql = `
    INSERT INTO tarefas_negociacao (
      negociacao_id,
      empresa_id,
      titulo,
      descricao,
      responsavel_id,
      prazo,
      lembrar_em
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const valores = [negociacaoId, empresaId, titulo, descricao, responsavelId, prazo, lembrarEm];

  const resultado = await query(sql, valores);

  // Criar histórico
  await criarHistorico({
    negociacaoId,
    empresaId,
    tipo: 'tarefa_criada',
    usuarioId: responsavelId,
    dados: { tarefa: titulo }
  });

  return resultado.rows[0];
}

/**
 * Listar tarefas da negociação
 */
async function listarTarefas(negociacaoId, empresaId, filtros = {}) {
  let sql = `
    SELECT t.*, u.nome as responsavel_nome
    FROM tarefas_negociacao t
    LEFT JOIN usuarios u ON t.responsavel_id = u.id
    WHERE t.negociacao_id = $1 AND t.empresa_id = $2
  `;

  const params = [negociacaoId, empresaId];
  let paramIndex = 3;

  if (filtros.concluida !== undefined) {
    sql += ` AND t.concluida = $${paramIndex}`;
    params.push(filtros.concluida);
    paramIndex++;
  }

  sql += ' ORDER BY t.prazo ASC NULLS LAST, t.criado_em DESC';

  const resultado = await query(sql, params);
  return resultado.rows;
}

/**
 * Atualizar tarefa
 */
async function atualizarTarefa(id, empresaId, dados) {
  const camposPermitidos = ['titulo', 'descricao', 'responsavel_id', 'prazo', 'lembrar_em'];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

    if (dados[campoSnake] !== undefined) {
      camposAtualizar.push(`${campoSnake} = $${paramIndex}`);
      valores.push(dados[campoSnake]);
      paramIndex++;
    }
  }

  if (camposAtualizar.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  valores.push(id);
  valores.push(empresaId);

  const sql = `
    UPDATE tarefas_negociacao
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Concluir tarefa
 */
async function concluirTarefa(id, empresaId, usuarioId) {
  const sql = `
    UPDATE tarefas_negociacao
    SET concluida = true, concluida_em = NOW(), concluida_por = $1
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [usuarioId, id, empresaId]);

  if (resultado.rows[0]) {
    // Criar histórico
    await criarHistorico({
      negociacaoId: resultado.rows[0].negociacao_id,
      empresaId,
      tipo: 'tarefa_concluida',
      usuarioId,
      dados: { tarefa: resultado.rows[0].titulo }
    });
  }

  return resultado.rows[0];
}

/**
 * Deletar tarefa
 */
async function deletarTarefa(id, empresaId) {
  const sql = 'DELETE FROM tarefas_negociacao WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

// =====================================================
// CAMPOS PERSONALIZADOS
// =====================================================

/**
 * Criar campo personalizado
 */
async function criarCampoPersonalizado(dados) {
  const {
    empresaId,
    nome,
    slug,
    tipo,
    opcoes = [],
    obrigatorio = false,
    ordem = 0
  } = dados;

  const sql = `
    INSERT INTO campos_personalizados (
      empresa_id,
      nome,
      slug,
      tipo,
      opcoes,
      obrigatorio,
      ordem
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const valores = [empresaId, nome, slug, tipo, JSON.stringify(opcoes), obrigatorio, ordem];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Listar campos personalizados
 */
async function listarCamposPersonalizados(empresaId) {
  const sql = `
    SELECT * FROM campos_personalizados
    WHERE empresa_id = $1 AND ativo = true
    ORDER BY ordem ASC
  `;

  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

/**
 * Atualizar campo personalizado
 */
async function atualizarCampoPersonalizado(id, empresaId, dados) {
  const camposPermitidos = ['nome', 'tipo', 'opcoes', 'obrigatorio', 'ordem', 'ativo'];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      if (campo === 'opcoes') {
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
    UPDATE campos_personalizados
    SET ${camposAtualizar.join(', ')}
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar campo personalizado
 */
async function deletarCampoPersonalizado(id, empresaId) {
  const sql = 'DELETE FROM campos_personalizados WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

// =====================================================
// ESTATÍSTICAS
// =====================================================

/**
 * Obter estatísticas do CRM
 */
async function obterEstatisticasCRM(empresaId, filtros = {}) {
  let whereClause = 'WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.funilId) {
    whereClause += ` AND funil_id = $${paramIndex}`;
    params.push(filtros.funilId);
    paramIndex++;
  }

  if (filtros.responsavelId) {
    whereClause += ` AND responsavel_id = $${paramIndex}`;
    params.push(filtros.responsavelId);
    paramIndex++;
  }

  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'aberta') as total_abertas,
      COUNT(*) FILTER (WHERE status = 'ganha') as total_ganhas,
      COUNT(*) FILTER (WHERE status = 'perdida') as total_perdidas,
      COALESCE(SUM(valor) FILTER (WHERE status = 'aberta'), 0) as valor_aberto,
      COALESCE(SUM(valor) FILTER (WHERE status = 'ganha'), 0) as valor_ganho,
      COALESCE(SUM(valor) FILTER (WHERE status = 'perdida'), 0) as valor_perdido
    FROM negociacoes
    ${whereClause}
  `;

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

module.exports = {
  // Funis
  criarFunil,
  buscarFunilPorId,
  listarFunis,
  atualizarFunil,
  deletarFunil,

  // Etapas
  criarEtapa,
  listarEtapas,
  buscarEtapaPorId,
  atualizarEtapa,
  deletarEtapa,
  atualizarEstatisticasEtapa,

  // Negociações
  criarNegociacao,
  buscarNegociacaoPorId,
  listarNegociacoes,
  atualizarNegociacao,
  moverNegociacao,
  ganharNegociacao,
  perderNegociacao,
  deletarNegociacao,

  // Histórico
  criarHistorico,
  listarHistorico,

  // Tarefas
  criarTarefa,
  listarTarefas,
  atualizarTarefa,
  concluirTarefa,
  deletarTarefa,

  // Campos Personalizados
  criarCampoPersonalizado,
  listarCamposPersonalizados,
  atualizarCampoPersonalizado,
  deletarCampoPersonalizado,

  // Estatísticas
  obterEstatisticasCRM
};
