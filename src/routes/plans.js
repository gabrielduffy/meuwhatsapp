const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { autenticarMiddleware } = require('../middlewares/autenticacao');
const { garantirMultiTenant } = require('../middlewares/empresa');

// Todas as rotas requerem autenticação e multi-tenant
router.use(autenticarMiddleware);
router.use(garantirMultiTenant);

/**
 * GET /api/planos
 * Listar todos os planos disponíveis
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM planos
      WHERE ativo = true
      ORDER BY preco_mensal ASC
    `;

    const resultado = await query(sql);

    res.json({
      planos: resultado.rows
    });
  } catch (erro) {
    console.error('[Planos] Erro ao listar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/planos/:id
 * Buscar plano por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const sql = 'SELECT * FROM planos WHERE id = $1';
    const resultado = await query(sql, [req.params.id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Plano não encontrado' });
    }

    res.json({
      plano: resultado.rows[0]
    });
  } catch (erro) {
    console.error('[Planos] Erro ao buscar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/planos/comparar
 * Comparar planos
 */
router.get('/comparar', async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        nome,
        preco_mensal,
        max_usuarios,
        max_instancias,
        max_contatos,
        funcionalidades,
        descricao
      FROM planos
      WHERE ativo = true
      ORDER BY preco_mensal ASC
    `;

    const resultado = await query(sql);

    // Formatar para comparação
    const comparacao = {
      caracteristicas: [
        {
          nome: 'Usuários',
          campo: 'max_usuarios',
          tipo: 'numero'
        },
        {
          nome: 'Instâncias WhatsApp',
          campo: 'max_instancias',
          tipo: 'numero'
        },
        {
          nome: 'Contatos',
          campo: 'max_contatos',
          tipo: 'numero'
        },
        {
          nome: 'Agente IA',
          campo: 'agente_ia',
          tipo: 'boolean'
        },
        {
          nome: 'Prospecção',
          campo: 'prospeccao',
          tipo: 'boolean'
        },
        {
          nome: 'Chat Interno',
          campo: 'chat',
          tipo: 'boolean'
        },
        {
          nome: 'Integrações',
          campo: 'integracoes',
          tipo: 'boolean'
        },
        {
          nome: 'White-label',
          campo: 'whitelabel',
          tipo: 'boolean'
        },
        {
          nome: 'Suporte',
          campo: 'suporte_prioritario',
          tipo: 'text'
        }
      ],
      planos: resultado.rows.map(plano => ({
        id: plano.id,
        nome: plano.nome,
        preco_mensal: plano.preco_mensal,
        descricao: plano.descricao,
        valores: {
          max_usuarios: plano.max_usuarios,
          max_instancias: plano.max_instancias,
          max_contatos: plano.max_contatos,
          agente_ia: plano.funcionalidades?.agente_ia || false,
          prospeccao: plano.funcionalidades?.prospeccao || false,
          chat: plano.funcionalidades?.chat || false,
          integracoes: plano.funcionalidades?.integracoes || false,
          whitelabel: plano.funcionalidades?.whitelabel || false,
          suporte_prioritario: plano.funcionalidades?.suporte_prioritario ? 'Prioritário' : 'Email'
        }
      }))
    };

    res.json(comparacao);
  } catch (erro) {
    console.error('[Planos] Erro ao comparar:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * POST /api/planos/alterar
 * Solicitar alteração de plano
 */
router.post('/alterar', async (req, res) => {
  try {
    const { plano_id } = req.body;

    if (!plano_id) {
      return res.status(400).json({ erro: 'ID do plano é obrigatório' });
    }

    // Buscar plano desejado
    const sqlPlano = 'SELECT * FROM planos WHERE id = $1 AND ativo = true';
    const resultadoPlano = await query(sqlPlano, [plano_id]);

    if (resultadoPlano.rows.length === 0) {
      return res.status(404).json({ erro: 'Plano não encontrado' });
    }

    const novoPlano = resultadoPlano.rows[0];

    // Buscar empresa
    const sqlEmpresa = 'SELECT * FROM empresas WHERE id = $1';
    const resultadoEmpresa = await query(sqlEmpresa, [req.empresaId]);
    const empresa = resultadoEmpresa.rows[0];

    // Verificar se já está neste plano
    if (empresa.plano_id === plano_id) {
      return res.status(400).json({ erro: 'Empresa já está neste plano' });
    }

    // Verificar se é upgrade ou downgrade
    const planoAtual = await query('SELECT * FROM planos WHERE id = $1', [empresa.plano_id]);
    const isUpgrade = novoPlano.preco_mensal > (planoAtual.rows[0]?.preco_mensal || 0);

    // Criar notificação para admin processar
    const sqlNotificacao = `
      INSERT INTO notificacoes (
        empresa_id,
        tipo,
        titulo,
        mensagem,
        dados
      ) VALUES ($1, 'alteracao_plano', $2, $3, $4)
    `;

    await query(sqlNotificacao, [
      req.empresaId,
      `Solicitação de ${isUpgrade ? 'upgrade' : 'downgrade'} de plano`,
      `Plano solicitado: ${novoPlano.nome} (R$ ${novoPlano.preco_mensal}/mês)`,
      JSON.stringify({
        plano_atual_id: empresa.plano_id,
        plano_novo_id: plano_id,
        tipo: isUpgrade ? 'upgrade' : 'downgrade'
      })
    ]);

    res.json({
      mensagem: 'Solicitação de alteração de plano enviada',
      plano_solicitado: {
        id: novoPlano.id,
        nome: novoPlano.nome,
        preco_mensal: novoPlano.preco_mensal
      },
      tipo: isUpgrade ? 'upgrade' : 'downgrade',
      proximos_passos: isUpgrade
        ? 'Você será redirecionado para o pagamento'
        : 'Nossa equipe entrará em contato para processar o downgrade'
    });
  } catch (erro) {
    console.error('[Planos] Erro ao alterar plano:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

/**
 * GET /api/planos/meu-plano
 * Obter detalhes do plano atual da empresa
 */
router.get('/meu-plano', async (req, res) => {
  try {
    const sql = `
      SELECT e.*, p.*
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.id = $1
    `;

    const resultado = await query(sql, [req.empresaId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Empresa não encontrada' });
    }

    const dados = resultado.rows[0];

    res.json({
      plano: {
        id: dados.plano_id,
        nome: dados.nome,
        preco_mensal: dados.preco_mensal,
        descricao: dados.descricao,
        max_usuarios: dados.max_usuarios,
        max_instancias: dados.max_instancias,
        max_contatos: dados.max_contatos,
        funcionalidades: dados.funcionalidades
      },
      status: {
        teste: dados.status === 'teste',
        teste_termina_em: dados.teste_termina_em,
        ativo: dados.status === 'ativo',
        whitelabel_ativo: dados.whitelabel_ativo
      }
    });
  } catch (erro) {
    console.error('[Planos] Erro ao buscar plano atual:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;
