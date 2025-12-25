const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ========== CRUD BÁSICO ==========

// Criar ou atualizar contato
async function upsertContact(instanceName, contactData) {
  const {
    phoneNumber,
    name = null,
    tags = [],
    customFields = {},
    notes = null
  } = contactData;

  const result = await query(
    `INSERT INTO contacts
     (instance_name, phone_number, name, tags, custom_fields, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (instance_name, phone_number)
     DO UPDATE SET
       name = COALESCE(EXCLUDED.name, contacts.name),
       tags = EXCLUDED.tags,
       custom_fields = EXCLUDED.custom_fields,
       notes = COALESCE(EXCLUDED.notes, contacts.notes),
       updated_at = NOW()
     RETURNING *`,
    [
      instanceName,
      phoneNumber,
      name,
      JSON.stringify(tags),
      JSON.stringify(customFields),
      notes
    ]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Buscar contato por telefone
async function getContactByPhone(instanceName, phoneNumber) {
  // Tentar cache
  const cacheKey = `contact:${instanceName}:${phoneNumber}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM contacts WHERE instance_name = $1 AND phone_number = $2',
    [instanceName, phoneNumber]
  );

  const contact = result.rows[0] || null;

  // Cachear por 5 minutos
  if (contact) {
    await cache.set(cacheKey, contact, 300);
  }

  return contact;
}

// Listar contatos por instância
async function getContactsByInstance(instanceName, options = {}) {
  const { limit = 100, offset = 0, tag = null, isBlocked = null } = options;

  let queryText = 'SELECT * FROM contacts WHERE instance_name = $1';
  const params = [instanceName];
  let paramIndex = 2;

  if (tag) {
    queryText += ` AND tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify([tag]));
    paramIndex++;
  }

  if (isBlocked !== null) {
    queryText += ` AND is_blocked = $${paramIndex}`;
    params.push(isBlocked);
    paramIndex++;
  }

  queryText += ` ORDER BY last_message_at DESC NULLS LAST, created_at DESC`;
  queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
}

// Atualizar nome do contato
async function updateContactName(instanceName, phoneNumber, name) {
  const result = await query(
    `UPDATE contacts
     SET name = $3, updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, name]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Adicionar tags ao contato
async function addContactTags(instanceName, phoneNumber, newTags) {
  const result = await query(
    `UPDATE contacts
     SET tags = tags || $3::jsonb,
         updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, JSON.stringify(newTags)]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Remover tags do contato
async function removeContactTags(instanceName, phoneNumber, tagsToRemove) {
  // Primeiro buscar as tags atuais
  const contact = await getContactByPhone(instanceName, phoneNumber);
  if (!contact) return null;

  const currentTags = contact.tags || [];
  const newTags = currentTags.filter(tag => !tagsToRemove.includes(tag));

  const result = await query(
    `UPDATE contacts
     SET tags = $3::jsonb,
         updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, JSON.stringify(newTags)]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Atualizar campos personalizados
async function updateContactCustomFields(instanceName, phoneNumber, customFields) {
  const result = await query(
    `UPDATE contacts
     SET custom_fields = custom_fields || $3::jsonb,
         updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, JSON.stringify(customFields)]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Atualizar notas do contato
async function updateContactNotes(instanceName, phoneNumber, notes) {
  const result = await query(
    `UPDATE contacts
     SET notes = $3, updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, notes]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Bloquear/desbloquear contato
async function toggleContactBlock(instanceName, phoneNumber, isBlocked) {
  const result = await query(
    `UPDATE contacts
     SET is_blocked = $3, updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber, isBlocked]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Registrar mensagem (atualizar contadores)
async function recordContactMessage(instanceName, phoneNumber) {
  const result = await query(
    `UPDATE contacts
     SET message_count = message_count + 1,
         last_message_at = NOW(),
         updated_at = NOW()
     WHERE instance_name = $1 AND phone_number = $2
     RETURNING *`,
    [instanceName, phoneNumber]
  );

  // Se o contato não existe, criar
  if (result.rows.length === 0) {
    return await upsertContact(instanceName, { phoneNumber });
  }

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// Deletar contato
async function deleteContact(instanceName, phoneNumber) {
  const result = await query(
    'DELETE FROM contacts WHERE instance_name = $1 AND phone_number = $2 RETURNING *',
    [instanceName, phoneNumber]
  );

  // Invalidar cache
  await cache.del(`contact:${instanceName}:${phoneNumber}`);
  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rows[0];
}

// ========== CONSULTAS ESPECIALIZADAS ==========

// Buscar contatos por tag
async function getContactsByTag(instanceName, tag) {
  const result = await query(
    `SELECT * FROM contacts
     WHERE instance_name = $1
       AND tags @> $2::jsonb
     ORDER BY last_message_at DESC NULLS LAST`,
    [instanceName, JSON.stringify([tag])]
  );

  return result.rows;
}

// Buscar contatos bloqueados
async function getBlockedContacts(instanceName) {
  const result = await query(
    `SELECT * FROM contacts
     WHERE instance_name = $1 AND is_blocked = true
     ORDER BY updated_at DESC`,
    [instanceName]
  );

  return result.rows;
}

// Buscar por nome (busca parcial)
async function searchContactsByName(instanceName, searchTerm) {
  const result = await query(
    `SELECT * FROM contacts
     WHERE instance_name = $1
       AND name ILIKE $2
     ORDER BY name ASC`,
    [instanceName, `%${searchTerm}%`]
  );

  return result.rows;
}

// Obter contatos mais ativos
async function getTopActiveContacts(instanceName, limit = 10) {
  const result = await query(
    `SELECT * FROM contacts
     WHERE instance_name = $1
       AND message_count > 0
     ORDER BY message_count DESC, last_message_at DESC
     LIMIT $2`,
    [instanceName, limit]
  );

  return result.rows;
}

// Contar contatos
async function countContacts(instanceName, options = {}) {
  const { tag = null, isBlocked = null } = options;

  let queryText = 'SELECT COUNT(*) FROM contacts WHERE instance_name = $1';
  const params = [instanceName];
  let paramIndex = 2;

  if (tag) {
    queryText += ` AND tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify([tag]));
    paramIndex++;
  }

  if (isBlocked !== null) {
    queryText += ` AND is_blocked = $${paramIndex}`;
    params.push(isBlocked);
    paramIndex++;
  }

  const result = await query(queryText, params);
  return parseInt(result.rows[0].count);
}

// Listar todas as tags usadas
async function getAllTags(instanceName) {
  const result = await query(
    `SELECT DISTINCT jsonb_array_elements_text(tags) as tag
     FROM contacts
     WHERE instance_name = $1
       AND tags IS NOT NULL
       AND jsonb_array_length(tags) > 0
     ORDER BY tag`,
    [instanceName]
  );

  return result.rows.map(row => row.tag);
}

// Exportar contatos
async function exportContacts(instanceName) {
  const result = await query(
    `SELECT
       phone_number,
       name,
       tags,
       custom_fields,
       notes,
       message_count,
       last_message_at,
       is_blocked,
       created_at
     FROM contacts
     WHERE instance_name = $1
     ORDER BY name ASC NULLS LAST, phone_number ASC`,
    [instanceName]
  );

  return result.rows;
}

// Limpar contatos sem atividade
async function cleanInactiveContacts(instanceName, daysInactive = 180) {
  const result = await query(
    `DELETE FROM contacts
     WHERE instance_name = $1
       AND (last_message_at IS NULL OR last_message_at < NOW() - INTERVAL '${daysInactive} days')
       AND message_count = 0
     RETURNING COUNT(*)`
  );

  await cache.invalidatePattern(`contacts:${instanceName}:*`);

  return result.rowCount;
}

module.exports = {
  upsertContact,
  getContactByPhone,
  getContactsByInstance,
  updateContactName,
  addContactTags,
  removeContactTags,
  updateContactCustomFields,
  updateContactNotes,
  toggleContactBlock,
  recordContactMessage,
  deleteContact,
  getContactsByTag,
  getBlockedContacts,
  searchContactsByName,
  getTopActiveContacts,
  countContacts,
  getAllTags,
  exportContacts,
  cleanInactiveContacts
};
