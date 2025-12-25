const nodemailer = require('nodemailer');
const { query } = require('../config/database');

const statusNotifier = {
  async getSettings() {
    const result = await query('SELECT key, value FROM status_settings');
    const settings = {};
    result.rows.forEach(row => settings[row.key] = row.value);
    return settings;
  },

  async getEmailTransporter() {
    const settings = await this.getSettings();
    if (!settings.smtp_host || !settings.smtp_user) return null;

    return nodemailer.createTransporter({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port) || 587,
      secure: settings.smtp_port === '465',
      auth: { user: settings.smtp_user, pass: settings.smtp_pass }
    });
  },

  async getSubscribersToNotify(serviceId, severity) {
    const result = await query(`
      SELECT * FROM status_subscribers
      WHERE verified = true
      AND (services = '{}' OR $1 = ANY(services))
      AND (
        notify_on = 'all'
        OR (notify_on = 'outage_only' AND $2 IN ('critical', 'major'))
        OR (notify_on = 'major_only' AND $2 IN ('critical', 'major'))
      )
    `, [serviceId, severity]);
    return result.rows;
  },

  async sendEmail(to, subject, html) {
    try {
      const transporter = await this.getEmailTransporter();
      if (!transporter) {
        console.log('[Status] Email não configurado');
        return false;
      }

      const settings = await this.getSettings();
      await transporter.sendMail({
        from: `"${settings.site_name}" <${settings.smtp_from}>`,
        to, subject, html
      });

      return true;
    } catch (error) {
      console.error('[Status] Erro ao enviar email:', error.message);
      return false;
    }
  },

  async sendTelegram(chatId, message) {
    // Telegram desabilitado - apenas email é suportado
    console.log('[Status] Telegram desabilitado - notificação ignorada');
    return false;
  },

  async notifyIncidentCreated(incident, service) {
    const subscribers = await this.getSubscribersToNotify(service.id, incident.severity);
    const settings = await this.getSettings();

    for (const subscriber of subscribers) {
      if (subscriber.notify_email && subscriber.email) {
        const html = `
          <h2>⚠️ Incidente Detectado</h2>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Status:</strong> ${incident.status}</p>
          <p><strong>Severidade:</strong> ${incident.severity}</p>
          <p><strong>Descrição:</strong> ${incident.description}</p>
          <p><strong>Início:</strong> ${new Date(incident.started_at).toLocaleString('pt-BR')}</p>
          <hr>
          <p><a href="${settings.site_url}/status">Ver página de status</a></p>
          <p><small><a href="${settings.site_url}/status/unsubscribe/${subscriber.unsubscribe_token}">Cancelar inscrição</a></small></p>
        `;

        const sent = await this.sendEmail(
          subscriber.email,
          `⚠️ [${settings.site_name}] ${service.name} - ${incident.title}`,
          html
        );

        await this.logNotification(subscriber.id, incident.id, null, 'incident_created', 'email', sent);
      }

      if (subscriber.notify_telegram && subscriber.telegram_chat_id) {
        const message = `
⚠️ <b>Incidente Detectado</b>

<b>Serviço:</b> ${service.name}
<b>Status:</b> ${incident.status}
<b>Severidade:</b> ${incident.severity}
<b>Descrição:</b> ${incident.description}

🔗 ${settings.site_url}/status
        `.trim();

        const sent = await this.sendTelegram(subscriber.telegram_chat_id, message);
        await this.logNotification(subscriber.id, incident.id, null, 'incident_created', 'telegram', sent);
      }
    }
  },

  async notifyIncidentResolved(incident, service) {
    const subscribers = await this.getSubscribersToNotify(service.id, incident.severity);
    const settings = await this.getSettings();

    for (const subscriber of subscribers) {
      if (subscriber.notify_email && subscriber.email) {
        const html = `
          <h2>✅ Incidente Resolvido</h2>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Incidente:</strong> ${incident.title}</p>
          <p><strong>Resolvido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p>O serviço voltou a operar normalmente.</p>
          <hr>
          <p><a href="${settings.site_url}/status">Ver página de status</a></p>
        `;

        const sent = await this.sendEmail(
          subscriber.email,
          `✅ [${settings.site_name}] ${service.name} - Incidente Resolvido`,
          html
        );

        await this.logNotification(subscriber.id, incident.id, null, 'incident_resolved', 'email', sent);
      }

      if (subscriber.notify_telegram && subscriber.telegram_chat_id) {
        const message = `
✅ <b>Incidente Resolvido</b>

<b>Serviço:</b> ${service.name}
<b>Incidente:</b> ${incident.title}

O serviço voltou a operar normalmente.

🔗 ${settings.site_url}/status
        `.trim();

        const sent = await this.sendTelegram(subscriber.telegram_chat_id, message);
        await this.logNotification(subscriber.id, incident.id, null, 'incident_resolved', 'telegram', sent);
      }
    }
  },

  async notifyMaintenanceScheduled(maintenance) {
    const result = await query('SELECT * FROM status_subscribers WHERE verified = true');
    const subscribers = result.rows;
    const settings = await this.getSettings();

    let affectedServices = 'Todos os serviços';
    if (maintenance.affected_services && maintenance.affected_services.length > 0) {
      const servicesResult = await query(
        'SELECT name FROM status_services WHERE id = ANY($1)',
        [maintenance.affected_services]
      );
      affectedServices = servicesResult.rows.map(s => s.name).join(', ');
    }

    for (const subscriber of subscribers) {
      if (subscriber.notify_email && subscriber.email) {
        const html = `
          <h2>🔧 Manutenção Agendada</h2>
          <p><strong>Título:</strong> ${maintenance.title}</p>
          <p><strong>Descrição:</strong> ${maintenance.description || 'N/A'}</p>
          <p><strong>Serviços afetados:</strong> ${affectedServices}</p>
          <p><strong>Início:</strong> ${new Date(maintenance.scheduled_start).toLocaleString('pt-BR')}</p>
          <p><strong>Término previsto:</strong> ${new Date(maintenance.scheduled_end).toLocaleString('pt-BR')}</p>
          <hr>
          <p><a href="${settings.site_url}/status/maintenance">Ver manutenções</a></p>
        `;

        const sent = await this.sendEmail(
          subscriber.email,
          `🔧 [${settings.site_name}] Manutenção Agendada - ${maintenance.title}`,
          html
        );

        await this.logNotification(subscriber.id, null, maintenance.id, 'maintenance_scheduled', 'email', sent);
      }
    }
  },

  async logNotification(subscriberId, incidentId, maintenanceId, type, channel, success) {
    await query(`
      INSERT INTO status_notifications
        (subscriber_id, incident_id, maintenance_id, type, channel, status, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      subscriberId, incidentId, maintenanceId, type, channel,
      success ? 'sent' : 'failed',
      success ? new Date() : null
    ]);
  }
};

module.exports = statusNotifier;
