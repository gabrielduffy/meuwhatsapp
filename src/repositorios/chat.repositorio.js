const { query } = require('../config/database');

/**
 * Repositório de Chat Interno
 */

// =====================================================
// CONVERSAS
// =====================================================

/**
 * Criar conversa
 */
async function criarConversa(dados) {
  const {
    empresaId,
    instanciaId,
    contatoId,
    status = 'aberta',
    atribuidoPara = null,
    departamento = null
  } = dados;

  const sql = `
    INSERT INTO conversas_chat (
      empresa_id,
      instancia_id,
      contato_id,
      status,
      atribuido_para,
      departamento
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const resultado = await query(sql, [empresaId, instanciaId, contatoId, status, atribuidoPara, departamento]);
  return resultado.rows[0];
}

/**
 * Buscar conversa por ID (Optimized with JOINs to avoid N+1)
 */
async function buscarConversaPorId(id, empresaId = null) {
  let sql = `
    SELECT c.*,
           ct.nome as contato_nome,
           ct.telefone as contato_telefone,
           ct.email as contato_email,
           u.nome as atribuido_nome,
           u.email as atribuido_email
    FROM conversas_chat c
    LEFT JOIN contatos ct ON c.contato_id = ct.id
    LEFT JOIN usuarios u ON c.atribuido_para = u.id
    WHERE c.id = $1
  `;
  const params = [id];

  if (empresaId) {
    sql += ' AND c.empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Buscar conversa por contato (Optimized with JOINs to avoid N+1)
 */
async function buscarConversaPorContato(contatoId, empresaId, status = 'aberta') {
  const sql = `
    SELECT c.*,
           ct.nome as contato_nome,
           ct.telefone as contato_telefone,
           u.nome as atribuido_nome
    FROM conversas_chat c
    LEFT JOIN contatos ct ON c.contato_id = ct.id
    LEFT JOIN usuarios u ON c.atribuido_para = u.id
    WHERE c.contato_id = $1 AND c.empresa_id = $2 AND c.status = $3
    ORDER BY c.criado_em DESC
    LIMIT 1
  `;

  const resultado = await query(sql, [contatoId, empresaId, status]);
  return resultado.rows[0];
}

/**
 * Listar conversas
 */
async function listarConversas(empresaId, filtros = {}) {
  let sql = `
    SELECT c.*,
           ct.nome as contato_nome,
           ct.telefone as contato_telefone,
           u.nome as atribuido_nome
    FROM conversas_chat c
    LEFT JOIN contatos ct ON c.contato_id = ct.id
    LEFT JOIN usuarios u ON c.atribuido_para = u.id
    WHERE c.empresa_id = $1
  `;

  // Subconsulta para última mensagem (com fallback para tipo de mídia se conteúdo for vazio)
  const subqueryUltimaMensagem = `
    (SELECT 
      CASE 
        WHEN conteudo IS NOT NULL AND conteudo != '' THEN conteudo
        WHEN tipo_mensagem = 'imagem' THEN '📷 Imagem'
        WHEN tipo_mensagem = 'audio' THEN '🎙️ Áudio'
        WHEN tipo_mensagem = 'video' THEN '🎥 Vídeo'
        WHEN tipo_mensagem = 'documento' THEN '📄 Documento'
        WHEN tipo_mensagem = 'sticker' THEN '🏷️ Figuninha'
        ELSE 'Mensagem de mídia'
      END
     FROM mensagens_chat 
     WHERE conversa_id = c.id 
     ORDER BY criado_em DESC 
     LIMIT 1) as ultima_mensagem
  `;

  sql = sql.replace('c.*,', `c.*, ${subqueryUltimaMensagem},`);

  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.status) {
    sql += ` AND c.status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  if (filtros.atribuidoPara) {
    sql += ` AND c.atribuido_para = $${paramIndex}`;
    params.push(filtros.atribuidoPara);
    paramIndex++;
  }

  if (filtros.departamento) {
    sql += ` AND c.departamento = $${paramIndex}`;
    params.push(filtros.departamento);
    paramIndex++;
  }

  if (filtros.naoLidas) {
    sql += ` AND c.nao_lidas > 0`;
  }

  sql += ' ORDER BY c.ultima_mensagem_em DESC NULLS LAST, c.criado_em DESC';

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
 * Atualizar conversa
 */
async function atualizarConversa(id, empresaId, dados) {
  const camposPermitidos = ['status', 'atribuido_para', 'departamento'];

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
    UPDATE conversas_chat
    SET ${camposAtualizar.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Atribuir conversa a usuário
 */
async function atribuirConversa(conversaId, empresaId, usuarioId, departamento = null) {
  const campos = ['atribuido_para = $1'];
  const valores = [usuarioId];
  let paramIndex = 2;

  if (departamento) {
    campos.push(`departamento = $${paramIndex}`);
    valores.push(departamento);
    paramIndex++;
  }

  valores.push(conversaId);
  valores.push(empresaId);

  const sql = `
    UPDATE conversas_chat
    SET ${campos.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Fechar conversa
 */
async function fecharConversa(conversaId, empresaId) {
  const sql = `
    UPDATE conversas_chat
    SET status = 'fechada', resolvida_em = NOW(), atualizado_em = NOW()
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [conversaId, empresaId]);
  return resultado.rows[0];
}

/**
 * Reabrir conversa
 */
async function reabrirConversa(conversaId, empresaId) {
  const sql = `
    UPDATE conversas_chat
    SET status = 'aberta', resolvida_em = NULL, atualizado_em = NOW()
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [conversaId, empresaId]);
  return resultado.rows[0];
}

/**
 * Incrementar contador de mensagens não lidas
 */
async function incrementarNaoLidas(conversaId) {
  const sql = `
    UPDATE conversas_chat
    SET nao_lidas = nao_lidas + 1
    WHERE id = $1
    RETURNING nao_lidas
  `;

  const resultado = await query(sql, [conversaId]);
  return resultado.rows[0]?.nao_lidas;
}

/**
 * Marcar como lida
 */
async function marcarComoLida(conversaId, empresaId) {
  const sql = `
    UPDATE conversas_chat
    SET nao_lidas = 0, atualizado_em = NOW()
    WHERE id = $1 AND empresa_id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [conversaId, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar timestamp da última mensagem
 */
async function atualizarUltimaMensagem(conversaId) {
  const sql = `
    UPDATE conversas_chat
    SET ultima_mensagem_em = NOW(),
        total_mensagens = total_mensagens + 1
    WHERE id = $1
    RETURNING *
  `;

  const resultado = await query(sql, [conversaId]);
  return resultado.rows[0];
}

// =====================================================
// MENSAGENS
// =====================================================

/**
 * Criar mensagem
 */
async function criarMensagem(dados) {
  const {
    conversaId,
    empresaId,
    whatsappMensagemId = null,
    direcao,
    remetenteId = null,
    tipoRemetente = null,
    tipoMensagem,
    conteudo,
    midiaUrl = null,
    midiaTipo = null,
    midiaNomeArquivo = null,
    status = 'enviada',
    metadados = {}
  } = dados;

  const sql = `
    INSERT INTO mensagens_chat (
      conversa_id,
      empresa_id,
      whatsapp_mensagem_id,
      direcao,
      remetente_id,
      tipo_remetente,
      tipo_mensagem,
      conteudo,
      midia_url,
      midia_tipo,
      midia_nome_arquivo,
      status,
      metadados
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const valores = [
    conversaId,
    empresaId,
    whatsappMensagemId,
    direcao,
    remetenteId,
    tipoRemetente,
    tipoMensagem,
    conteudo,
    midiaUrl,
    midiaTipo,
    midiaNomeArquivo,
    status,
    JSON.stringify(metadados)
  ];

  const resultado = await query(sql, valores);

  // Atualizar conversa
  await atualizarUltimaMensagem(conversaId);

  // Se for mensagem recebida, incrementar não lidas
  if (direcao === 'recebida') {
    await incrementarNaoLidas(conversaId);
  }

  return resultado.rows[0];
}

/**
 * Listar mensagens da conversa
 */
async function listarMensagens(conversaId, empresaId, filtros = {}) {
  let sql = `
    SELECT m.*,
           u.nome as remetente_nome
    FROM mensagens_chat m
    LEFT JOIN usuarios u ON m.remetente_id = u.id
    WHERE m.conversa_id = $1 AND m.empresa_id = $2
  `;

  const params = [conversaId, empresaId];
  let paramIndex = 3;

  if (filtros.direcao) {
    sql += ` AND m.direcao = $${paramIndex}`;
    params.push(filtros.direcao);
    paramIndex++;
  }

  sql += ' ORDER BY m.criado_em ASC';

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
 * Buscar mensagem por ID do WhatsApp
 */
async function buscarMensagemPorWhatsAppId(whatsappMensagemId, empresaId) {
  const sql = `
    SELECT * FROM mensagens_chat
    WHERE whatsapp_mensagem_id = $1 AND empresa_id = $2
    LIMIT 1
  `;

  const resultado = await query(sql, [whatsappMensagemId, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar status da mensagem
 */
async function atualizarStatusMensagem(id, status) {
  const sql = `
    UPDATE mensagens_chat
    SET status = $1
    WHERE id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [status, id]);
  return resultado.rows[0];
}

/**
 * Deletar mensagem
 */
async function deletarMensagem(id, empresaId) {
  const sql = 'DELETE FROM mensagens_chat WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Atualizar ID do WhatsApp da mensagem
 */
async function atualizarWhatsAppId(id, whatsappMensagemId) {
  const sql = `
    UPDATE mensagens_chat
    SET whatsapp_mensagem_id = $1
    WHERE id = $2
    RETURNING *
  `;

  const resultado = await query(sql, [whatsappMensagemId, id]);
  return resultado.rows[0];
}

/**
 * Deletar conversa individual (e suas mensagens)
 */
async function deletarConversa(id, empresaId) {
  // Deletar mensagens primeiro
  await query('DELETE FROM mensagens_chat WHERE conversa_id = $1 AND empresa_id = $2', [id, empresaId]);

  // Deletar conversa
  const sql = 'DELETE FROM conversas_chat WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Deletar TODAS as conversas da empresa
 */
async function deletarTodasConversas(empresaId) {
  // Deletar mensagens primeiro
  await query('DELETE FROM mensagens_chat WHERE empresa_id = $1', [empresaId]);

  // Deletar conversas
  const sql = 'DELETE FROM conversas_chat WHERE empresa_id = $1 RETURNING *';
  const resultado = await query(sql, [empresaId]);
  return resultado.rows;
}

module.exports = {
  // Conversas
  criarConversa,
  buscarConversaPorId,
  buscarConversaPorContato,
  listarConversas,
  atualizarConversa,
  atribuirConversa,
  fecharConversa,
  reabrirConversa,
  incrementarNaoLidas,
  marcarComoLida,
  atualizarUltimaMensagem,

  // Mensagens
  criarMensagem,
  listarMensagens,
  buscarMensagemPorWhatsAppId,
  atualizarWhatsAppId,
  atualizarStatusMensagem,
  deletarMensagem,
  deletarConversa,
  deletarTodasConversas
};
