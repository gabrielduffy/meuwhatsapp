const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function criarAdministrador() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Pegar qualquer plano existente (ou deixar NULL)
    const planoResult = await client.query(`SELECT id FROM planos LIMIT 1`);
    const planoId = planoResult.rows[0]?.id || null;

    // 2. Criar empresa simples
    const empresaResult = await client.query(`
      INSERT INTO empresas (
        nome,
        slug,
        email,
        plano_id,
        status,
        saldo_creditos
      ) VALUES (
        'Admin Company',
        'admin-company',
        'admin@company.com',
        $1,
        'ativo',
        999999
      )
      ON CONFLICT (slug) DO UPDATE
      SET nome = EXCLUDED.nome
      RETURNING id
    `, [planoId]);

    const empresaId = empresaResult.rows[0].id;
    console.log('✅ Empresa criada:', empresaId);

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
        email_verificado
      ) VALUES (
        $1,
        'Gabriel Duffy',
        'gabriel.duffy@hotmail.com',
        $2,
        'administrador',
        true,
        true
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

    console.log('\n🎉 SUCESSO!\n');
    console.log('📧 Email: gabriel.duffy@hotmail.com');
    console.log('🔑 Senha: 412trocar');
    console.log('👤 Função:', usuario.funcao);
    console.log('\n✅ Faça login agora!\n');

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
