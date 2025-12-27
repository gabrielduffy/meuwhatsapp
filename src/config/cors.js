/**
 * Configuração de CORS com whitelist de origins permitidas
 * CRÍTICO: Protege contra ataques de origins maliciosas
 */

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://app.whatsbenemax.com',
      'https://whatsbenemax.com',
      'https://www.whatsbenemax.com'
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

    // Verificar se origin está na whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin bloqueada: ${origin}`);
      callback(new Error('Not allowed by CORS'));
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
