const { query } = require('../config/database');

/**
 * Repositório de Prospecção (Campanhas e Leads)
 */

// =====================================================
// CAMPANHAS
// =====================================================

/**
 * Criar campanha
 */
async function criarCampanha(dados) {
  const {
    empresaId,
    instanciaId,
    nome,
    mensagemModelo,
    agendarPara = null,
    intervaloMin = 3,
    intervaloMax = 8,
    configuracoes = {}
  } = dados;

  const sql = `
    INSERT INTO campanhas_prospeccao (
      empresa_id,
      instancia_id,
      nome,
      mensagem_modelo,
      agendar_para,
      intervalo_min,
      intervalo_max,
      configuracoes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const valores = [
    empresaId,
    instanciaId,
    nome,
    mensagemModelo,
    agendarPara,
    intervaloMin,
    intervaloMax,
    JSON.stringify(configuracoes)
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar campanha por ID
 */
async function buscarCampanhaPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM campanhas_prospeccao WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar campanhas da empresa
 */
async function listarCampanhas(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM campanhas_prospeccao WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(filtros.status);
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
 * Atualizar campanha
 */
async function atualizarCampanha(id, empresaId, dados) {
  const camposPermitidos = [
    'nome',
    'mensagem_modelo',
    'status',
    'agendar_para',
    'iniciada_em',
    'finalizada_em',
    'intervalo_min',
    'intervalo_max',
    'configuracoes'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

    if (dados[campoSnake] !== undefined) {
      if (campo === 'configuracoes') {
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
    UPDATE campanhas_prospeccao
    SET ${camposAtualizar.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar campanha
 */
async function deletarCampanha(id, empresaId) {
  const sql = 'DELETE FROM campanhas_prospeccao WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar status da campanha
 */
async function atualizarStatusCampanha(id, empresaId, status) {
  const statusValidos = ['rascunho', 'agendada', 'em_andamento', 'pausada', 'concluida', 'cancelada'];

  if (!statusValidos.includes(status)) {
    throw new Error('Status inválido');
  }

  const campos = ['status = $1'];
  const valores = [status, id, empresaId];
  let paramIndex = 4;

  // Atualizar timestamps baseado no status
  if (status === 'em_andamento') {
    campos.push('iniciada_em = NOW()');
  } else if (status === 'concluida' || status === 'cancelada') {
    campos.push('finalizada_em = NOW()');
  }

  const sql = `
    UPDATE campanhas_prospeccao
    SET ${campos.join(', ')}, atualizado_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Incrementar contadores da campanha
 */
async function incrementarContadorCampanha(id, campo, quantidade = 1) {
  const camposValidos = [
    'total_leads',
    'leads_enviados',
    'leads_entregues',
    'leads_lidos',
    'leads_respondidos',
    'leads_falhados'
  ];

  if (!camposValidos.includes(campo)) {
    throw new Error('Campo inválido para incrementar');
  }

  const sql = `
    UPDATE campanhas_prospeccao
    SET ${campo} = ${campo} + $1
    WHERE id = $2
    RETURNING ${campo}
  `;

  const resultado = await query(sql, [quantidade, id]);
  return resultado.rows[0]?.[campo];
}

// =====================================================
// LEADS
// =====================================================

/**
 * Criar lead
 */
async function criarLead(dados) {
  const {
    campanhaId,
    empresaId,
    nome,
    telefone,
    origem = 'gmaps_scraper',
    metadados = {},
    agendarPara = null
  } = dados;

  const sql = `
    INSERT INTO leads_prospeccao (
      campanha_id,
      empresa_id,
      nome,
      telefone,
      origem,
      metadados
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const valores = [
    campanhaId,
    empresaId,
    nome,
    telefone,
    origem,
    JSON.stringify(metadados)
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Criar leads em lote
 */
async function criarLeadsEmLote(leads) {
  if (!leads || leads.length === 0) {
    return [];
  }

  // Construir query com múltiplos VALUES
  const valoresPlaceholders = [];
  const valores = [];
  let paramIndex = 1;

  for (const lead of leads) {
    valoresPlaceholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}::jsonb)`
    );

    valores.push(
      lead.campanhaId || null,
      lead.empresaId,
      lead.nome,
      lead.telefone,
      lead.origem || 'gmaps_scraper',
      JSON.stringify(lead.metadados || {})
    );

    paramIndex += 6;
  }

  const sql = `
    INSERT INTO leads_prospeccao (
      campanha_id,
      empresa_id,
      nome,
      telefone,
      origem,
      metadados
    ) VALUES ${valoresPlaceholders.join(', ')}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows;
}

/**
 * Buscar lead por ID
 */
async function buscarLeadPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM leads_prospeccao WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar leads da campanha
 */
async function listarLeadsPorCampanha(campanhaId, empresaId, filtros = {}) {
  let sql = 'SELECT * FROM leads_prospeccao WHERE campanha_id = $1 AND empresa_id = $2';
  const params = [campanhaId, empresaId];
  let paramIndex = 3;

  if (filtros.status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  sql += ' ORDER BY criado_em ASC';

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
 * Buscar próximos leads para enviar
 */
async function buscarProximosLeads(campanhaId, limite = 10) {
  const sql = `
    SELECT * FROM leads_prospeccao
    WHERE campanha_id = $1
    AND status = 'pendente'
    AND (agendar_para IS NULL OR agendar_para <= NOW())
    ORDER BY criado_em ASC
    LIMIT $2
  `;

  const resultado = await query(sql, [campanhaId, limite]);
  return resultado.rows;
}

/**
 * Atualizar status do lead
 */
async function atualizarStatusLead(id, status, dados = {}) {
  const statusValidos = ['pendente', 'enviando', 'enviado', 'entregue', 'lido', 'respondido', 'falhado'];

  if (!statusValidos.includes(status)) {
    throw new Error('Status inválido');
  }

  const campos = ['status = $1'];
  const valores = [status];
  let paramIndex = 2;

  // Atualizar timestamps baseado no status
  if (status === 'enviado') {
    campos.push('enviado_em = NOW()');
  } else if (status === 'entregue') {
    campos.push('entregue_em = NOW()');
  } else if (status === 'lido') {
    campos.push('lido_em = NOW()');
  } else if (status === 'respondido') {
    campos.push('respondido_em = NOW()');
  }

  // ID da mensagem WhatsApp
  if (dados.whatsappMensagemId) {
    campos.push(`whatsapp_mensagem_id = $${paramIndex}`);
    valores.push(dados.whatsappMensagemId);
    paramIndex++;
  }

  // Mensagem de erro
  if (dados.mensagemErro) {
    campos.push(`mensagem_erro = $${paramIndex}`);
    valores.push(dados.mensagemErro);
    paramIndex++;
  }

  // Tentativas
  if (dados.incrementarTentativas) {
    campos.push('tentativas = tentativas + 1');
  }

  valores.push(id);

  const sql = `
    UPDATE leads_prospeccao
    SET ${campos.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar lead
 */
async function deletarLead(id, empresaId) {
  const sql = 'DELETE FROM leads_prospeccao WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

// =====================================================
// IMPORTAÇÕES
// =====================================================

/**
 * Criar importação
 */
async function criarImportacao(dados) {
  const {
    campanhaId,
    empresaId,
    nomeArquivo,
    totalLinhas
  } = dados;

  const sql = `
    INSERT INTO importacoes_leads (
      campanha_id,
      empresa_id,
      nome_arquivo,
      total_linhas
    ) VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const resultado = await query(sql, [campanhaId, empresaId, nomeArquivo, totalLinhas]);
  return resultado.rows[0];
}

/**
 * Atualizar importação
 */
async function atualizarImportacao(id, dados) {
  const campos = [];
  const valores = [];
  let paramIndex = 1;

  if (dados.status) {
    campos.push(`status = $${paramIndex}`);
    valores.push(dados.status);
    paramIndex++;

    if (dados.status === 'processando') {
      campos.push('iniciada_em = NOW()');
    } else if (dados.status === 'concluida' || dados.status === 'falhada') {
      campos.push('finalizada_em = NOW()');
    }
  }

  if (dados.linhasProcessadas !== undefined) {
    campos.push(`linhas_processadas = $${paramIndex}`);
    valores.push(dados.linhasProcessadas);
    paramIndex++;
  }

  if (dados.linhasImportadas !== undefined) {
    campos.push(`linhas_importadas = $${paramIndex}`);
    valores.push(dados.linhasImportadas);
    paramIndex++;
  }

  if (dados.linhasIgnoradas !== undefined) {
    campos.push(`linhas_ignoradas = $${paramIndex}`);
    valores.push(dados.linhasIgnoradas);
    paramIndex++;
  }

  if (dados.mensagemErro) {
    campos.push(`mensagem_erro = $${paramIndex}`);
    valores.push(dados.mensagemErro);
    paramIndex++;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  valores.push(id);

  const sql = `
    UPDATE importacoes_leads
    SET ${campos.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar importação por ID
 */
async function buscarImportacaoPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM importacoes_leads WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Listar importações da campanha
 */
async function listarImportacoes(campanhaId, empresaId) {
  const sql = `
    SELECT * FROM importacoes_leads
    WHERE campanha_id = $1 AND empresa_id = $2
    ORDER BY criado_em DESC
  `;

  const resultado = await query(sql, [campanhaId, empresaId]);
  return resultado.rows;
}

// =====================================================
// HISTÓRICO DE SCRAPING
// =====================================================

/**
 * Criar registro de histórico de scraping
 */
async function criarHistoricoScraping(dados) {
  const { empresaId, niche, city, job_id, leadsColetados = 0, status = 'processando' } = dados;

  const sql = `
    INSERT INTO historico_prospeccao (
      empresa_id, niche, city, job_id, leads_coletados, status
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const resultado = await query(sql, [empresaId, niche, city, job_id, leadsColetados, status]);
  return resultado.rows[0];
}

/**
 * Listar histórico de scraping da empresa
 */
async function listarHistoricoScraping(empresaId) {
  const sql = `
    SELECT * FROM historico_prospeccao
    WHERE empresa_id = $1
    ORDER BY criado_em DESC
    LIMIT 50
  `;

  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

/**
 * Atualizar status e contagem do histórico
 */
async function atualizarHistoricoScraping(job_id, dados) {
  const { status, leadsColetados, mensagem_erro, progresso } = dados;
  const campos = [];
  const valores = [];
  let idx = 1;

  if (status) { campos.push(`status = $${idx++}`); valores.push(status); }
  if (leadsColetados !== undefined) { campos.push(`leads_coletados = $${idx++}`); valores.push(leadsColetados); }
  if (mensagem_erro !== undefined) { campos.push(`mensagem_erro = $${idx++}`); valores.push(mensagem_erro); }
  if (progresso !== undefined) { campos.push(`progresso = $${idx++}`); valores.push(progresso); }

  if (campos.length === 0) return null;

  valores.push(job_id);
  const sql = `
    UPDATE historico_prospeccao
    SET ${campos.join(', ')}
    WHERE job_id = $${idx}
    RETURNING *
  `;
  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Inicializar tabela de histórico se não existir
 */
async function inicializarTabelaHistorico() {
  const sql = `
    CREATE TABLE IF NOT EXISTS historico_prospeccao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
      niche VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      leads_coletados INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'processando',
      job_id VARCHAR(100),
      mensagem_erro TEXT,
      progresso INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    )
  `;
  try {
    await query(sql);

    // Garantir que as colunas novas existam se a tabela já existia
    await query(`ALTER TABLE historico_prospeccao ADD COLUMN IF NOT EXISTS mensagem_erro TEXT`);
    await query(`ALTER TABLE historico_prospeccao ADD COLUMN IF NOT EXISTS progresso INTEGER DEFAULT 0`);

    console.log('✅ Tabela historico_prospeccao verificada/atualizada');
  } catch (e) {
    console.error('❌ Erro ao criar tabela historico_prospeccao:', e.message);
  }
}

module.exports = {
  // Campanhas
  criarCampanha,
  buscarCampanhaPorId,
  listarCampanhas,
  atualizarCampanha,
  deletarCampanha,
  atualizarStatusCampanha,
  incrementarContadorCampanha,

  // Leads
  criarLead,
  criarLeadsEmLote,
  buscarLeadPorId,
  listarLeadsPorCampanha,
  buscarProximosLeads,
  atualizarStatusLead,
  deletarLead,

  // Importações
  criarImportacao,
  atualizarImportacao,
  buscarImportacaoPorId,
  listarImportacoes,

  // Histórico Scraping
  criarHistoricoScraping,
  listarHistoricoScraping,
  atualizarHistoricoScraping,
  inicializarTabelaHistorico
};
