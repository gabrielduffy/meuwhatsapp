const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function criarAdministrador() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Criar plano Enterprise (se não existir)
    await client.query(`
      INSERT INTO planos (nome, preco_mensal, limite_instancias, limite_mensagens_mes)
      VALUES ('Enterprise', 79700, 999, 999999)
      ON CONFLICT (nome) DO NOTHING
    `);

    const planoResult = await client.query(`
      SELECT id FROM planos WHERE nome = 'Enterprise'
    `);
    const planoId = planoResult.rows[0]?.id;

    // 2. Criar empresa
    const empresaResult = await client.query(`
      INSERT INTO empresas (
        nome,
        slug,
        documento,
        email,
        telefone,
        plano_id,
        status,
        saldo_creditos
      ) VALUES (
        'WhatsBenemax Admin',
        'whatsbenemax-admin',
        '00000000000000',
        'admin@whatsbenemax.com',
        '00000000000',
        $1,
        'ativo',
        999999
      )
      ON CONFLICT (slug) DO UPDATE
      SET nome = EXCLUDED.nome
      RETURNING id
    `, [planoId]);

    const empresaId = empresaResult.rows[0].id;
    console.log('✅ Empresa criada/atualizada:', empresaId);

    // 3. Hash da senha
    const senhaHash = await bcrypt.hash('412trocar', 10);

    // 4. Criar usuário administrador
    const usuarioResult = await client.query(`
      INSERT INTO usuarios (
        empresa_id,
        nome,
        email,
        senha_hash,
        funcao,
        ativo,
        email_verificado,
        avatar_url
      ) VALUES (
        $1,
        'Gabriel Duffy',
        'gabriel.duffy@hotmail.com',
        $2,
        'administrador',
        true,
        true,
        'https://ui-avatars.com/api/?name=Gabriel+Duffy&background=5B21B6&color=fff'
      )
      ON CONFLICT (email) DO UPDATE
      SET
        senha_hash = EXCLUDED.senha_hash,
        funcao = EXCLUDED.funcao,
        ativo = true,
        email_verificado = true
      RETURNING id, email, funcao
    `, [empresaId, senhaHash]);

    const usuario = usuarioResult.rows[0];

    await client.query('COMMIT');

    console.log('\n🎉 USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!\n');
    console.log('📧 Email: gabriel.duffy@hotmail.com');
    console.log('🔑 Senha: 412trocar');
    console.log('👤 Função:', usuario.funcao);
    console.log('🆔 ID:', usuario.id);
    console.log('\n✅ Você já pode fazer login no sistema!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

criarAdministrador()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
