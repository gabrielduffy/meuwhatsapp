const { query } = require('../config/database');

/**
 * Repositório de Contatos (CRM)
 */

/**
 * Criar contato
 */
async function criar(dados) {
  const {
    empresaId,
    nome,
    telefone,
    email = null,
    empresa = null,
    cargo = null,
    tags = [],
    campos_customizados = {},
    observacoes = null
  } = dados;

  const sql = `
    INSERT INTO contatos (
      empresa_id,
      nome,
      telefone,
      email,
      empresa,
      cargo,
      tags,
      campos_customizados,
      observacoes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const valores = [
    empresaId,
    nome,
    telefone,
    email,
    empresa,
    cargo,
    JSON.stringify(tags),
    JSON.stringify(campos_customizados),
    observacoes
  ];

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Buscar contato por ID
 */
async function buscarPorId(id, empresaId = null) {
  let sql = 'SELECT * FROM contatos WHERE id = $1';
  const params = [id];

  if (empresaId) {
    sql += ' AND empresa_id = $2';
    params.push(empresaId);
  }

  const resultado = await query(sql, params);
  return resultado.rows[0];
}

/**
 * Buscar contato por telefone
 */
async function buscarPorTelefone(telefone, empresaId) {
  // Se for um grupo, não limpamos os caracteres não-numéricos (e.g. @g.us)
  const isGroup = telefone.includes('@g.us');
  const telefoneBusca = isGroup ? telefone : telefone.replace(/\D/g, '');

  const sql = isGroup
    ? `SELECT * FROM contatos WHERE empresa_id = $1 AND telefone = $2 LIMIT 1`
    : `SELECT * FROM contatos WHERE empresa_id = $1 AND REPLACE(REPLACE(REPLACE(telefone, '-', ''), '(', ''), ')', '') = $2 LIMIT 1`;

  const resultado = await query(sql, [empresaId, telefoneBusca]);
  return resultado.rows[0];
}

/**
 * Buscar contato por email
 */
async function buscarPorEmail(email, empresaId) {
  const sql = 'SELECT * FROM contatos WHERE empresa_id = $1 AND email = $2 LIMIT 1';
  const resultado = await query(sql, [empresaId, email]);
  return resultado.rows[0];
}

/**
 * Listar contatos da empresa
 */
async function listar(empresaId, filtros = {}) {
  let sql = 'SELECT * FROM contatos WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  // Filtro por nome ou telefone (busca)
  if (filtros.busca) {
    sql += ` AND (nome ILIKE $${paramIndex} OR telefone ILIKE $${paramIndex})`;
    params.push(`%${filtros.busca}%`);
    paramIndex++;
  }

  // Filtro por tags
  if (filtros.tag) {
    sql += ` AND tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify([filtros.tag]));
    paramIndex++;
  }

  // Ordenação
  const ordenacaoValida = ['nome', 'criado_em', 'atualizado_em'];
  const ordem = ordenacaoValida.includes(filtros.ordenarPor) ? filtros.ordenarPor : 'criado_em';
  const direcao = filtros.direcao === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${ordem} ${direcao}`;

  // Paginação
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
 * Contar contatos da empresa
 */
async function contar(empresaId, filtros = {}) {
  let sql = 'SELECT COUNT(*) FROM contatos WHERE empresa_id = $1';
  const params = [empresaId];
  let paramIndex = 2;

  if (filtros.busca) {
    sql += ` AND (nome ILIKE $${paramIndex} OR telefone ILIKE $${paramIndex})`;
    params.push(`%${filtros.busca}%`);
    paramIndex++;
  }

  if (filtros.tag) {
    sql += ` AND tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify([filtros.tag]));
  }

  const resultado = await query(sql, params);
  return parseInt(resultado.rows[0].count);
}

/**
 * Atualizar contato
 */
async function atualizar(id, empresaId, dados) {
  const camposPermitidos = [
    'nome',
    'telefone',
    'email',
    'empresa',
    'cargo',
    'tags',
    'campos_customizados',
    'observacoes'
  ];

  const camposAtualizar = [];
  const valores = [];
  let paramIndex = 1;

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      // Converter camelCase para snake_case
      const campoSnake = campo.replace(/([A-Z])/g, '_$1').toLowerCase();

      // Campos JSONB
      if (campo === 'tags' || campo === 'campos_customizados') {
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
    UPDATE contatos
    SET ${camposAtualizar.join(', ')}, atualizado_em = NOW()
    WHERE id = $${paramIndex} AND empresa_id = $${paramIndex + 1}
    RETURNING *
  `;

  const resultado = await query(sql, valores);
  return resultado.rows[0];
}

/**
 * Deletar contato
 */
async function deletar(id, empresaId) {
  const sql = 'DELETE FROM contatos WHERE id = $1 AND empresa_id = $2 RETURNING *';
  const resultado = await query(sql, [id, empresaId]);
  return resultado.rows[0];
}

/**
 * Adicionar tag ao contato
 */
async function adicionarTag(id, empresaId, tag) {
  const sql = `
    UPDATE contatos
    SET tags = CASE
      WHEN tags @> $1::jsonb THEN tags
      ELSE tags || $1::jsonb
    END,
    atualizado_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [JSON.stringify([tag]), id, empresaId]);
  return resultado.rows[0];
}

/**
 * Remover tag do contato
 */
async function removerTag(id, empresaId, tag) {
  const sql = `
    UPDATE contatos
    SET tags = (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(tags) elem
      WHERE elem != $1::jsonb
    ),
    atualizado_em = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [JSON.stringify(tag), id, empresaId]);
  return resultado.rows[0];
}

/**
 * Criar ou atualizar contato (upsert por telefone)
 */
async function criarOuAtualizar(dados) {
  const { empresaId, telefone } = dados;

  // Verificar se já existe
  const contatoExistente = await buscarPorTelefone(telefone, empresaId);

  if (contatoExistente) {
    // Atualizar apenas se houver dados novos
    const dadosAtualizar = {};

    if (dados.nome && dados.nome !== contatoExistente.nome) {
      dadosAtualizar.nome = dados.nome;
    }
    if (dados.email && dados.email !== contatoExistente.email) {
      dadosAtualizar.email = dados.email;
    }
    if (dados.empresa && dados.empresa !== contatoExistente.empresa) {
      dadosAtualizar.empresa = dados.empresa;
    }
    if (dados.cargo && dados.cargo !== contatoExistente.cargo) {
      dadosAtualizar.cargo = dados.cargo;
    }

    if (Object.keys(dadosAtualizar).length > 0) {
      return await atualizar(contatoExistente.id, empresaId, dadosAtualizar);
    }

    return contatoExistente;
  }

  // Criar novo
  return await criar(dados);
}

/**
 * Registrar última interação
 */
async function registrarInteracao(id, empresaId, tipo = 'mensagem') {
  const sql = `
    UPDATE contatos
    SET ultima_interacao_em = NOW(),
        tipo_ultima_interacao = $1,
        total_interacoes = total_interacoes + 1
    WHERE id = $2 AND empresa_id = $3
    RETURNING *
  `;

  const resultado = await query(sql, [tipo, id, empresaId]);
  return resultado.rows[0];
}

/**
 * Buscar tags disponíveis
 */
async function listarTags(empresaId) {
  const sql = `
    SELECT DISTINCT jsonb_array_elements_text(tags) as tag
    FROM contatos
    WHERE empresa_id = $1
    AND tags IS NOT NULL
    AND jsonb_array_length(tags) > 0
    ORDER BY tag
  `;

  const resultado = await query(sql, [empresaId]);
  return resultado.rows.map(row => row.tag);
}

/**
 * Exportar contatos (CSV format)
 */
async function exportar(empresaId, filtros = {}) {
  const contatos = await listar(empresaId, filtros);

  // Converter para formato simples para CSV
  return contatos.map(contato => ({
    id: contato.id,
    nome: contato.nome,
    telefone: contato.telefone,
    email: contato.email,
    empresa: contato.empresa,
    cargo: contato.cargo,
    tags: Array.isArray(contato.tags) ? contato.tags.join(', ') : '',
    criado_em: contato.criado_em,
    ultima_interacao: contato.ultima_interacao_em,
    total_interacoes: contato.total_interacoes
  }));
}

/**
 * Importar contatos em lote
 */
async function importarLote(empresaId, contatos) {
  if (!contatos || contatos.length === 0) {
    return [];
  }

  const contatosImportados = [];
  const erros = [];

  for (const contatoData of contatos) {
    try {
      // Validar telefone (campo obrigatório)
      if (!contatoData.telefone) {
        erros.push({ dados: contatoData, erro: 'Telefone é obrigatório' });
        continue;
      }

      // Criar ou atualizar
      const contato = await criarOuAtualizar({
        empresaId,
        ...contatoData
      });

      contatosImportados.push(contato);
    } catch (erro) {
      erros.push({ dados: contatoData, erro: erro.message });
    }
  }

  return {
    importados: contatosImportados,
    total_importados: contatosImportados.length,
    total_erros: erros.length,
    erros
  };
}

module.exports = {
  criar,
  buscarPorId,
  buscarPorTelefone,
  buscarPorEmail,
  listar,
  contar,
  atualizar,
  deletar,
  adicionarTag,
  removerTag,
  criarOuAtualizar,
  registrarInteracao,
  listarTags,
  exportar,
  importarLote
};
