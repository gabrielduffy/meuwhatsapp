const { query } = require('../config/database');
const crypto = require('crypto');

const statusRepository = {
  // === SERVICES ===
  async getServiceBySlug(slug) {
    const result = await query('SELECT * FROM status_services WHERE slug = $1', [slug]);
    return result.rows[0];
  },

  async getAllServices() {
    const result = await query('SELECT * FROM status_services WHERE enabled = true ORDER BY display_order');
    return result.rows;
  },

  async getCurrentStatus() {
    const result = await query(`
      SELECT DISTINCT ON (s.id)
        s.id, s.name, s.slug, s.description,
        c.status, c.response_time_ms, c.checked_at
      FROM status_services s
      LEFT JOIN status_checks c ON c.service_id = s.id
      WHERE s.enabled = true
      ORDER BY s.id, c.checked_at DESC
    `);
    return result.rows;
  },

  // === CHECKS ===
  async saveCheck(serviceSlug, result) {
    const service = await this.getServiceBySlug(serviceSlug);
    if (!service) return null;

    await query(`
      INSERT INTO status_checks (service_id, status, response_time_ms, http_code, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [service.id, result.status, result.responseTime, result.httpCode, result.error]);

    return true;
  },

  async getLastCheckByService(serviceId) {
    const result = await query(`
      SELECT * FROM status_checks
      WHERE service_id = $1
      ORDER BY checked_at DESC
      LIMIT 1
    `, [serviceId]);
    return result.rows[0];
  },

  // === UPTIME ===
  async getUptimeHistory(serviceId, days = 90) {
    const result = await query(`
      SELECT date, uptime_percentage, total_checks, successful_checks, failed_checks, avg_response_time_ms
      FROM status_daily_stats
      WHERE service_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date ASC
    `, [serviceId]);
    return result.rows;
  },

  async getOverallUptime(serviceId, days = 90) {
    const result = await query(`
      SELECT COALESCE(
        ROUND(SUM(successful_checks)::numeric / NULLIF(SUM(total_checks), 0) * 100, 3),
        100
      ) as uptime
      FROM status_daily_stats
      WHERE service_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
    `, [serviceId]);
    return result.rows[0]?.uptime || 100;
  },

  async aggregateDailyStats(serviceId, date) {
    await query(`
      INSERT INTO status_daily_stats
        (service_id, date, total_checks, successful_checks, failed_checks, avg_response_time_ms, uptime_percentage)
      SELECT
        $1, $2::date, COUNT(*),
        COUNT(*) FILTER (WHERE status = 'operational'),
        COUNT(*) FILTER (WHERE status IN ('outage', 'degraded')),
        AVG(response_time_ms)::integer,
        ROUND(COUNT(*) FILTER (WHERE status = 'operational')::numeric / NULLIF(COUNT(*), 0) * 100, 3)
      FROM status_checks
      WHERE service_id = $1 AND checked_at::date = $2::date
      ON CONFLICT (service_id, date) DO UPDATE SET
        total_checks = EXCLUDED.total_checks,
        successful_checks = EXCLUDED.successful_checks,
        failed_checks = EXCLUDED.failed_checks,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        uptime_percentage = EXCLUDED.uptime_percentage
    `, [serviceId, date]);
  },

  // === INCIDENTS ===
  async createIncident(serviceId, title, description, severity = 'minor') {
    const result = await query(`
      INSERT INTO status_incidents (service_id, title, description, severity)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [serviceId, title, description, severity]);

    await query(`
      INSERT INTO status_incident_updates (incident_id, status, message)
      VALUES ($1, 'investigating', 'Incidente detectado. Investigando...')
    `, [result.rows[0].id]);

    return result.rows[0];
  },

  async updateIncident(incidentId, status, message) {
    const resolvedAt = status === 'resolved' ? 'NOW()' : 'NULL';

    await query(`
      UPDATE status_incidents
      SET status = $2, updated_at = NOW(), resolved_at = ${resolvedAt}
      WHERE id = $1
    `, [incidentId, status]);

    await query(`
      INSERT INTO status_incident_updates (incident_id, status, message)
      VALUES ($1, $2, $3)
    `, [incidentId, status, message]);
  },

  async getActiveIncidents() {
    const result = await query(`
      SELECT i.*, s.name as service_name, s.slug as service_slug
      FROM status_incidents i
      JOIN status_services s ON s.id = i.service_id
      WHERE i.status != 'resolved'
      ORDER BY i.started_at DESC
    `);
    return result.rows;
  },

  async getActiveIncidentsByService(serviceId) {
    const result = await query(`
      SELECT * FROM status_incidents
      WHERE service_id = $1 AND status != 'resolved'
    `, [serviceId]);
    return result.rows;
  },

  async getIncidentHistory(limit = 20) {
    const result = await query(`
      SELECT i.*, s.name as service_name, s.slug as service_slug
      FROM status_incidents i
      JOIN status_services s ON s.id = i.service_id
      ORDER BY i.started_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  async getIncidentById(id) {
    const result = await query(`
      SELECT i.*, s.name as service_name, s.slug as service_slug
      FROM status_incidents i
      JOIN status_services s ON s.id = i.service_id
      WHERE i.id = $1
    `, [id]);
    return result.rows[0];
  },

  async getIncidentUpdates(incidentId) {
    const result = await query(`
      SELECT * FROM status_incident_updates
      WHERE incident_id = $1
      ORDER BY created_at ASC
    `, [incidentId]);
    return result.rows;
  },

  // === MAINTENANCES ===
  async createMaintenance(title, description, affectedServices, scheduledStart, scheduledEnd) {
    const result = await query(`
      INSERT INTO status_maintenances (title, description, affected_services, scheduled_start, scheduled_end)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, description, affectedServices, scheduledStart, scheduledEnd]);
    return result.rows[0];
  },

  async updateMaintenanceStatus(id, status) {
    await query(`
      UPDATE status_maintenances
      SET status = $2, updated_at = NOW()
      WHERE id = $1
    `, [id, status]);
  },

  async getScheduledMaintenances() {
    const result = await query(`
      SELECT * FROM status_maintenances
      WHERE scheduled_end > NOW() OR status = 'in_progress'
      ORDER BY scheduled_start ASC
    `);
    return result.rows;
  },

  async getMaintenanceHistory(limit = 20) {
    const result = await query(`
      SELECT * FROM status_maintenances
      ORDER BY scheduled_start DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // === SUBSCRIBERS ===
  async createSubscriber(data) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    const result = await query(`
      INSERT INTO status_subscribers
        (email, telegram_chat_id, notify_email, notify_telegram, notify_on, services, verification_token, unsubscribe_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.email, data.telegram_chat_id,
      data.notify_email !== false, data.notify_telegram === true,
      data.notify_on || 'all', data.services || [],
      verificationToken, unsubscribeToken
    ]);
    return result.rows[0];
  },

  async verifySubscriber(token) {
    const result = await query(`
      UPDATE status_subscribers
      SET verified = true, verification_token = NULL
      WHERE verification_token = $1
      RETURNING *
    `, [token]);
    return result.rows[0];
  },

  async unsubscribe(token) {
    const result = await query(`
      DELETE FROM status_subscribers
      WHERE unsubscribe_token = $1
      RETURNING *
    `, [token]);
    return result.rows[0];
  },

  async getSubscriberByEmail(email) {
    const result = await query('SELECT * FROM status_subscribers WHERE email = $1', [email]);
    return result.rows[0];
  },

  // === CLEANUP ===
  async cleanOldChecks() {
    await query(`DELETE FROM status_checks WHERE checked_at < NOW() - INTERVAL '7 days'`);
  },

  async cleanOldNotifications() {
    await query(`DELETE FROM status_notifications WHERE created_at < NOW() - INTERVAL '30 days'`);
  }
};

module.exports = statusRepository;
