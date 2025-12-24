const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Importar rotas
const instanceRoutes = require('./routes/instance');
const messageRoutes = require('./routes/message');
const groupRoutes = require('./routes/group');
const chatRoutes = require('./routes/chat');
const miscRoutes = require('./routes/misc');
const webhookRoutes = require('./routes/webhook');
const warmingRoutes = require('./routes/warming');
const metricsRoutes = require('./routes/metrics');
const schedulerRoutes = require('./routes/scheduler');

// Importar middlewares
const { authMiddleware, instanceAuthMiddleware } = require('./middlewares/auth');
const { rateLimiter } = require('./middlewares/rateLimit');

// Importar serviços
const { loadExistingSessions } = require('./services/whatsapp');
const { initMetrics } = require('./services/metrics');
const { initScheduler } = require('./services/scheduler');

const app = express();

// Configurações
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';

// Middlewares globais
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/public', express.static(path.join(__dirname, '../public')));

// Rotas públicas (sem autenticação)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    uptime: process.uptime()
  });
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
  const publicPaths = ['/health', '/manager', '/docs', '/dashboard', '/public'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Registrar rotas
app.use('/instance', instanceRoutes);
app.use('/message', messageRoutes);
app.use('/group', groupRoutes);
app.use('/chat', chatRoutes);
app.use('/misc', miscRoutes);
app.use('/webhook', webhookRoutes);
app.use('/warming', warmingRoutes);
app.use('/metrics', metricsRoutes);
app.use('/scheduler', schedulerRoutes);

// Rota de fallback para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
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

  // Inicializar sistema de métricas
  initMetrics();

  // Inicializar sistema de agendamento
  initScheduler();

  // Carregar sessões existentes
  await loadExistingSessions();
});

module.exports = app;
