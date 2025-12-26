const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importar configurações de banco de dados
const { query: dbQuery } = require('./config/database');
const { redis, cache } = require('./config/redis');

// Importar jobs de status (inicializa cron jobs)
require('./jobs/statusChecker');
const { iniciarTarefaFollowup } = require('./tarefas/followup.tarefa');
const { iniciarTarefaWhiteLabel } = require('./tarefas/whitelabel.tarefa');

// Importar rotas existentes
const autenticacaoRoutes = require('./rotas/autenticacao.rotas');
const instanceRoutes = require('./routes/instance');
const messageRoutes = require('./routes/message');
const groupRoutes = require('./routes/group');
const chatRoutes = require('./routes/chat');
const miscRoutes = require('./routes/misc');
const webhookRoutes = require('./routes/webhook');
const warmingRoutes = require('./routes/warming');
const metricsRoutes = require('./routes/metrics');
const schedulerRoutes = require('./routes/scheduler');
const contactsRoutes = require('./routes/contacts');
const broadcastRoutes = require('./routes/broadcast');
const autoresponderRoutes = require('./routes/autoresponder');
const statusRoutes = require('./routes/status');

// Importar novas rotas SaaS
const usuarioRoutes = require('./rotas/usuario.rotas');
const empresaRoutes = require('./rotas/empresa.rotas');
const planoRoutes = require('./rotas/plano.rotas');
const contatoRoutes = require('./rotas/contato.rotas');
const agenteIARoutes = require('./rotas/agente-ia.rotas');
const prospeccaoRoutes = require('./rotas/prospeccao.rotas');
const chatInternoRoutes = require('./rotas/chat.rotas');
const integracaoRoutes = require('./rotas/integracao.rotas');
const crmRoutes = require('./rotas/crm.rotas');
const followupRoutes = require('./rotas/followup.rotas');
const whitelabelRoutes = require('./rotas/whitelabel.rotas');

// Importar middlewares
const { authMiddleware, instanceAuthMiddleware } = require('./middlewares/auth');
const { rateLimiter } = require('./middlewares/rateLimit');
const { whitelabelMiddleware } = require('./middlewares/whitelabel.middleware');

// Importar serviços
const { loadExistingSessions } = require('./services/whatsapp');
const { initMetrics } = require('./services/metrics');
const { initScheduler } = require('./services/scheduler');
const { initBroadcast } = require('./services/broadcast');
const { initAutoResponder } = require('./services/autoresponder');
const { initWebhookAdvanced } = require('./services/webhook-advanced');
const chatServico = require('./servicos/chat.servico');

const app = express();
const httpServer = createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configurar Socket.io no serviço de chat
chatServico.configurarSocketIO(io);

// Socket.io - Autenticação e gerenciamento de salas
io.on('connection', (socket) => {
  console.log('[Socket.io] Cliente conectado:', socket.id);

  // Entrar em sala da empresa
  socket.on('entrar_empresa', (empresaId) => {
    socket.join(`empresa:${empresaId}`);
    console.log(`[Socket.io] Socket ${socket.id} entrou na empresa ${empresaId}`);
  });

  // Entrar em sala de conversa
  socket.on('entrar_conversa', (conversaId) => {
    socket.join(`conversa:${conversaId}`);
    console.log(`[Socket.io] Socket ${socket.id} entrou na conversa ${conversaId}`);
  });

  // Sair de sala de conversa
  socket.on('sair_conversa', (conversaId) => {
    socket.leave(`conversa:${conversaId}`);
    console.log(`[Socket.io] Socket ${socket.id} saiu da conversa ${conversaId}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Cliente desconectado:', socket.id);
  });
});

// Configurações
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';

// Middlewares globais
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, '../public')));

// White Label - detectar domínio customizado
app.use(whitelabelMiddleware);

// Rotas públicas (sem autenticação)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime()
  });
});

// Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Páginas HTML
app.get('/manager', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/manager.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/docs.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Rate limiting
app.use(rateLimiter);

// Autenticação global
app.use((req, res, next) => {
  const publicPaths = ['/', '/health', '/manager', '/docs', '/dashboard', '/public', '/status'];
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Registrar rotas existentes
app.use('/api/autenticacao', autenticacaoRoutes);
app.use('/status', statusRoutes);
app.use('/instance', instanceRoutes);
app.use('/message', messageRoutes);
app.use('/group', groupRoutes);
app.use('/chat', chatRoutes);
app.use('/misc', miscRoutes);
app.use('/webhook', webhookRoutes);
app.use('/warming', warmingRoutes);
app.use('/metrics', metricsRoutes);
app.use('/scheduler', schedulerRoutes);
app.use('/contacts', contactsRoutes);
app.use('/broadcast', broadcastRoutes);
app.use('/autoresponder', autoresponderRoutes);

// Registrar novas rotas SaaS
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

// Rota de fallback para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

// ========== INICIALIZAÇÃO DO BANCO DE DADOS ==========
async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados...');

    // Verificar se o arquivo de schema existe
    const schemaPath = path.join(__dirname, 'config/schema.sql');

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Executar schema (criar tabelas, índices, triggers, etc)
      await dbQuery(schema);

      console.log('✅ Tabelas PostgreSQL criadas/verificadas com sucesso');
    } else {
      console.warn('⚠️  Arquivo schema.sql não encontrado, pulando criação de tabelas');
    }

    // Executar schema SaaS (multi-tenant, autenticação, etc)
    const saasSchemaPath = path.join(__dirname, 'config/saas-schema.sql');
    if (fs.existsSync(saasSchemaPath)) {
      const saasSchema = fs.readFileSync(saasSchemaPath, 'utf8');
      await dbQuery(saasSchema);
      console.log('✅ Tabelas SaaS criadas/verificadas com sucesso');
    }

    // Executar schema de status
    const statusSchemaPath = path.join(__dirname, 'config/status-schema.sql');
    if (fs.existsSync(statusSchemaPath)) {
      const statusSchema = fs.readFileSync(statusSchemaPath, 'utf8');
      await dbQuery(statusSchema);
      console.log('✅ Tabelas de Status criadas/verificadas com sucesso');
    }

    // Executar schema de IA e Prospecção
    const iaProspeccaoSchemaPath = path.join(__dirname, 'config/ia-prospeccao-schema.sql');
    if (fs.existsSync(iaProspeccaoSchemaPath)) {
      const iaProspeccaoSchema = fs.readFileSync(iaProspeccaoSchemaPath, 'utf8');
      await dbQuery(iaProspeccaoSchema);
      console.log('✅ Tabelas de IA e Prospecção criadas/verificadas com sucesso');
    }

    // Executar schema de Chat e Integrações
    const chatSchemaPath = path.join(__dirname, 'config/chat-schema.sql');
    if (fs.existsSync(chatSchemaPath)) {
      const chatSchema = fs.readFileSync(chatSchemaPath, 'utf8');
      await dbQuery(chatSchema);
      console.log('✅ Tabelas de Chat e Integrações criadas/verificadas com sucesso');
    }

    // Executar schema de CRM Kanban
    const crmSchemaPath = path.join(__dirname, 'config/crm-schema.sql');
    if (fs.existsSync(crmSchemaPath)) {
      const crmSchema = fs.readFileSync(crmSchemaPath, 'utf8');
      await dbQuery(crmSchema);
      console.log('✅ Tabelas de CRM Kanban criadas/verificadas com sucesso');
    }

    // Executar schema de Follow-up Inteligente
    const followupSchemaPath = path.join(__dirname, 'config/followup-schema.sql');
    if (fs.existsSync(followupSchemaPath)) {
      const followupSchema = fs.readFileSync(followupSchemaPath, 'utf8');
      await dbQuery(followupSchema);
      console.log('✅ Tabelas de Follow-up Inteligente criadas/verificadas com sucesso');
    }

    // Executar schema de White Label
    const whitelabelSchemaPath = path.join(__dirname, 'config/whitelabel-schema.sql');
    if (fs.existsSync(whitelabelSchemaPath)) {
      const whitelabelSchema = fs.readFileSync(whitelabelSchemaPath, 'utf8');
      await dbQuery(whitelabelSchema);
      console.log('✅ Tabelas de White Label criadas/verificadas com sucesso');
    }

    // Testar Redis
    await redis.ping();
    console.log('✅ Redis conectado e funcionando');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error('⚠️  O sistema continuará, mas funcionalidades de banco podem não funcionar');
  }
}

// Iniciar servidor (usar httpServer para suportar Socket.io)
httpServer.listen(PORT, '0.0.0.0', async () => {
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
║  🌐 Servidor: http://localhost:${PORT}                             ║
║  📊 Dashboard: http://localhost:${PORT}/dashboard                  ║
║  🎛️  Manager: http://localhost:${PORT}/manager                     ║
║  📖 Docs: http://localhost:${PORT}/docs                            ║
║  🔑 API Key: ${API_KEY.substring(0, 10)}...                                 ║
╚══════════════════════════════════════════════════════════════════╝
  `);

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

  console.log('\n✅ Todos os sistemas inicializados com sucesso!\n');
});

module.exports = app;
