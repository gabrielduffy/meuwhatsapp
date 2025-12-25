const express = require('express');
const router = express.Router();
const empresaRepo = require('../repositorios/empresa.repositorio');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant } = require('../middlewares/empresa');
const { verificarPermissao } = require('../middlewares/permissoes');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * GET /api/empresa
 * Obter dados da empresa
 */
router.get('/', async (req, res) => {
  try {
    const empresa = await empresaRepo.buscarPorId(req.empresaId);

    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }

    res.json({ empresa });
  } catch (erro) {
    console.error('[Empresa] Erro ao buscar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/empresa
 * Atualizar dados da empresa
 */
router.put('/', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const dadosPermitidos = {};

    // Campos que podem ser atualizados
    if (req.body.nome) dadosPermitidos.nome = req.body.nome;
    if (req.body.telefone) dadosPermitidos.telefone = req.body.telefone;
    if (req.body.email) dadosPermitidos.email = req.body.email;
    if (req.body.documento) dadosPermitidos.documento = req.body.documento;
    if (req.body.endereco) dadosPermitidos.endereco = req.body.endereco;
    if (req.body.cidade) dadosPermitidos.cidade = req.body.cidade;
    if (req.body.estado) dadosPermitidos.estado = req.body.estado;
    if (req.body.cep) dadosPermitidos.cep = req.body.cep;
    if (req.body.logo_url) dadosPermitidos.logo_url = req.body.logo_url;

    const empresaAtualizada = await empresaRepo.atualizar(req.empresaId, dadosPermitidos);

    res.json({
      mensagem: 'Empresa atualizada com sucesso',
      empresa: empresaAtualizada
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao atualizar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/empresa/creditos
 * Obter saldo de créditos
 */
router.get('/creditos', async (req, res) => {
  try {
    const empresa = await empresaRepo.buscarPorId(req.empresaId);

    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }

    res.json({
      saldo_creditos: empresa.saldo_creditos,
      creditos_usados_mes: empresa.creditos_usados_mes,
      creditos_resetam_em: empresa.creditos_resetam_em
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao buscar créditos:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/empresa/transacoes
 * Listar transações de créditos
 */
router.get('/transacoes', async (req, res) => {
  try {
    const { query } = require('../config/database');

    const limite = parseInt(req.query.limite) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const sql = `
      SELECT * FROM transacoes_credito
      WHERE empresa_id = $1
      ORDER BY criado_em DESC
      LIMIT $2 OFFSET $3
    `;

    const resultado = await query(sql, [req.empresaId, limite, offset]);

    res.json({
      transacoes: resultado.rows,
      total: resultado.rows.length
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao listar transações:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/empresa/plano
 * Obter informações do plano atual
 */
router.get('/plano', async (req, res) => {
  try {
    const { query } = require('../config/database');

    const sql = `
      SELECT e.*, p.*
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.id = $1
    `;

    const resultado = await query(sql, [req.empresaId]);
    const dados = resultado.rows[0];

    if (!dados) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }

    res.json({
      plano_atual: {
        id: dados.plano_id,
        nome: dados.nome,
        preco_mensal: dados.preco_mensal,
        max_usuarios: dados.max_usuarios,
        max_instancias: dados.max_instancias,
        max_contatos: dados.max_contatos,
        funcionalidades: dados.funcionalidades
      },
      empresa: {
        id: dados.id,
        nome: dados.nome,
        status: dados.status,
        teste_termina_em: dados.teste_termina_em,
        whitelabel_ativo: dados.whitelabel_ativo
      }
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao buscar plano:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/empresa/uso
 * Obter estatísticas de uso
 */
router.get('/uso', async (req, res) => {
  try {
    const { query } = require('../config/database');

    // Contar usuários
    const usuarios = await query(
      'SELECT COUNT(*) FROM usuarios WHERE empresa_id = $1',
      [req.empresaId]
    );

    // Contar instâncias
    const instancias = await query(
      'SELECT COUNT(*) FROM instancias_whatsapp WHERE empresa_id = $1',
      [req.empresaId]
    );

    // Contar contatos
    const contatos = await query(
      'SELECT COUNT(*) FROM contatos WHERE empresa_id = $1',
      [req.empresaId]
    );

    // Buscar empresa com limites do plano
    const empresa = await empresaRepo.buscarPorId(req.empresaId);

    res.json({
      uso: {
        usuarios: parseInt(usuarios.rows[0].count),
        instancias: parseInt(instancias.rows[0].count),
        contatos: parseInt(contatos.rows[0].count),
        creditos_usados_mes: empresa.creditos_usados_mes
      },
      limites: {
        max_usuarios: empresa.max_usuarios,
        max_instancias: empresa.max_instancias,
        max_contatos: empresa.max_contatos
      },
      percentual: {
        usuarios: empresa.max_usuarios > 0 ? ((parseInt(usuarios.rows[0].count) / empresa.max_usuarios) * 100).toFixed(2) : 0,
        instancias: empresa.max_instancias > 0 ? ((parseInt(instancias.rows[0].count) / empresa.max_instancias) * 100).toFixed(2) : 0,
        contatos: empresa.max_contatos > 0 ? ((parseInt(contatos.rows[0].count) / empresa.max_contatos) * 100).toFixed(2) : 0
      }
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao buscar uso:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * PUT /api/empresa/whitelabel
 * Atualizar configurações de white-label
 */
router.put('/whitelabel', verificarPermissao(['empresa', 'administrador']), async (req, res) => {
  try {
    const empresa = await empresaRepo.buscarPorId(req.empresaId);

    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }

    // Verificar se plano permite white-label
    if (!empresa.whitelabel_ativo) {
      return res.status(403).json({
        erro: 'White-label não está disponível no seu plano',
        mensagem: 'Faça upgrade para ativar esta funcionalidade'
      });
    }

    const dadosWhitelabel = {};

    if (req.body.logo_url) dadosWhitelabel.logo_url = req.body.logo_url;
    if (req.body.cor_primaria) dadosWhitelabel.cor_primaria = req.body.cor_primaria;
    if (req.body.cor_secundaria) dadosWhitelabel.cor_secundaria = req.body.cor_secundaria;
    if (req.body.dominio_customizado) dadosWhitelabel.dominio_customizado = req.body.dominio_customizado;

    const empresaAtualizada = await empresaRepo.atualizar(req.empresaId, dadosWhitelabel);

    res.json({
      mensagem: 'Configurações de white-label atualizadas',
      empresa: empresaAtualizada
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao atualizar white-label:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/empresa/notificacoes
 * Listar notificações da empresa
 */
router.get('/notificacoes', async (req, res) => {
  try {
    const { query } = require('../config/database');

    const lida = req.query.lida === 'true' ? true : req.query.lida === 'false' ? false : undefined;
    const limite = parseInt(req.query.limite) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let sql = `
      SELECT * FROM notificacoes
      WHERE empresa_id = $1
    `;

    const params = [req.empresaId];
    let paramIndex = 2;

    if (lida !== undefined) {
      sql += ` AND lida = $${paramIndex}`;
      params.push(lida);
      paramIndex++;
    }

    sql += ` ORDER BY criado_em DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limite, offset);

    const resultado = await query(sql, params);

    res.json({
      notificacoes: resultado.rows,
      total: resultado.rows.length
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao listar notificações:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/empresa/notificacoes/:id/marcar-lida
 * Marcar notificação como lida
 */
router.post('/notificacoes/:id/marcar-lida', async (req, res) => {
  try {
    const { query } = require('../config/database');

    const sql = `
      UPDATE notificacoes
      SET lida = true, lida_em = NOW()
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `;

    const resultado = await query(sql, [req.params.id, req.empresaId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Notificação não encontrada' });
    }

    res.json({
      mensagem: 'Notificação marcada como lida',
      notificacao: resultado.rows[0]
    });
  } catch (erro) {
    console.error('[Empresa] Erro ao marcar notificação:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
