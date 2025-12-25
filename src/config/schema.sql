-- WhatsBenemax v2.1 - Schema PostgreSQL
-- Criado em: 2025-12-25

-- ========== TABELA: instances ==========
-- Armazena as instâncias do WhatsApp
CREATE TABLE IF NOT EXISTS instances (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'disconnected', -- disconnected, connecting, connected, qr
  qr_code TEXT,
  phone_number VARCHAR(20),
  webhook_url TEXT,
  webhook_events JSONB DEFAULT '["all"]'::jsonb,
  proxy_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_connected_at TIMESTAMP,
  session_data JSONB -- Para armazenar dados da sessão Baileys
);

CREATE INDEX idx_instances_name ON instances(instance_name);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_phone ON instances(phone_number);

-- ========== TABELA: metrics ==========
-- Armazena métricas de uso das instâncias
CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- messages_sent, messages_received, groups_joined, etc
  value INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  period_start TIMESTAMP,
  period_end TIMESTAMP
);

CREATE INDEX idx_metrics_instance ON metrics(instance_name);
CREATE INDEX idx_metrics_type ON metrics(metric_type);
CREATE INDEX idx_metrics_created ON metrics(created_at);
CREATE INDEX idx_metrics_period ON metrics(period_start, period_end);

-- ========== TABELA: scheduled_messages ==========
-- Armazena mensagens agendadas
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  media_url TEXT,
  media_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE
);

CREATE INDEX idx_scheduled_instance ON scheduled_messages(instance_name);
CREATE INDEX idx_scheduled_status ON scheduled_messages(status);
CREATE INDEX idx_scheduled_time ON scheduled_messages(scheduled_time);

-- ========== TABELA: broadcast_campaigns ==========
-- Armazena campanhas de broadcast
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL, -- Array de números
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  delay_between_messages INTEGER DEFAULT 1000,
  media_url TEXT,
  media_type VARCHAR(50),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE
);

CREATE INDEX idx_broadcast_instance ON broadcast_campaigns(instance_name);
CREATE INDEX idx_broadcast_status ON broadcast_campaigns(status);
CREATE INDEX idx_broadcast_created ON broadcast_campaigns(created_at);

-- ========== TABELA: autoresponder_configs ==========
-- Configurações de auto-resposta com IA
CREATE TABLE IF NOT EXISTS autoresponder_configs (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) DEFAULT 'all', -- all, keyword, private, group
  keywords JSONB DEFAULT '[]'::jsonb,
  ai_model VARCHAR(50) DEFAULT 'mixtral-8x7b-32768',
  system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  context_window INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE,
  UNIQUE(instance_name)
);

CREATE INDEX idx_autoresponder_instance ON autoresponder_configs(instance_name);
CREATE INDEX idx_autoresponder_enabled ON autoresponder_configs(enabled);

-- ========== TABELA: autoresponder_history ==========
-- Histórico de interações da IA
CREATE TABLE IF NOT EXISTS autoresponder_history (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  chat_id VARCHAR(255) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model_used VARCHAR(50),
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE
);

CREATE INDEX idx_autoresponder_history_instance ON autoresponder_history(instance_name);
CREATE INDEX idx_autoresponder_history_chat ON autoresponder_history(chat_id);
CREATE INDEX idx_autoresponder_history_created ON autoresponder_history(created_at);

-- ========== TABELA: webhook_configs ==========
-- Configurações avançadas de webhooks
CREATE TABLE IF NOT EXISTS webhook_configs (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  event_types JSONB DEFAULT '["all"]'::jsonb,
  headers JSONB DEFAULT '{}'::jsonb,
  max_retries INTEGER DEFAULT 3,
  retry_delay INTEGER DEFAULT 5000,
  backoff_multiplier DECIMAL(3,2) DEFAULT 2.0,
  timeout INTEGER DEFAULT 30000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE,
  UNIQUE(instance_name)
);

CREATE INDEX idx_webhook_configs_instance ON webhook_configs(instance_name);
CREATE INDEX idx_webhook_configs_enabled ON webhook_configs(enabled);

-- ========== TABELA: webhook_logs ==========
-- Logs de envio de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL, -- success, error, failed
  status_code INTEGER,
  attempt INTEGER DEFAULT 1,
  duration_ms INTEGER,
  error_message TEXT,
  error_type VARCHAR(50),
  response_body TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_logs_instance ON webhook_logs(instance_name);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);

-- ========== TABELA: contacts ==========
-- Gerenciamento de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE,
  UNIQUE(instance_name, phone_number)
);

CREATE INDEX idx_contacts_instance ON contacts(instance_name);
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_blocked ON contacts(is_blocked);

-- ========== TABELA: warming_configs ==========
-- Configurações de aquecimento de números
CREATE TABLE IF NOT EXISTS warming_configs (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  daily_limit INTEGER DEFAULT 50,
  current_daily_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  warmup_stage INTEGER DEFAULT 1, -- 1-5
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE,
  UNIQUE(instance_name)
);

CREATE INDEX idx_warming_configs_instance ON warming_configs(instance_name);
CREATE INDEX idx_warming_configs_enabled ON warming_configs(enabled);

-- ========== TABELA: warming_stats ==========
-- Estatísticas de aquecimento
CREATE TABLE IF NOT EXISTS warming_stats (
  id SERIAL PRIMARY KEY,
  instance_name VARCHAR(255) NOT NULL,
  stat_date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  stage INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (instance_name) REFERENCES instances(instance_name) ON DELETE CASCADE,
  UNIQUE(instance_name, stat_date)
);

CREATE INDEX idx_warming_stats_instance ON warming_stats(instance_name);
CREATE INDEX idx_warming_stats_date ON warming_stats(stat_date);

-- ========== FUNÇÕES AUXILIARES ==========

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autoresponder_configs_updated_at BEFORE UPDATE ON autoresponder_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at BEFORE UPDATE ON webhook_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warming_configs_updated_at BEFORE UPDATE ON warming_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== VIEWS ÚTEIS ==========

-- View: Instâncias ativas
CREATE OR REPLACE VIEW active_instances AS
SELECT
  instance_name,
  status,
  phone_number,
  last_connected_at,
  created_at
FROM instances
WHERE status = 'connected';

-- View: Estatísticas de broadcast
CREATE OR REPLACE VIEW broadcast_stats AS
SELECT
  instance_name,
  COUNT(*) as total_campaigns,
  SUM(sent_count) as total_messages_sent,
  SUM(failed_count) as total_messages_failed,
  AVG(sent_count::DECIMAL / NULLIF(total_recipients, 0) * 100) as avg_success_rate
FROM broadcast_campaigns
GROUP BY instance_name;

-- View: Estatísticas de webhook
CREATE OR REPLACE VIEW webhook_stats AS
SELECT
  instance_name,
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN status = 'error' OR status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
  AVG(duration_ms) as avg_duration_ms
FROM webhook_logs
GROUP BY instance_name, DATE(created_at);

-- ========== COMENTÁRIOS ==========

COMMENT ON TABLE instances IS 'Armazena todas as instâncias do WhatsApp conectadas';
COMMENT ON TABLE metrics IS 'Métricas de uso e performance das instâncias';
COMMENT ON TABLE scheduled_messages IS 'Mensagens agendadas para envio futuro';
COMMENT ON TABLE broadcast_campaigns IS 'Campanhas de envio em massa';
COMMENT ON TABLE autoresponder_configs IS 'Configurações de auto-resposta com IA';
COMMENT ON TABLE autoresponder_history IS 'Histórico de conversas com IA';
COMMENT ON TABLE webhook_configs IS 'Configurações avançadas de webhooks';
COMMENT ON TABLE webhook_logs IS 'Logs de todas as chamadas de webhook';
COMMENT ON TABLE contacts IS 'Gerenciamento de contatos por instância';
COMMENT ON TABLE warming_configs IS 'Configurações de aquecimento de números';
COMMENT ON TABLE warming_stats IS 'Estatísticas diárias de aquecimento';
