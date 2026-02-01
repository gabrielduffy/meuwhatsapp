const { Pool } = require('pg');
const config = require('./env');

// Conexão PostgreSQL
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 50, // Aumentado para suportar mais instâncias simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.databaseUrl && config.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false
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
