/**
 * Configuração e validação de variáveis de ambiente
 * CRÍTICO: Garante que todas as variáveis obrigatórias estão definidas
 */

require('dotenv').config();

// Variáveis de ambiente obrigatórias
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL'
];

// Validar que todas as variáveis obrigatórias existem
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não definidas:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nCrie um arquivo .env com essas variáveis antes de iniciar o servidor.');
  process.exit(1);
}

// Configuração centralizada (NUNCA usar defaults para secrets)
const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Redis
  redisUrl: process.env.REDIS_URL,

  // Auth
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // API
  apiKey: process.env.API_KEY, // Pode ser undefined se não usado

  // Uploads
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760, // 10MB
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // Email
  emailHost: process.env.EMAIL_HOST,
  emailPort: parseInt(process.env.EMAIL_PORT, 10) || 587,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM || 'noreply@whatsbenemax.com',

  // WhatsApp
  whatsappSessionDir: process.env.WHATSAPP_SESSION_DIR || './sessions',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  // Logs
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || './logs',

  // Feature Flags
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false', // Habilitado por padrão exceto se explicitamente desativado
  enableMetrics: process.env.ENABLE_METRICS === 'true',
};

// Validações adicionais
if (config.nodeEnv === 'production') {
  if (!config.emailHost || !config.emailUser || !config.emailPassword) {
    console.warn('⚠️  Configurações de email não definidas. Funcionalidades de email não funcionarão.');
  }
}

module.exports = config;
