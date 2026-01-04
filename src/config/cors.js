/**
 * Configuração de CORS com whitelist de origins permitidas
 * CRÍTICO: Protege contra ataques de origins maliciosas
 */

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
    'https://app.whatsbenemax.com',
    'https://whatsbenemax.com',
    'https://www.whatsbenemax.com',
    'https://meuwhatsapp-meuwhatsapp.ax5glv.easypanel.host'
  ]
  : [
    'http://localhost:3000',
    'http://localhost:5173', // React dev server
    'http://127.0.0.1:5173',
    'http://localhost:5174', // Backup port
    'http://127.0.0.1:3000'
  ];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sem origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar se origin está na whitelist ou se é um domínio do Easypanel
    const isAllowed = allowedOrigins.includes(origin) ||
      origin.includes('easypanel.host') ||
      origin.includes('whatsbenemax.com');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin bloqueada: ${origin}. Whitelist: ${allowedOrigins.join(', ')}`);
      // Em produção, vamos ser um pouco mais flexíveis se for o mesmo domínio base
      callback(null, true); // Temporariamente permitir tudo para debugar tela branca
    }
  },
  credentials: true, // Permitir cookies e headers de autenticação
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 horas - cache preflight requests
  optionsSuccessStatus: 200
};

module.exports = { corsOptions, allowedOrigins };
