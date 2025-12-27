# Backend Code Review & Optimization Recommendations

## 📊 Overview

**Stack:** Node.js + Express + PostgreSQL + Redis + Socket.io
**Status:** ⚠️ **Código funcional mas precisa refatoração significativa**

---

## ✅ Pontos Fortes Identificados

1. **Arquitetura em Camadas** ✅
   - Separação clara: Rotas → Serviços → Repositórios
   - Middlewares bem organizados (auth, empresa, permissões, rateLimit)

2. **Segurança Básica** ✅
   - Helmet para headers HTTP
   - CORS configurado
   - Rate limiting implementado
   - Hash de senhas com bcrypt
   - JWT para autenticação

3. **Multi-tenancy** ✅
   - Isolamento por `empresa_id`
   - Middleware `garantirMultiTenant` em todas as rotas

4. **Cache com Redis** ✅
   - Implementado para otimizar queries

5. **Socket.io para Tempo Real** ✅
   - Salas por empresa e conversa
   - Eventos bem estruturados

---

## ⚠️ Problemas Críticos Encontrados

### 1. **Duplicação de Rotas** 🔴 CRÍTICO

**Problema:**
```
/src/rotas/         ← Português (autenticacao.rotas.js, usuario.rotas.js)
/src/routes/        ← Inglês (auth.js, users.js)
```

**Impacto:**
- Manutenção duplicada
- Inconsistência de comportamento
- Bugs difíceis de rastrear
- Confusão para desenvolvedores

**Solução:**
```bash
# Consolidar tudo em /src/routes/
mv src/rotas/* src/routes/
rm -rf src/rotas/

# Renomear arquivos para padrão consistente
autenticacao.rotas.js → auth.routes.js
usuario.rotas.js → user.routes.js
empresa.rotas.js → company.routes.js
```

**Timeline:** 🚨 **Imediato (Semana 1)**

---

### 2. **CORS Muito Permissivo** 🔴 CRÍTICO

**Problema encontrado em `/src/index.js:109`:**
```javascript
app.use(cors()); // ❌ Aceita QUALQUER origin
```

**Também em Socket.io (linha 68):**
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: '*', // ❌ MUITO PERIGOSO
    methods: ['GET', 'POST']
  }
});
```

**Risco de Segurança:**
- Qualquer site pode fazer requests para sua API
- Roubo de dados sensíveis
- CSRF attacks

**Solução:**
```javascript
// src/config/cors.js
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://app.whatsbenemax.com',
      'https://whatsbenemax.com'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5173', // React dev server
      'http://127.0.0.1:5173'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sem origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin bloqueada: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 horas
};

module.exports = { corsOptions };

// src/index.js
const { corsOptions } = require('./config/cors');
app.use(cors(corsOptions));

// Socket.io
const io = new Server(httpServer, {
  cors: corsOptions
});
```

**Timeline:** 🚨 **Imediato (Semana 1)**

---

### 3. **Falta de Validação de Entrada** 🔴 CRÍTICO

**Problema encontrado em `/src/rotas/usuario.rotas.js:24-26`:**
```javascript
if (!nome || !email || !senha) {
  return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
}
// ❌ Não valida formato de email
// ❌ Não valida tamanho de senha
// ❌ Não valida caracteres especiais
```

**Riscos:**
- SQL Injection (se não usar prepared statements)
- XSS (Cross-site scripting)
- Dados inválidos no banco
- Senhas fracas

**Solução com Zod:**
```javascript
// src/validators/usuario.validator.js
const { z } = require('zod');

const criarUsuarioSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),

  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),

  senha: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número'),

  funcao: z.enum(['administrador', 'empresa', 'usuario', 'afiliado']),

  permissoes: z.array(z.string()).optional()
});

// Middleware de validação
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: error.errors.map(e => ({
        campo: e.path.join('.'),
        mensagem: e.message
      }))
    });
  }
};

module.exports = { criarUsuarioSchema, validate };

// src/rotas/usuario.rotas.js
const { criarUsuarioSchema, validate } = require('../validators/usuario.validator');

router.post('/',
  verificarPermissao(['empresa', 'administrador']),
  verificarLimite('usuarios'),
  validate(criarUsuarioSchema), // ✅ Validação automática
  async (req, res) => {
    // Dados já estão validados aqui
    // ...
  }
);
```

**Aplicar em TODAS as rotas:**
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `POST /api/empresa`
- `PUT /api/empresa`
- `POST /api/agentes`
- etc.

**Timeline:** 🚨 **Alta prioridade (Semana 1-2)**

---

### 4. **Error Handling Inconsistente** 🟡 ALTO

**Problema:**
```javascript
// Alguns lugares retornam:
res.status(400).json({ erro: 'Mensagem' });

// Outros retornam:
res.status(400).json({ error: 'Message' });

// Outros retornam:
res.status(400).json({ mensagem: 'Erro' });

// Outros só fazem:
res.status(500).send('Erro');
```

**Solução:**
```javascript
// src/middlewares/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Log do erro
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Erro operacional (esperado)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: err.errors
      }
    });
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido'
      }
    });
  }

  // Erro de Postgres (pg)
  if (err.code && err.code.startsWith('23')) { // Constraint violations
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_CONSTRAINT',
        message: 'Violação de restrição do banco de dados'
      }
    });
  }

  // Erro não esperado (bug no código)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor'
        : err.message // Mostrar detalhes apenas em dev
    }
  });
};

// Catch async errors automaticamente
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };

// src/index.js
const { errorHandler } = require('./middlewares/errorHandler');

// ... todas as rotas ...

// Error handler DEVE ser o último middleware
app.use(errorHandler);

// src/rotas/usuario.rotas.js
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

router.post('/', asyncHandler(async (req, res) => {
  const usuarioExistente = await usuarioRepo.buscarPorEmail(email);

  if (usuarioExistente) {
    throw new AppError('Email já está em uso', 400, 'EMAIL_IN_USE');
  }

  // ...
}));
```

**Timeline:** 🟡 **Alta prioridade (Semana 2)**

---

### 5. **Logs Inadequados** 🟡 MÉDIO

**Problema:**
```javascript
console.log('[Socket.io] Cliente conectado:', socket.id); // ✅ OK
console.error('[Usuários] Erro ao criar:', erro); // ⚠️ Falta contexto
console.error(erro); // ❌ Muito vago
```

**Solução com Winston:**
```javascript
// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsbenemax-api' },
  transports: [
    // Arquivo de erros
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Arquivo combinado
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Console em dev
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;

// Uso
const logger = require('./config/logger');

logger.info('Servidor iniciado', { port: PORT });
logger.error('Erro ao criar usuário', {
  error: erro.message,
  stack: erro.stack,
  userId: req.user?.id,
  body: req.body
});
```

**Timeline:** 🟢 **Média prioridade (Semana 3)**

---

### 6. **Falta de Testes** 🔴 CRÍTICO

**Problema:**
- Nenhum arquivo de teste encontrado
- Impossível garantir que mudanças não quebram funcionalidades

**Solução:**
```javascript
// tests/unit/services/usuario.service.test.js
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const usuarioService = require('../../../src/servicos/usuario.servico');
const usuarioRepo = require('../../../src/repositorios/usuario.repositorio');

jest.mock('../../../src/repositorios/usuario.repositorio');

describe('UsuarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar usuário com sucesso', async () => {
      const dadosUsuario = {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'Senha123!'
      };

      usuarioRepo.buscarPorEmail.mockResolvedValue(null);
      usuarioRepo.criar.mockResolvedValue({
        id: 1,
        ...dadosUsuario,
        senha_hash: 'hash'
      });

      const resultado = await usuarioService.criar(dadosUsuario);

      expect(resultado).toHaveProperty('id');
      expect(resultado.nome).toBe('João Silva');
      expect(resultado).not.toHaveProperty('senha_hash');
    });

    it('deve lançar erro se email já existe', async () => {
      usuarioRepo.buscarPorEmail.mockResolvedValue({ id: 1 });

      await expect(usuarioService.criar({
        email: 'existente@test.com'
      })).rejects.toThrow('Email já está em uso');
    });
  });
});

// tests/integration/routes/usuarios.test.js
const request = require('supertest');
const app = require('../../../src/app');
const { criarToken } = require('../../../src/utilitarios/jwt');

describe('POST /api/usuarios', () => {
  let authToken;

  beforeEach(async () => {
    // Setup: criar usuário admin para testes
    authToken = criarToken({ id: 1, empresaId: 1, funcao: 'administrador' });
  });

  it('deve criar usuário com dados válidos', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nome: 'Novo Usuário',
        email: 'novo@test.com',
        senha: 'Senha123!',
        funcao: 'usuario'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('usuario');
    expect(response.body.usuario.email).toBe('novo@test.com');
  });

  it('deve retornar 400 com email inválido', async () => {
    const response = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nome: 'Teste',
        email: 'email-invalido',
        senha: 'Senha123!'
      });

    expect(response.status).toBe(400);
    expect(response.body.erro).toContain('Email inválido');
  });
});
```

**Cobertura mínima:**
- Testes unitários: Serviços, Repositórios, Utilitários
- Testes de integração: Rotas principais
- Meta: 70%+ de cobertura

**Timeline:** 🟡 **Alta prioridade (Semana 2-3)**

---

### 7. **Performance - N+1 Queries** 🟡 MÉDIO

**Problema provável:**
```javascript
// Buscar usuários
const usuarios = await usuarioRepo.listarPorEmpresa(empresaId);

// Para cada usuário, buscar empresa (N+1!)
for (const usuario of usuarios) {
  usuario.empresa = await empresaRepo.buscarPorId(usuario.empresa_id); // ❌
}
```

**Solução com JOINs:**
```sql
-- ❌ N+1 queries
SELECT * FROM usuarios WHERE empresa_id = 1; -- 1 query
SELECT * FROM empresas WHERE id = 1; -- query 2
SELECT * FROM empresas WHERE id = 1; -- query 3 (mesmo ID!)
... -- N queries

-- ✅ 1 query com JOIN
SELECT
  u.*,
  e.nome as empresa_nome,
  e.status as empresa_status
FROM usuarios u
LEFT JOIN empresas e ON u.empresa_id = e.id
WHERE u.empresa_id = 1;
```

**Timeline:** 🟢 **Média prioridade (Semana 3-4)**

---

### 8. **Secrets em Código** 🔴 CRÍTICO

**Problema em `/src/index.js:105`:**
```javascript
const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui'; // ❌ Default perigoso
```

**Solução:**
```javascript
// src/config/env.js
require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'API_KEY',
  'REDIS_URL'
];

// Validar que todas as variáveis obrigatórias existem
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${varName}`);
  }
});

// NUNCA usar defaults para secrets
const config = {
  port: parseInt(process.env.PORT) || 3000,
  apiKey: process.env.API_KEY, // ✅ Sem default
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;

// src/index.js
const config = require('./config/env');
const PORT = config.port;
// Se API_KEY não estiver definida, o servidor nem inicia
```

**Timeline:** 🚨 **Imediato (Semana 1)**

---

### 9. **Rate Limiting Muito Genérico** 🟡 MÉDIO

**Problema:**
```javascript
// Um rate limit global para TUDO
app.use(rateLimiter);
```

**Solução:**
```javascript
// src/middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');

// Rate limits específicos por tipo de endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests
  message: 'Muitas requisições, tente novamente em 1 minuto'
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Apenas 10 uploads por minuto
  message: 'Muitos uploads, aguarde 1 minuto'
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };

// src/index.js
const { authLimiter, apiLimiter, uploadLimiter } = require('./middlewares/rateLimit');

// Aplicar limiters específicos
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api', apiLimiter); // Genérico para resto da API
```

**Timeline:** 🟢 **Baixa prioridade (Semana 4)**

---

### 10. **Falta de Documentação da API** 🟡 MÉDIO

**Problema:**
- Nenhuma documentação Swagger/OpenAPI
- Frontend precisa adivinhar formatos de request/response

**Solução com Swagger:**
```javascript
// src/config/swagger.js
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsBenemax API',
      version: '2.1.0',
      description: 'API para gerenciamento de WhatsApp SaaS',
      contact: {
        name: 'Suporte',
        email: 'suporte@whatsbenemax.com'
      }
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desenvolvimento' },
      { url: 'https://api.whatsbenemax.com', description: 'Produção' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/rotas/*.js', './src/routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = { swaggerUi, swaggerDocs };

// src/index.js
const { swaggerUi, swaggerDocs } = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// src/rotas/usuario.rotas.js
/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Criar novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@example.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Senha123!
 *               funcao:
 *                 type: string
 *                 enum: [administrador, empresa, usuario, afiliado]
 *                 default: usuario
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', ...);
```

**Acessar:** `http://localhost:3000/api-docs`

**Timeline:** 🟢 **Média prioridade (Semana 3)**

---

## 📋 Checklist de Refatoração

### Prioridade CRÍTICA (Semana 1)
- [ ] Consolidar rotas duplicadas (`/rotas` → `/routes`)
- [ ] Configurar CORS restritivo (whitelist de origins)
- [ ] Validar todas as variáveis de ambiente obrigatórias
- [ ] Adicionar validação Zod em rotas principais (auth, usuarios, empresa)

### Prioridade ALTA (Semana 2)
- [ ] Implementar error handler global unificado
- [ ] Adicionar testes unitários para serviços críticos
- [ ] Implementar logging estruturado com Winston
- [ ] Revisar e otimizar queries do banco (evitar N+1)

### Prioridade MÉDIA (Semana 3)
- [ ] Adicionar Swagger documentation
- [ ] Implementar rate limiting específico por endpoint
- [ ] Adicionar testes de integração para rotas principais
- [ ] Otimizar performance (caching, índices no banco)

### Prioridade BAIXA (Semana 4)
- [ ] Migrar para TypeScript (gradual)
- [ ] Implementar health checks detalhados
- [ ] Adicionar metrics/observability (Prometheus)
- [ ] Code review automatizado (ESLint, Prettier, Husky)

---

## 🏗️ Arquitetura Recomendada

```
src/
├── config/          # Configurações (database, redis, cors, env)
├── middlewares/     # Middlewares (auth, validation, errors)
├── validators/      # Schemas Zod para validação
├── routes/          # Rotas da API (consolidadas)
├── controllers/     # Controllers (lógica de request/response)
├── services/        # Serviços (regras de negócio)
├── repositories/    # Repositórios (acesso ao banco)
├── models/          # Models/Types TypeScript
├── utils/           # Utilitários
├── jobs/            # Cron jobs
├── socket/          # Socket.io handlers
└── index.js         # Entry point

tests/
├── unit/            # Testes unitários
├── integration/     # Testes de integração
└── e2e/             # Testes end-to-end
```

---

## 🎯 Métricas de Sucesso

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| Cobertura de testes | 0% | 70% | ⏳ Pendente |
| Tempo de resposta médio | ? | < 200ms | ⏳ Medir |
| Erros 500 | Alto | < 0.1% | ⏳ Implementar monitoring |
| Documentação API | 0% | 100% | ⏳ Swagger |
| Duplicação de código | Alta | Baixa | ⏳ Refatorar |

---

**Última atualização:** 2025-12-27
**Revisado por:** Claude Code Agent
