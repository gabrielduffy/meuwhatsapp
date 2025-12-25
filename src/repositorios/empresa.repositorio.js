const { query } = require('../config/database');

const empresaRepositorio = {
  /**
   * Criar empresa
   */
  async criar(dados) {
    const sql = `
      INSERT INTO empresas (
        nome, slug, documento, email, telefone, plano_id, afiliado_id,
        saldo_creditos, status, teste_termina_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const valores = [
      dados.nome,
      dados.slug,
      dados.documento || null,
      dados.email,
      dados.telefone || null,
      dados.plano_id || null,
      dados.afiliado_id || null,
      dados.saldo_creditos || 0,
      dados.status || 'ativo',
      dados.teste_termina_em || null
    ];

    const resultado = await query(sql, valores);
    return resultado.rows[0];
  },

  /**
   * Buscar por ID
   */
  async buscarPorId(id) {
    const sql = `
      SELECT e.*, p.nome as plano_nome, p.creditos_mensais
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE e.id = $1
    `;
    const resultado = await query(sql, [id]);
    return resultado.rows[0];
  },

  /**
   * Buscar por slug
   */
  async buscarPorSlug(slug) {
    const sql = 'SELECT * FROM empresas WHERE slug = $1';
    const resultado = await query(sql, [slug]);
    return resultado.rows[0];
  },

  /**
   * Listar empresas
   */
  async listar(opcoes = {}) {
    const {
      limite = 50,
      offset = 0,
      status = null,
      planoId = null,
      afiliadoId = null,
      busca = null
    } = opcoes;

    let sql = `
      SELECT e.*, p.nome as plano_nome
      FROM empresas e
      LEFT JOIN planos p ON e.plano_id = p.id
      WHERE 1=1
    `;
    const valores = [];
    let contador = 1;

    if (status) {
      sql += ` AND e.status = $${contador}`;
      valores.push(status);
      contador++;
    }

    if (planoId) {
      sql += ` AND e.plano_id = $${contador}`;
      valores.push(planoId);
      contador++;
    }

    if (afiliadoId) {
      sql += ` AND e.afiliado_id = $${contador}`;
      valores.push(afiliadoId);
      contador++;
    }

    if (busca) {
      sql += ` AND (e.nome ILIKE $${contador} OR e.email ILIKE $${contador} OR e.slug ILIKE $${contador})`;
      valores.push(`%${busca}%`);
      contador++;
    }

    sql += ` ORDER BY e.criado_em DESC LIMIT $${contador} OFFSET $${contador + 1}`;
    valores.push(limite, offset);

    const resultado = await query(sql, valores);
    return resultado.rows;
  },

  /**
   * Atualizar empresa
   */
  async atualizar(id, dados) {
    const campos = [];
    const valores = [];
    let contador = 1;

    const camposPermitidos = [
      'nome', 'documento', 'email', 'telefone', 'plano_id',
      'asaas_cliente_id', 'asaas_assinatura_id', 'saldo_creditos',
      'creditos_usados_mes', 'whitelabel_ativo', 'whitelabel_config',
      'status', 'teste_termina_em', 'assinatura_termina_em'
    ];

    for (const campo of camposPermitidos) {
      if (dados[campo] !== undefined) {
        if (campo.endsWith('_config')) {
          campos.push(`${campo} = $${contador}`);
          valores.push(JSON.stringify(dados[campo]));
        } else {
          campos.push(`${campo} = $${contador}`);
          valores.push(dados[campo]);
        }
        contador++;
      }
    }

    if (campos.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    valores.push(id);
    const sql = `
      UPDATE empresas
      SET ${campos.join(', ')}
      WHERE id = $${contador}
      RETURNING *
    `;

    const resultado = await query(sql, valores);
    return resultado.rows[0];
  },

  /**
   * Deletar empresa
   */
  async deletar(id) {
    const sql = 'DELETE FROM empresas WHERE id = $1 RETURNING id';
    const resultado = await query(sql, [id]);
    return resultado.rowCount > 0;
  },

  /**
   * Adicionar créditos
   */
  async adicionarCreditos(id, quantidade, descricao, tipo = 'compra') {
    const client = await query('BEGIN');

    try {
      // Buscar saldo atual
      const empresaAtual = await this.buscarPorId(id);
      const novoSaldo = empresaAtual.saldo_creditos + quantidade;

      // Atualizar saldo
      await query('UPDATE empresas SET saldo_creditos = $1 WHERE id = $2', [novoSaldo, id]);

      // Registrar transação
      await query(`
        INSERT INTO transacoes_credito (empresa_id, tipo, quantidade, saldo_apos, descricao)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, tipo, quantidade, novoSaldo, descricao]);

      await query('COMMIT');

      return novoSaldo;
    } catch (erro) {
      await query('ROLLBACK');
      throw erro;
    }
  },

  /**
   * Debitar créditos
   */
  async debitarCreditos(id, quantidade, descricao, tipoReferencia = null, idReferencia = null) {
    const client = await query('BEGIN');

    try {
      // Buscar saldo atual
      const empresaAtual = await this.buscarPorId(id);

      if (empresaAtual.saldo_creditos < quantidade) {
        throw new Error('Créditos insuficientes');
      }

      const novoSaldo = empresaAtual.saldo_creditos - quantidade;
      const creditosUsadosMes = empresaAtual.creditos_usados_mes + quantidade;

      // Atualizar saldo
      await query(`
        UPDATE empresas
        SET saldo_creditos = $1, creditos_usados_mes = $2
        WHERE id = $3
      `, [novoSaldo, creditosUsadosMes, id]);

      // Registrar transação
      await query(`
        INSERT INTO transacoes_credito (
          empresa_id, tipo, quantidade, saldo_apos, descricao,
          tipo_referencia, id_referencia
        )
        VALUES ($1, 'uso', $2, $3, $4, $5, $6)
      `, [id, -quantidade, novoSaldo, descricao, tipoReferencia, idReferencia]);

      await query('COMMIT');

      return novoSaldo;
    } catch (erro) {
      await query('ROLLBACK');
      throw erro;
    }
  },

  /**
   * Resetar créditos mensais
   */
  async resetarCreditosMensais(id) {
    const sql = 'UPDATE empresas SET creditos_usados_mes = 0 WHERE id = $1';
    await query(sql, [id]);
  },

  /**
   * Buscar empresas com créditos baixos
   */
  async buscarComCreditosBaixos(limite = 100) {
    const sql = `
      SELECT * FROM empresas
      WHERE saldo_creditos < 100 AND status = 'ativo'
      LIMIT $1
    `;
    const resultado = await query(sql, [limite]);
    return resultado.rows;
  },

  /**
   * Buscar empresas em teste expirando
   */
  async buscarTesteExpirando(dias = 3) {
    const sql = `
      SELECT * FROM empresas
      WHERE status = 'ativo'
      AND teste_termina_em IS NOT NULL
      AND teste_termina_em <= NOW() + INTERVAL '${dias} days'
      AND teste_termina_em > NOW()
    `;
    const resultado = await query(sql);
    return resultado.rows;
  },

  /**
   * Estatísticas da empresa
   */
  async obterEstatisticas(id) {
    // Você pode expandir isso com queries mais complexas
    const empresa = await this.buscarPorId(id);

    const estatisticas = {
      saldo_creditos: empresa.saldo_creditos,
      creditos_usados_mes: empresa.creditos_usados_mes,
      creditos_restantes_plano: empresa.creditos_mensais - empresa.creditos_usados_mes
    };

    return estatisticas;
  }
};

module.exports = empresaRepositorio;
