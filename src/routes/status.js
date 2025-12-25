const express = require('express');
const router = express.Router();
const RSS = require('rss');
const path = require('path');
const statusMonitor = require('../services/statusMonitor');
const statusNotifier = require('../services/statusNotifier');
const statusRepository = require('../repositories/statusRepository');

// === PÁGINAS HTML ===

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/status.html'));
});

router.get('/maintenance', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/status-maintenance.html'));
});

router.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/status-subscribe.html'));
});

// === RSS FEED ===

router.get('/rss', async (req, res) => {
  try {
    const settings = await statusNotifier.getSettings();
    const incidents = await statusRepository.getIncidentHistory(50);

    const feed = new RSS({
      title: `${settings.site_name} - Incidentes`,
      description: 'Feed de incidentes e atualizações de status',
      feed_url: `${settings.site_url}/status/rss`,
      site_url: settings.site_url,
      language: 'pt-BR',
      ttl: 5
    });

    for (const incident of incidents) {
      feed.item({
        title: `[${incident.severity.toUpperCase()}] ${incident.title}`,
        description: incident.description,
        url: `${settings.site_url}/status/incident/${incident.id}`,
        guid: `incident-${incident.id}`,
        date: new Date(incident.started_at),
        categories: [incident.service_name, incident.severity, incident.status]
      });
    }

    res.type('application/rss+xml');
    res.send(feed.xml({ indent: true }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === API: STATUS ===

// Endpoint de instalação manual do schema
router.post('/api/install', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const fs = require('fs');
    const path = require('path');

    const schemaPath = path.join(__dirname, '../../src/config/status-schema.sql');

    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({
        error: 'Arquivo status-schema.sql não encontrado',
        path: schemaPath
      });
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Executar o schema
    await query(schema);

    // Verificar se funcionou
    const result = await query('SELECT COUNT(*) FROM status_services');
    const count = parseInt(result.rows[0].count);

    res.json({
      success: true,
      message: 'Schema executado com sucesso!',
      services_count: count,
      note: 'Tabelas de status criadas. Aguarde 1 minuto para os cron jobs coletarem dados.'
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint para testar conexão e tabelas
router.get('/api/debug', async (req, res) => {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Teste 1: Verificar se a tabela status_services existe
    try {
      const servicesResult = await statusRepository.getAllServices();
      debug.tests.services_table = {
        success: true,
        count: servicesResult.length,
        data: servicesResult
      };
    } catch (e) {
      debug.tests.services_table = {
        success: false,
        error: e.message
      };
    }

    // Teste 2: Verificar status_checks
    try {
      const { query } = require('../config/database');
      const result = await query('SELECT COUNT(*) FROM status_checks');
      debug.tests.checks_table = {
        success: true,
        count: parseInt(result.rows[0].count)
      };
    } catch (e) {
      debug.tests.checks_table = {
        success: false,
        error: e.message
      };
    }

    // Teste 3: Verificar getCurrentStatus
    try {
      const current = await statusRepository.getCurrentStatus();
      debug.tests.current_status = {
        success: true,
        count: current.length,
        data: current
      };
    } catch (e) {
      debug.tests.current_status = {
        success: false,
        error: e.message
      };
    }

    // Teste 4: Verificar incidentes
    try {
      const incidents = await statusRepository.getActiveIncidents();
      debug.tests.active_incidents = {
        success: true,
        count: incidents.length
      };
    } catch (e) {
      debug.tests.active_incidents = {
        success: false,
        error: e.message
      };
    }

    // Teste 5: Verificar manutenções
    try {
      const maintenances = await statusRepository.getScheduledMaintenances();
      debug.tests.scheduled_maintenances = {
        success: true,
        count: maintenances.length
      };
    } catch (e) {
      debug.tests.scheduled_maintenances = {
        success: false,
        error: e.message
      };
    }

    res.json(debug);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/api/current', async (req, res) => {
  try {
    const services = await statusRepository.getCurrentStatus();
    const incidents = await statusRepository.getActiveIncidents();
    const maintenances = await statusRepository.getScheduledMaintenances();

    const statuses = services.map(s => s.status).filter(Boolean);
    let overall = 'operational';
    if (statuses.includes('outage')) overall = 'outage';
    else if (statuses.includes('degraded')) overall = 'degraded';

    const activeMaintenance = maintenances.find(m => m.status === 'in_progress');
    if (activeMaintenance) overall = 'maintenance';

    res.json({
      overall,
      services,
      incidents,
      maintenances,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/history/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { days = 90 } = req.query;

    const service = await statusRepository.getServiceBySlug(slug);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const history = await statusRepository.getUptimeHistory(service.id, parseInt(days));
    const uptime = await statusRepository.getOverallUptime(service.id, parseInt(days));

    res.json({ service, uptime, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/check', async (req, res) => {
  try {
    const results = await statusMonitor.runAllChecks();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === API: INCIDENTES ===

router.get('/api/incidents', async (req, res) => {
  try {
    const { limit = 20, status } = req.query;

    let incidents;
    if (status === 'active') {
      incidents = await statusRepository.getActiveIncidents();
    } else {
      incidents = await statusRepository.getIncidentHistory(parseInt(limit));
    }

    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await statusRepository.getIncidentById(id);

    if (!incident) {
      return res.status(404).json({ error: 'Incidente não encontrado' });
    }

    const updates = await statusRepository.getIncidentUpdates(id);
    res.json({ incident, updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === API: MANUTENÇÕES ===

router.get('/api/maintenances', async (req, res) => {
  try {
    const { type = 'upcoming' } = req.query;

    let maintenances;
    if (type === 'history') {
      maintenances = await statusRepository.getMaintenanceHistory(20);
    } else {
      maintenances = await statusRepository.getScheduledMaintenances();
    }

    res.json({ maintenances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === API: INSCRIÇÃO ===

router.post('/api/subscribe', async (req, res) => {
  try {
    const { email, telegram_chat_id, notify_on, services } = req.body;

    if (!email && !telegram_chat_id) {
      return res.status(400).json({ error: 'Email ou Telegram é obrigatório' });
    }

    if (email) {
      const existing = await statusRepository.getSubscriberByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
    }

    const subscriber = await statusRepository.createSubscriber({
      email,
      telegram_chat_id,
      notify_email: !!email,
      notify_telegram: !!telegram_chat_id,
      notify_on: notify_on || 'all',
      services: services || []
    });

    if (email) {
      const settings = await statusNotifier.getSettings();
      await statusNotifier.sendEmail(
        email,
        `Confirme sua inscrição - ${settings.site_name}`,
        `
          <h2>Confirme sua inscrição</h2>
          <p>Clique no link abaixo para confirmar sua inscrição e receber alertas de status:</p>
          <p><a href="${settings.site_url}/status/verify/${subscriber.verification_token}">Confirmar inscrição</a></p>
        `
      );
    } else {
      await statusRepository.verifySubscriber(subscriber.verification_token);
    }

    res.json({
      success: true,
      message: email ? 'Verifique seu email para confirmar a inscrição' : 'Inscrição realizada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const subscriber = await statusRepository.verifySubscriber(token);

    if (!subscriber) {
      return res.status(400).send('Token inválido ou expirado');
    }

    res.send(`
      <html>
        <head><title>Inscrição Confirmada</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>✅ Inscrição Confirmada!</h1>
          <p>Você receberá alertas sobre incidentes e manutenções.</p>
          <p><a href="/status">Voltar para página de status</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Erro ao verificar inscrição');
  }
});

router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const subscriber = await statusRepository.unsubscribe(token);

    if (!subscriber) {
      return res.status(400).send('Token inválido');
    }

    res.send(`
      <html>
        <head><title>Inscrição Cancelada</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Inscrição Cancelada</h1>
          <p>Você não receberá mais alertas de status.</p>
          <p><a href="/status">Voltar para página de status</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Erro ao cancelar inscrição');
  }
});

router.get('/api/services', async (req, res) => {
  try {
    const services = await statusRepository.getAllServices();
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
