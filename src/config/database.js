const { Pool } = require('pg');

// Conexão PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://whatsbenemax:@412Trocar@postgres:5432/whatsbenemax',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão ao iniciar
pool.on('connect', () => {
  console.log('✅ PostgreSQL - Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL - Erro inesperado:', err.message);
});

// Função helper para executar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️  Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
    }
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('Query:', text);
    throw error;
  }
};

// Testar conexão inicial
(async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado em:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Erro ao conectar PostgreSQL:', error.message);
  }
})();

module.exports = {
  pool,
  query
};
