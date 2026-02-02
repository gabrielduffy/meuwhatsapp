const { Pool } = require('pg');
const config = require('./env');

// Conexão PostgreSQL
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 15, // Reduzido para 15 (15 * 5 réplicas = 75 conexões, seguro para o Postgres padrão)
  idleTimeoutMillis: 5000, // Fecha conexões inativas em 5s
  connectionTimeoutMillis: 2000, // Aborta se não conseguir conexão em 2s
  maxUses: 7500, // Rotaciona a conexão após X usos para evitar memory leaks do driver
  ssl: config.databaseUrl && config.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

// Monitorar saúde do pool
setInterval(() => {
  const total = pool.totalCount;
  const idle = pool.idleCount;
  const active = total - idle;
  if (active > 10) {
    console.warn(`[DB-Health] Alerta: ${active}/${pool.options.max} conexões ativas na réplica.`);
  }
}, 60000);

// Testar conexão ao iniciar
pool.on('connect', () => {
  // console.log('✅ PostgreSQL - Nova conexão estabelecida'); // Comentado para poluir menos logs
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
