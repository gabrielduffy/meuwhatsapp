const express = require('express');
const router = express.Router();
const contatoRepo = require('../repositorios/contato.repositorio');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant, verificarLimite } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * POST /api/contatos
 * Criar contato
 */
router.post('/', verificarLimite('contatos'), async (req, res) => {
  try {
    const { nome, telefone, email, empresa, cargo, tags, campos_customizados, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
    }

    // Verificar se já existe contato com este telefone
    const contatoExistente = await contatoRepo.buscarPorTelefone(telefone, req.empresaId);

    if (contatoExistente) {
      return res.status(400).json({
        erro: 'Já existe um contato com este telefone',
        contato: contatoExistente
      });
    }

    const contato = await contatoRepo.criar({
      empresaId: req.empresaId,
      nome,
      telefone,
      email,
      empresa,
      cargo,
      tags: tags || [],
      campos_customizados: campos_customizados || {},
      observacoes
    });

    res.status(201).json({
      mensagem: 'Contato criado com sucesso',
      contato
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao criar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/contatos
 * Listar contatos
 */
router.get('/', async (req, res) => {
  try {
    const filtros = {
      busca: req.query.busca,
      tag: req.query.tag,
      ordenarPor: req.query.ordenarPor,
      direcao: req.query.direcao,
      limite: parseInt(req.query.limite) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const contatos = await contatoRepo.listar(req.empresaId, filtros);
    const total = await contatoRepo.contar(req.empresaId, filtros);

    res.json({
      contatos,
      total,
      limite: filtros.limite,
      offset: filtros.offset
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/contatos/:id
 * Buscar contato por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const contato = await contatoRepo.buscarPorId(req.params.id, req.empresaId);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({ contato });
  } catch (erro) {
    console.error('[Contatos] Erro ao buscar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/contatos/telefone/:telefone
 * Buscar contato por telefone
 */
router.get('/telefone/:telefone', async (req, res) => {
  try {
    const contato = await contatoRepo.buscarPorTelefone(req.params.telefone, req.empresaId);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({ contato });
  } catch (erro) {
    console.error('[Contatos] Erro ao buscar por telefone:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/contatos/:id
 * Atualizar contato
 */
router.put('/:id', async (req, res) => {
  try {
    const contato = await contatoRepo.atualizar(req.params.id, req.empresaId, req.body);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({
      mensagem: 'Contato atualizado com sucesso',
      contato
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/contatos/:id
 * Deletar contato
 */
router.delete('/:id', async (req, res) => {
  try {
    const contato = await contatoRepo.deletar(req.params.id, req.empresaId);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({ mensagem: 'Contato deletado com sucesso' });
  } catch (erro) {
    console.error('[Contatos] Erro ao deletar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/contatos/:id/tags
 * Adicionar tag
 */
router.post('/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ erro: 'Tag é obrigatória' });
    }

    const contato = await contatoRepo.adicionarTag(req.params.id, req.empresaId, tag);

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({
      mensagem: 'Tag adicionada com sucesso',
      contato
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao adicionar tag:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * DELETE /api/contatos/:id/tags/:tag
 * Remover tag
 */
router.delete('/:id/tags/:tag', async (req, res) => {
  try {
    const contato = await contatoRepo.removerTag(
      req.params.id,
      req.empresaId,
      req.params.tag
    );

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({
      mensagem: 'Tag removida com sucesso',
      contato
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao remover tag:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/contatos/tags/todas
 * Listar todas as tags disponíveis
 */
router.get('/tags/todas', async (req, res) => {
  try {
    const tags = await contatoRepo.listarTags(req.empresaId);

    res.json({ tags });
  } catch (erro) {
    console.error('[Contatos] Erro ao listar tags:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/contatos/importar
 * Importar contatos em lote
 */
router.post('/importar', async (req, res) => {
  try {
    const { contatos } = req.body;

    if (!contatos || !Array.isArray(contatos) || contatos.length === 0) {
      return res.status(400).json({ erro: 'Lista de contatos é obrigatória' });
    }

    const resultado = await contatoRepo.importarLote(req.empresaId, contatos);

    res.json({
      mensagem: 'Importação concluída',
      ...resultado
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao importar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/contatos/exportar
 * Exportar contatos
 */
router.get('/exportar', async (req, res) => {
  try {
    const filtros = {
      busca: req.query.busca,
      tag: req.query.tag
    };

    const contatos = await contatoRepo.exportar(req.empresaId, filtros);

    res.json({
      contatos,
      total: contatos.length
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao exportar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/contatos/:id/interacao
 * Registrar interação
 */
router.post('/:id/interacao', async (req, res) => {
  try {
    const { tipo } = req.body;

    const contato = await contatoRepo.registrarInteracao(
      req.params.id,
      req.empresaId,
      tipo || 'mensagem'
    );

    if (!contato) {
      return res.status(404).json({ erro: 'Contato não encontrado' });
    }

    res.json({
      mensagem: 'Interação registrada',
      contato
    });
  } catch (erro) {
    console.error('[Contatos] Erro ao registrar interação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
