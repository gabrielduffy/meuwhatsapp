-- ==========================================================
-- SCHEMA: Sistema de Status Page
-- ==========================================================

-- Serviços monitorados
CREATE TABLE IF NOT EXISTS status_services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  endpoint VARCHAR(500),
  check_type VARCHAR(20) DEFAULT 'http',
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de checks
CREATE TABLE IF NOT EXISTS status_checks (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES status_services(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time_ms INTEGER,
  http_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP DEFAULT NOW()
);

-- Incidentes
CREATE TABLE IF NOT EXISTS status_incidents (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES status_services(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'investigating',
  severity VARCHAR(20) DEFAULT 'minor',
  started_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Atualizações de incidentes
CREATE TABLE IF NOT EXISTS status_incident_updates (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES status_incidents(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Manutenções agendadas
CREATE TABLE IF NOT EXISTS status_maintenances (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  affected_services INTEGER[] DEFAULT '{}',
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Estatísticas diárias
CREATE TABLE IF NOT EXISTS status_daily_stats (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES status_services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_checks INTEGER DEFAULT 0,
  successful_checks INTEGER DEFAULT 0,
  failed_checks INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  uptime_percentage DECIMAL(6,3),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(service_id, date)
);

-- Inscritos para alertas
CREATE TABLE IF NOT EXISTS status_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  telegram_chat_id VARCHAR(100),
  phone VARCHAR(50),
  notify_email BOOLEAN DEFAULT true,
  notify_telegram BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  notify_on VARCHAR(20) DEFAULT 'all',
  services INTEGER[] DEFAULT '{}',
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(100),
  unsubscribe_token VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de notificações
CREATE TABLE IF NOT EXISTS status_notifications (
  id SERIAL PRIMARY KEY,
  subscriber_id INTEGER REFERENCES status_subscribers(id) ON DELETE CASCADE,
  incident_id INTEGER REFERENCES status_incidents(id) ON DELETE SET NULL,
  maintenance_id INTEGER REFERENCES status_maintenances(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configurações
CREATE TABLE IF NOT EXISTS status_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- ÍNDICES
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_status_checks_service_time ON status_checks(service_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_checks_time ON status_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_daily_stats_service_date ON status_daily_stats(service_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_status_incidents_status ON status_incidents(status);
CREATE INDEX IF NOT EXISTS idx_status_incidents_dates ON status_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_subscribers_email ON status_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_status_subscribers_telegram ON status_subscribers(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_status_notifications_status ON status_notifications(status);
CREATE INDEX IF NOT EXISTS idx_status_maintenances_dates ON status_maintenances(scheduled_start, scheduled_end);

-- ==========================================================
-- DADOS INICIAIS
-- ==========================================================

INSERT INTO status_services (name, slug, description, endpoint, check_type, display_order) VALUES
('API Principal', 'api', 'Servidor principal da API REST', '/health', 'http', 1),
('PostgreSQL', 'database', 'Banco de dados principal', NULL, 'database', 2),
('Redis', 'redis', 'Cache e filas de processamento', NULL, 'redis', 3),
('WhatsApp Gateway', 'whatsapp', 'Conexão com servidores do WhatsApp', NULL, 'whatsapp', 4),
('Webhooks', 'webhooks', 'Sistema de envio de webhooks', NULL, 'internal', 5),
('Agendador', 'scheduler', 'Processamento de mensagens agendadas', NULL, 'internal', 6),
('Broadcast', 'broadcast', 'Sistema de disparo em massa', NULL, 'internal', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO status_settings (key, value) VALUES
('site_name', 'WhatsBenemax Status'),
('site_url', 'https://status.whatsbenemax.com'),
('company_name', 'WhatsBenemax'),
('support_email', 'suporte@whatsbenemax.com'),
('telegram_bot_token', ''),
('smtp_host', ''),
('smtp_port', '587'),
('smtp_user', ''),
('smtp_pass', ''),
('smtp_from', 'status@whatsbenemax.com')
ON CONFLICT (key) DO NOTHING;
