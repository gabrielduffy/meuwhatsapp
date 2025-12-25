const { query } = require('../config/database');
const { redis } = require('../config/redis');

const statusMonitor = {
  async checkApi() {
    const start = Date.now();
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/health`, {
        signal: AbortSignal.timeout(10000)
      });
      return {
        status: response.ok ? 'operational' : 'degraded',
        responseTime: Date.now() - start,
        httpCode: response.status
      };
    } catch (error) {
      return {
        status: 'outage',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  },

  async checkDatabase() {
    const start = Date.now();
    try {
      await query('SELECT 1');
      return { status: 'operational', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'outage', responseTime: Date.now() - start, error: error.message };
    }
  },

  async checkRedis() {
    const start = Date.now();
    try {
      await redis.ping();
      return { status: 'operational', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'outage', responseTime: Date.now() - start, error: error.message };
    }
  },

  async checkWhatsApp() {
    const start = Date.now();
    try {
      const { getAllInstances } = require('./whatsapp');
      const instances = getAllInstances();
      const total = Object.keys(instances).length;
      const connected = Object.values(instances).filter(i => i.isConnected).length;

      let status = 'operational';
      if (total === 0) status = 'operational';
      else if (connected === 0) status = 'outage';
      else if (connected < total) status = 'degraded';

      return { status, responseTime: Date.now() - start, details: { total, connected } };
    } catch (error) {
      return { status: 'outage', responseTime: Date.now() - start, error: error.message };
    }
  },

  async checkWebhooks() {
    const start = Date.now();
    try {
      const result = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'success') as success,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM webhook_logs
        WHERE created_at > NOW() - INTERVAL '5 minutes'
      `);

      const { success, failed } = result.rows[0];
      const total = parseInt(success || 0) + parseInt(failed || 0);

      let status = 'operational';
      if (total > 0) {
        const successRate = parseInt(success || 0) / total;
        if (successRate < 0.5) status = 'outage';
        else if (successRate < 0.9) status = 'degraded';
      }

      return { status, responseTime: Date.now() - start, details: { success: parseInt(success || 0), failed: parseInt(failed || 0) } };
    } catch (error) {
      return { status: 'unknown', responseTime: Date.now() - start, error: error.message };
    }
  },

  async checkScheduler() {
    const start = Date.now();
    try {
      const result = await query(`
        SELECT COUNT(*) as stuck
        FROM scheduled_messages
        WHERE status = 'pending' AND scheduled_time < NOW() - INTERVAL '5 minutes'
      `);

      const stuck = parseInt(result.rows[0]?.stuck || 0);
      return { status: stuck > 10 ? 'degraded' : 'operational', responseTime: Date.now() - start, details: { stuck } };
    } catch (error) {
      return { status: 'unknown', responseTime: Date.now() - start, error: error.message };
    }
  },

  async checkBroadcast() {
    const start = Date.now();
    try {
      const result = await query(`
        SELECT COUNT(*) as stuck
        FROM broadcast_campaigns
        WHERE status = 'running' AND started_at < NOW() - INTERVAL '1 hour'
      `);

      const stuck = parseInt(result.rows[0]?.stuck || 0);
      return { status: stuck > 0 ? 'degraded' : 'operational', responseTime: Date.now() - start, details: { stuck } };
    } catch (error) {
      return { status: 'unknown', responseTime: Date.now() - start, error: error.message };
    }
  },

  async runAllChecks() {
    return {
      api: await this.checkApi(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      whatsapp: await this.checkWhatsApp(),
      webhooks: await this.checkWebhooks(),
      scheduler: await this.checkScheduler(),
      broadcast: await this.checkBroadcast()
    };
  },

  async detectAndNotify(currentResults, previousResults) {
    const statusNotifier = require('./statusNotifier');
    const statusRepository = require('../repositories/statusRepository');

    for (const [slug, current] of Object.entries(currentResults)) {
      const previous = previousResults?.[slug];

      // Detectar mudança para pior
      if (previous?.status === 'operational' && current.status !== 'operational') {
        const service = await statusRepository.getServiceBySlug(slug);
        if (service) {
          const incident = await statusRepository.createIncident(
            service.id,
            `${service.name} com problemas`,
            `O serviço ${service.name} está ${current.status === 'outage' ? 'fora do ar' : 'degradado'}. ${current.error || ''}`,
            current.status === 'outage' ? 'critical' : 'minor'
          );

          await statusNotifier.notifyIncidentCreated(incident, service);
        }
      }

      // Detectar restauração
      if (previous?.status !== 'operational' && current.status === 'operational') {
        const service = await statusRepository.getServiceBySlug(slug);
        if (service) {
          const activeIncidents = await statusRepository.getActiveIncidentsByService(service.id);
          for (const incident of activeIncidents) {
            await statusRepository.updateIncident(incident.id, 'resolved', 'Serviço restaurado automaticamente.');
            await statusNotifier.notifyIncidentResolved(incident, service);
          }
        }
      }
    }
  }
};

module.exports = statusMonitor;
