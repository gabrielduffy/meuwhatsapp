const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importar configurações (DEVE SER PRIMEIRO para validar env vars)
const config = require('./config/env');
const logger = require('./config/logger');
const { corsOptions } = require('./config/cors');
const { swaggerUi, swaggerDocs, swaggerUiOptions } = require('./config/swagger');

// Importar configurações de banco de dados
const { query: dbQuery } = require('./config/database');
const { redis, cache } = require('./config/redis');

// Importar jobs de status (inicializa cron jobs)
require('./jobs/statusChecker');
const { iniciarTarefaFollowup } = require('./tarefas/followup.tarefa');
const { iniciarTarefaWhiteLabel } = require('./tarefas/whitelabel.tarefa');

// Importar rotas consolidadas
const autenticacaoRoutes = require('./routes/auth.routes');
const instanceRoutes = require('./routes/instance.routes');
const messageRoutes = require('./routes/message.routes');
const groupRoutes = require('./routes/group.routes');
const chatRoutes = require('./routes/chat.routes');
const miscRoutes = require('./routes/misc.routes');
const webhookRoutes = require('./routes/webhook.routes');
const warmingRoutes = require('./routes/warming.routes');
const metricsRoutes = require('./routes/metrics.routes');
const schedulerRoutes = require('./routes/scheduler.routes');
const contactsRoutes = require('./routes/contacts.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const autoresponderRoutes = require('./routes/autoresponder.routes');
const statusRoutes = require('./routes/status.routes');
const usuarioRoutes = require('./routes/users.routes');
const empresaRoutes = require('./routes/companies.routes');
const planoRoutes = require('./routes/plans.routes');
const contatoRoutes = require('./routes/contact.routes');
const agenteIARoutes = require('./routes/ai-agents.routes');
const prospeccaoRoutes = require('./routes/prospecting.routes');
const chatInternoRoutes = require('./routes/chat-interno.routes');
const integracaoRoutes = require('./routes/integrations.routes');
const crmRoutes = require('./routes/crm.routes');
const followupRoutes = require('./routes/followup.routes');
const whitelabelRoutes = require('./routes/whitelabel.routes');
const notificacoesRoutes = require('./routes/notifications.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Importar middlewares
const { authMiddleware, instanceAuthMiddleware } = require('./middlewares/auth');
const { rateLimiter } = require('./middlewares/rateLimit');
const { whitelabelMiddleware } = require('./middlewares/whitelabel.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Importar serviços
const { loadExistingSessions } = require('./services/whatsapp');
const { initMetrics } = require('./services/metrics');
const { initScheduler } = require('./services/scheduler');
const { initBroadcast } = require('./services/broadcast');
const { initAutoResponder } = require('./services/autoresponder');
const { initWebhookAdvanced } = require('./services/webhook-advanced');
const chatServico = require('./servicos/chat.servico');
const { mapScraperQueue } = require('./queues/mapScraperQueue');


const app = express();
const httpServer = createServer(app);

// Configurar Socket.io com CORS seguro
const io = new Server(httpServer, {
  cors: corsOptions
});

// Configurar Socket.io no serviço de chat
chatServico.configurarSocketIO(io);

// Socket.io - Autenticação e gerenciamento de salas
io.on('connection', (socket) => {
  logger.info('Cliente Socket.io conectado', { socketId: socket.id });

  // Entrar em sala da empresa
  socket.on('entrar_empresa', (empresaId) => {
    socket.join(`empresa:${empresaId}`);
    logger.debug('Socket entrou em sala da empresa', { socketId: socket.id, empresaId });
  });

  // Entrar em sala de conversa
  socket.on('entrar_conversa', (conversaId) => {
    socket.join(`conversa:${conversaId}`);
    logger.debug('Socket entrou em conversa', { socketId: socket.id, conversaId });
  });

  // Sair de sala de conversa
  socket.on('sair_conversa', (conversaId) => {
    socket.leave(`conversa:${conversaId}`);
    logger.debug('Socket saiu de conversa', { socketId: socket.id, conversaId });
  });

  socket.on('disconnect', () => {
    logger.info('Cliente Socket.io desconectado', { socketId: socket.id });
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Static Files (Prioridade máxima para evitar interferência de middlewares)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const uploadsPath = path.resolve('/app/uploads'); // Caminho absoluto fixo para Docker

// Garantir que a pasta de uploads existe e tem permissão
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  // Forçar permissões de leitura/escrita para evitar bloqueios do Docker
  fs.chmodSync(uploadsPath, '755');
  logger.info(`Pasta de uploads verificada: ${uploadsPath}`);
} catch (err) {
  logger.error(`Erro ao configurar pasta de uploads: ${err.message}`);
}

logger.info(`Configurando express.static em: ${frontendDistPath}`);

// 2. Middlewares de Segurança e CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite carregar mídias em outros sites (Lovable)
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(compression());

// Servir arquivos estáticos com cabeçalhos TOTALMENTE permissivos para o Lovable
app.use(express.static(frontendDistPath));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache para carregar mais rápido
  next();
}, express.static(uploadsPath));


const publicPaths = [
  '/health', '/status', '/api-docs',
  '/assets', '/vite.svg', '/favicon.ico', '/logo.png'
];

// Diagnostic route - DEVE VIR NO TOPO
app.get('/api/debug-frontend', (req, res) => {
  const exists = fs.existsSync(frontendDistPath);
  let files = [];
  if (exists) {
    files = fs.readdirSync(frontendDistPath);
    if (files.includes('assets')) {
      files = [...files, ...fs.readdirSync(path.join(frontendDistPath, 'assets')).map(f => `assets/${f}`)];
    }
  }
  res.json({
    path: frontendDistPath,
    exists,
    files,
    cwd: process.cwd(),
    dirname: __dirname,
    publicPaths,
    nodeEnv: config.nodeEnv,
    enableSwagger: config.enableSwagger
  });
});

app.get('/api/debug-full', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    fs: { write: false, error: null },
    db: { connected: false, error: null },
    modules: { baileys: false }
  };

  // 1. Testar FS
  try {
    const testFile = path.join(__dirname, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.fs.write = true;
  } catch (e) { results.fs.error = e.message; }

  // 2. Testar DB
  try {
    const { query } = require('./config/database');
    await query('SELECT NOW()');
    results.db.connected = true;
  } catch (e) { results.db.error = e.message; }

  // 3. Testar Modulos
  try {
    require('@whiskeysockets/baileys');
    results.modules.baileys = true;
  } catch (e) { results.modules.error = e.message; }

  res.json(results);
});

app.get('/api/debug-detail-db', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const empresas = await query('SELECT id, nome, status FROM empresas');
    const instancesRes = await query('SELECT instance_name, token, empresa_id, status FROM instances');
    const counts = await query(`
      SELECT 
        (SELECT COUNT(*) FROM conversas_chat) as conversas,
        (SELECT COUNT(*) FROM mensagens_chat) as mensagens,
        (SELECT COUNT(*) FROM contatos) as contatos
    `);

    res.json({
      empresas: empresas.rows,
      instances: instancesRes.rows,
      counts: counts.rows[0],
      serverTime: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/debug-messages', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const msgs = await query(`
      SELECT m.*, c.instancia_id as inst 
      FROM mensagens_chat m 
      LEFT JOIN conversas_chat c ON m.conversa_id = c.id 
      ORDER BY m.criado_em DESC 
      LIMIT 20
    `);
    res.json(msgs.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Log de todas as requisições (apenas em desenvolvimento ou para rotas críticas de debug)
app.use((req, res, next) => {
  if (req.url.includes('/qrcode')) {
    console.log(`[PEDIDO QR CODE] ${req.method} ${req.url} - Referer: ${req.headers.referer || 'N/A'}`);
  }
  if (config.nodeEnv !== 'production') {
    logger.debug(`${req.method} ${req.url}`);
  }
  next();
});

// White Label - detectar domínio customizado
// Skip for assets and static files
app.use((req, res, next) => {
  if (req.path.startsWith('/assets/') || req.path.includes('.')) {
    return next();
  }
  whitelabelMiddleware(req, res, next);
});

// Rate limiting
app.use(rateLimiter);

// Autenticação Seletiva
// Legacy API routes require API Key
const legacyApiPrefixes = [
  '/instance', '/message', '/group', '/chat', '/misc',
  '/webhook', '/warming', '/metrics', '/scheduler',
  '/contacts', '/broadcast', '/autoresponder'
];

app.use((req, res, next) => {
  const path = req.path;

  // 1. PUBLIC ROUTES - NO AUTH (MUST BE FIRST)
  // Essential for QR Code display in external frontends (Lovable) and diagnostic tools
  if (path.includes('/qrcode') || path.includes('/setup-demo') || path.includes('/repair-db')) {
    // Adicionar headers de CORS específicos para garantir exibição livre
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return next();
  }

  // 2. Static Assets & Public Basic Routes
  if (publicPaths.some(p => path === p || path.startsWith(p))) {
    return next();
  }

  // 3. SaaS API Routes (Internal JWT Auth)
  if (path.startsWith('/api/')) {
    return next();
  }

  // 4. Legacy API Routes (X-API-Key or Bearer Token)
  // Agora também acessíveis via /api/ para consistência
  if (legacyApiPrefixes.some(p => path.startsWith(p) || path.startsWith(`/api${p}`))) {
    // Se for rota de instância mas pública (como qrcode), pular auth
    if (path.includes('/qrcode') || path.includes('/restore') || path.includes('/debug')) {
      return next();
    }
    return instanceAuthMiddleware(req, res, next);
  }

  // 5. Fallback for React Router
  next();
});

// Rotas básicas e documentação
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      uptime: process.uptime(),
      environment: config.nodeEnv
    }
  });
});

if (config.enableSwagger) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));
  logger.info('Swagger documentation disponível em /api-docs');
}

// Registrar rotas legadas (suporte a ambos os prefixos para evitar quebras)
const registrarRotasLegadas = (prefix = '') => {
  app.use(`${prefix}/instance`, instanceRoutes);
  app.use(`${prefix}/message`, messageRoutes);
  app.use(`${prefix}/group`, groupRoutes);
  app.use(`${prefix}/chat`, chatRoutes);
  app.use(`${prefix}/misc`, miscRoutes);
  app.use(`${prefix}/webhook`, webhookRoutes);
  app.use(`${prefix}/warming`, warmingRoutes);
  app.use(`${prefix}/metrics`, metricsRoutes);
  app.use(`${prefix}/scheduler`, schedulerRoutes);
  app.use(`${prefix}/contacts`, contactsRoutes);
  app.use(`${prefix}/broadcast`, broadcastRoutes);
  app.use(`${prefix}/autoresponder`, autoresponderRoutes);
};

// Registrar com e sem /api para compatibilidade total
registrarRotasLegadas();
registrarRotasLegadas('/api');

// Registrar novas rotas SaaS (sempre sob /api)
app.use('/api/autenticacao', autenticacaoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/planos', planoRoutes);
app.use('/api/contatos', contatoRoutes);
app.use('/api/agentes-ia', agenteIARoutes);
app.use('/api/prospeccao', prospeccaoRoutes);
app.use('/api/chat', chatInternoRoutes);
app.use('/api/integracoes', integracaoRoutes.rotasProtegidas);
app.use('/api/integracoes', integracaoRoutes.rotasPublicas);
app.use('/api/crm', crmRoutes);
app.use('/api/followup', followupRoutes);
app.use('/api/whitelabel', whitelabelRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rotas especiais
app.use('/status', statusRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/debug', require('./routes/debug.routes'));

// Fallback para SPA React - DEVE VIR ANTES DO 404 HANDLER
// Serve o index.html do React para todas as rotas não-API
app.get('*', (req, res, next) => {
  const pathPart = req.path;

  // Se for rota de API, arquivo estático (com ponto) ou caminhos legados, pular
  if (pathPart.includes('.') ||
    pathPart.startsWith('/api/') ||
    pathPart.startsWith('/api-docs') ||
    pathPart.startsWith('/status/') ||
    pathPart.startsWith('/instance/') ||
    pathPart.startsWith('/message/') ||
    pathPart.startsWith('/group/') ||
    pathPart.startsWith('/chat/') ||
    pathPart.startsWith('/webhook/') ||
    pathPart.startsWith('/warming/') ||
    pathPart.startsWith('/metrics/') ||
    pathPart.startsWith('/scheduler/') ||
    pathPart.startsWith('/contacts/') ||
    pathPart.startsWith('/broadcast/') ||
    pathPart.startsWith('/autoresponder/')) {
    return next();
  }

  // Tentar servir o index.html do React
  const reactIndexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(reactIndexPath)) {
    return res.sendFile(reactIndexPath);
  }

  // Se React build não existir, continuar para 404
  next();
});

// Rota de fallback para 404 (DEVE VIR ANTES DO ERROR HANDLER)
app.use(notFoundHandler);

// Error handler global (DEVE SER O ÚLTIMO MIDDLEWARE)
app.use(errorHandler);

// ========== INICIALIZAÇÃO DO BANCO DE DADOS ==========
async function initializeDatabase() {
  try {
    logger.info('Inicializando banco de dados...');

    // Reparo necessário para tipos de coluna incorretos (UUID -> VARCHAR)
    const { repararBanco } = require('./utilitarios/reparar-banco');
    await repararBanco();

    // Garantir dados mínimos (Seed)
    const { seedInicial } = require('./utilitarios/seed-inicial');
    // Executar seed apenas se necessário (o próprio script verifica)
    await seedInicial();

    // Verificar se o arquivo de schema existe
    const schemaPath = path.join(__dirname, 'config/schema.sql');

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Executar schema (criar tabelas, índices, triggers, etc)
      await dbQuery(schema);

      logger.info('Tabelas PostgreSQL criadas/verificadas com sucesso');
    } else {
      logger.warn('Arquivo schema.sql não encontrado, pulando criação de tabelas');
    }

    // Executar schema SaaS (multi-tenant, autenticação, etc)
    const saasSchemaPath = path.join(__dirname, 'config/saas-schema.sql');
    if (fs.existsSync(saasSchemaPath)) {
      const saasSchema = fs.readFileSync(saasSchemaPath, 'utf8');
      await dbQuery(saasSchema);
      logger.info('Tabelas SaaS criadas/verificadas com sucesso');
    }

    // Executar schema de status
    const statusSchemaPath = path.join(__dirname, 'config/status-schema.sql');
    if (fs.existsSync(statusSchemaPath)) {
      const statusSchema = fs.readFileSync(statusSchemaPath, 'utf8');
      await dbQuery(statusSchema);
      logger.info('Tabelas de Status criadas/verificadas com sucesso');
    }

    // Executar schema de IA e Prospecção
    const iaProspeccaoSchemaPath = path.join(__dirname, 'config/ia-prospeccao-schema.sql');
    if (fs.existsSync(iaProspeccaoSchemaPath)) {
      const iaProspeccaoSchema = fs.readFileSync(iaProspeccaoSchemaPath, 'utf8');
      await dbQuery(iaProspeccaoSchema);
      logger.info('Tabelas de IA e Prospecção criadas/verificadas com sucesso');
    }

    // Executar schema de Chat e Integrações
    const chatSchemaPath = path.join(__dirname, 'config/chat-schema.sql');
    if (fs.existsSync(chatSchemaPath)) {
      const chatSchema = fs.readFileSync(chatSchemaPath, 'utf8');
      await dbQuery(chatSchema);
      logger.info('Tabelas de Chat e Integrações criadas/verificadas com sucesso');
    }

    // Executar schema de CRM Kanban
    const crmSchemaPath = path.join(__dirname, 'config/crm-schema.sql');
    if (fs.existsSync(crmSchemaPath)) {
      const crmSchema = fs.readFileSync(crmSchemaPath, 'utf8');
      await dbQuery(crmSchema);
      logger.info('Tabelas de CRM Kanban criadas/verificadas com sucesso');
    }

    // Executar schema de Follow-up Inteligente
    const followupSchemaPath = path.join(__dirname, 'config/followup-schema.sql');
    if (fs.existsSync(followupSchemaPath)) {
      const followupSchema = fs.readFileSync(followupSchemaPath, 'utf8');
      await dbQuery(followupSchema);
      logger.info('Tabelas de Follow-up Inteligente criadas/verificadas com sucesso');
    }

    // Executar schema de White Label
    const whitelabelSchemaPath = path.join(__dirname, 'config/whitelabel-schema.sql');
    if (fs.existsSync(whitelabelSchemaPath)) {
      const whitelabelSchema = fs.readFileSync(whitelabelSchemaPath, 'utf8');
      await dbQuery(whitelabelSchema);
      logger.info('Tabelas de White Label criadas/verificadas com sucesso');
    }

    // Testar Redis
    await redis.ping();
    logger.info('Redis conectado e funcionando');

  } catch (error) {
    logger.error('Erro ao inicializar banco de dados', { error: error.message, stack: error.stack });
    logger.warn('O sistema continuará, mas funcionalidades de banco podem não funcionar');
  }
}

// Iniciar servidor (usar httpServer para suportar Socket.io)
httpServer.listen(config.port, '0.0.0.0', async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██╗    ██╗██╗  ██╗ █████╗ ████████╗███████╗██████╗ ███████╗   ║
║   ██║    ██║██║  ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██╔════╝   ║
║   ██║ █╗ ██║███████║███████║   ██║   ███████╗██████╔╝█████╗     ║
║   ██║███╗██║██╔══██║██╔══██║   ██║   ╚════██║██╔══██╗██╔══╝     ║
║   ╚███╔███╔╝██║  ██║██║  ██║   ██║   ███████║██████╔╝███████╗   ║
║    ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝ ╚══════╝   ║
║                                                                  ║
║   ██████╗ ███████╗███╗   ██╗███████╗███████╗███╗   ███╗ █████╗  ║
║   ██╔══██╗██╔════╝████╗  ██║██╔════╝██╔════╝████╗ ████║██╔══██╗ ║
║   ██████╔╝█████╗  ██╔██╗ ██║█████╗  ██║     ██╔████╔██║███████║ ║
║   ██╔══██╗██╔══╝  ██║╚██╗██║██╔══╝  ██║     ██║╚██╔╝██║██╔══██║ ║
║   ██████╔╝███████╗██║ ╚████║███████╗███████╗██║ ╚═╝ ██║██║  ██║ ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝ ║
║                        API v2.1.0                                ║
║              🚀 Métricas | Agendamento | IA                      ║
╠══════════════════════════════════════════════════════════════════╣
║  🌐 Servidor: http://localhost:${config.port}                      ║
║  📊 Dashboard: http://localhost:${config.port}/dashboard           ║
║  🎛️  Manager: http://localhost:${config.port}/manager              ║
║  📖 API Docs: http://localhost:${config.port}/api-docs             ║
║  🔐 Environment: ${config.nodeEnv}                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  logger.info('Servidor HTTP iniciado', { port: config.port, env: config.nodeEnv });

  // Inicializar banco de dados PostgreSQL e Redis
  await initializeDatabase();

  // Inicializar sistema de métricas
  initMetrics();

  // Inicializar sistema de agendamento
  initScheduler();

  // Inicializar sistema de broadcast
  initBroadcast();

  // Inicializar sistema de auto-resposta
  initAutoResponder();

  // Inicializar sistema de webhook avançado
  initWebhookAdvanced();

  // Inicializar tarefa de follow-up
  iniciarTarefaFollowup();

  // Inicializar tarefa de white label
  iniciarTarefaWhiteLabel();

  // Carregar sessões existentes
  await loadExistingSessions();

  // Inicializar tabelas de prospecção
  const prospeccaoRepo = require('./repositorios/prospeccao.repositorio');
  await prospeccaoRepo.inicializarTabelaHistorico();

  // Log de filas Bull
  logger.info('Filas Bull (Redis) inicializadas: map-scraper');

  logger.info('Todos os sistemas inicializados com sucesso!');
});

module.exports = app;
