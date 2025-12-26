const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do banco (usar DATABASE_URL do Easypanel)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function criarAdministrador() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Criar empresa principal (se não existir)
    const empresaResult = await client.query(`
      INSERT INTO empresas (
        nome,
        cnpj,
        email,
        telefone,
        plano,
        status,
        limite_usuarios,
        limite_instancias,
        limite_mensagens_mes
      ) VALUES (
        'WhatsBenemax Admin',
        '00.000.000/0001-00',
        'admin@whatsbenemax.com',
        '(00) 00000-0000',
        'enterprise',
        'ativa',
        999,
        999,
        999999
      )
      ON CONFLICT (email) DO UPDATE
      SET nome = EXCLUDED.nome
      RETURNING id
    `);

    const empresaId = empresaResult.rows[0].id;
    console.log('✅ Empresa criada/atualizada:', empresaId);

    // 2. Hash da senha
    const senhaHash = await bcrypt.hash('412trocar', 10);

    // 3. Criar usuário administrador
    const usuarioResult = await client.query(`
      INSERT INTO usuarios (
        empresa_id,
        nome,
        email,
        senha_hash,
        funcao,
        ativo,
        avatar_url
      ) VALUES (
        $1,
        'Gabriel Duffy',
        'gabriel.duffy@hotmail.com',
        $2,
        'administrador',
        true,
        'https://ui-avatars.com/api/?name=Gabriel+Duffy&background=5B21B6&color=fff'
      )
      ON CONFLICT (email) DO UPDATE
      SET
        senha_hash = EXCLUDED.senha_hash,
        funcao = EXCLUDED.funcao,
        ativo = true
      RETURNING id, email, funcao
    `, [empresaId, senhaHash]);

    const usuario = usuarioResult.rows[0];

    await client.query('COMMIT');

    console.log('\n🎉 USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!\n');
    console.log('📧 Email:', usuario.email);
    console.log('🔑 Senha: 412trocar');
    console.log('👤 Função:', usuario.funcao);
    console.log('🆔 ID:', usuario.id);
    console.log('\n✅ Você já pode fazer login no sistema!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar administrador:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
criarAdministrador()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
