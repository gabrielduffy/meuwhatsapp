const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { getInstance } = require('../services/whatsapp');
const fs = require('fs');
const path = require('path');

// Diretório para contatos
const DATA_DIR = process.env.DATA_DIR || './data';
const CONTACTS_DIR = path.join(DATA_DIR, 'contacts');

// Garantir que o diretório existe
if (!fs.existsSync(CONTACTS_DIR)) {
  fs.mkdirSync(CONTACTS_DIR, { recursive: true });
}

// Listar contatos de uma instância
router.get('/list/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);

    let contacts = [];
    if (fs.existsSync(contactsFile)) {
      const data = fs.readFileSync(contactsFile, 'utf8');
      contacts = JSON.parse(data);
    }

    res.json({
      success: true,
      instanceName,
      total: contacts.length,
      contacts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar ou atualizar contato
router.post('/save/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { number, name, tags, customFields, notes } = req.body;

    if (!number || !name) {
      return res.status(400).json({ error: 'Número e nome são obrigatórios' });
    }

    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);
    let contacts = [];

    if (fs.existsSync(contactsFile)) {
      const data = fs.readFileSync(contactsFile, 'utf8');
      contacts = JSON.parse(data);
    }

    // Verificar se contato já existe
    const existingIndex = contacts.findIndex(c => c.number === number);

    const contact = {
      number,
      name,
      tags: tags || [],
      customFields: customFields || {},
      notes: notes || '',
      addedAt: existingIndex >= 0 ? contacts[existingIndex].addedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      contacts[existingIndex] = contact;
    } else {
      contacts.push(contact);
    }

    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));

    res.json({
      success: true,
      message: existingIndex >= 0 ? 'Contato atualizado' : 'Contato adicionado',
      contact
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar contato
router.delete('/:instanceName/:number', (req, res) => {
  try {
    const { instanceName, number } = req.params;
    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);

    if (!fs.existsSync(contactsFile)) {
      return res.status(404).json({ error: 'Nenhum contato encontrado' });
    }

    const data = fs.readFileSync(contactsFile, 'utf8');
    let contacts = JSON.parse(data);

    const initialLength = contacts.length;
    contacts = contacts.filter(c => c.number !== number);

    if (contacts.length === initialLength) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));

    res.json({
      success: true,
      message: 'Contato deletado'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Importar contatos (CSV/Excel)
router.post('/import/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { data, format } = req.body; // data pode ser array ou string CSV

    if (!data) {
      return res.status(400).json({ error: 'Dados não fornecidos' });
    }

    let contacts = [];

    if (format === 'json' && Array.isArray(data)) {
      // Dados já vêm em formato array
      contacts = data.map(item => ({
        number: item.number || item.numero,
        name: item.name || item.nome,
        tags: item.tags ? (typeof item.tags === 'string' ? item.tags.split(',') : item.tags) : [],
        customFields: item.customFields || {},
        notes: item.notes || item.notas || '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } else if (format === 'csv' && typeof data === 'string') {
      // Parse CSV
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const contact = {
          number: values[0],
          name: values[1],
          tags: values[2] ? values[2].split(';') : [],
          customFields: {},
          notes: values[3] || '',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Campos adicionais como customFields
        for (let j = 4; j < headers.length; j++) {
          if (headers[j] && values[j]) {
            contact.customFields[headers[j]] = values[j];
          }
        }

        contacts.push(contact);
      }
    }

    // Validar contatos
    const validContacts = contacts.filter(c => c.number && c.name);

    if (validContacts.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato válido encontrado' });
    }

    // Carregar contatos existentes
    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);
    let existingContacts = [];

    if (fs.existsSync(contactsFile)) {
      const fileData = fs.readFileSync(contactsFile, 'utf8');
      existingContacts = JSON.parse(fileData);
    }

    // Mesclar (evitar duplicados)
    const existingNumbers = new Set(existingContacts.map(c => c.number));
    const newContacts = validContacts.filter(c => !existingNumbers.has(c.number));

    const allContacts = [...existingContacts, ...newContacts];
    fs.writeFileSync(contactsFile, JSON.stringify(allContacts, null, 2));

    res.json({
      success: true,
      message: `${newContacts.length} novos contatos importados`,
      imported: newContacts.length,
      skipped: validContacts.length - newContacts.length,
      total: allContacts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar contatos (CSV/Excel)
router.get('/export/:instanceName', (req, res) => {
  try {
    const { instanceName } = req.params;
    const { format = 'csv' } = req.query;

    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);

    if (!fs.existsSync(contactsFile)) {
      return res.status(404).json({ error: 'Nenhum contato encontrado' });
    }

    const data = fs.readFileSync(contactsFile, 'utf8');
    const contacts = JSON.parse(data);

    if (format === 'csv') {
      // Gerar CSV
      const lines = [];
      lines.push('numero,nome,tags,notas');

      contacts.forEach(contact => {
        const tags = Array.isArray(contact.tags) ? contact.tags.join(';') : '';
        lines.push(`${contact.number},${contact.name},"${tags}","${contact.notes || ''}"`);
      });

      const csv = lines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${instanceName}-${Date.now()}.csv"`);
      res.send(csv);
    } else if (format === 'xlsx') {
      // Gerar Excel
      const worksheet = XLSX.utils.json_to_sheet(contacts.map(c => ({
        numero: c.number,
        nome: c.name,
        tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
        notas: c.notes || '',
        adicionado_em: c.addedAt
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${instanceName}-${Date.now()}.xlsx"`);
      res.send(buffer);
    } else {
      // JSON
      res.json({
        success: true,
        contacts
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sincronizar contatos do WhatsApp
router.post('/sync/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const instance = getInstance(instanceName);

    if (!instance || !instance.isConnected) {
      return res.status(400).json({ error: 'Instância não conectada' });
    }

    // Obter contatos do WhatsApp via Baileys
    const store = instance.socket.store;
    const whatsappContacts = Object.values(store?.contacts || {});

    // Converter para formato padrão
    const contacts = whatsappContacts
      .filter(c => c.id && c.name && !c.id.includes('@g.us'))
      .map(c => ({
        number: c.id.replace('@s.whatsapp.net', ''),
        name: c.name || c.notify || 'Sem nome',
        tags: [],
        customFields: {},
        notes: '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

    // Salvar
    const contactsFile = path.join(CONTACTS_DIR, `${instanceName}.json`);
    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));

    res.json({
      success: true,
      message: `${contacts.length} contatos sincronizados`,
      total: contacts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
