-- =====================================================
-- WHATSBENEMAX - MÓDULO DE EMAIL MARKETING
-- =====================================================

-- Conexões SMTP por empresa
CREATE TABLE IF NOT EXISTS conexoes_smtp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  nome VARCHAR(100) NOT NULL,
  host VARCHAR(255) NOT NULL,
  porta INTEGER NOT NULL DEFAULT 587,
  usuario VARCHAR(255) NOT NULL,
  senha TEXT NOT NULL, -- Criptografada simetricamente
  secure BOOLEAN DEFAULT true,
  
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Templates de Email
CREATE TABLE IF NOT EXISTS templates_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  nome VARCHAR(200) NOT NULL,
  assunto VARCHAR(255) NOT NULL,
  corpo_html TEXT NOT NULL,
  corpo_texto TEXT,
  variaveis JSONB DEFAULT '[]',
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Campanhas de Email
CREATE TABLE IF NOT EXISTS campanhas_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conexao_smtp_id UUID REFERENCES conexoes_smtp(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates_email(id) ON DELETE SET NULL,
  
  nome VARCHAR(200) NOT NULL,
  assunto VARCHAR(255), -- Sobrescrita opcional do assunto do template
  
  status VARCHAR(20) DEFAULT 'rascunho', -- rascunho, agendada, em_andamento, concluida, cancelada, falhada
  
  -- Estatísticas
  total_leads INTEGER DEFAULT 0,
  enviados INTEGER DEFAULT 0,
  abertos INTEGER DEFAULT 0,
  clicados INTEGER DEFAULT 0,
  falhados INTEGER DEFAULT 0,
  
  agendar_para TIMESTAMP,
  iniciada_em TIMESTAMP,
  concluida_em TIMESTAMP,
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Disparos de Email (Logs e Rastreamento)
CREATE TABLE IF NOT EXISTS disparos_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES campanhas_email(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES contatos(id) ON DELETE SET NULL,
  
  email_destino VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, enviado, falhado
  mensagem_erro TEXT,
  
  aberto BOOLEAN DEFAULT false,
  clicado BOOLEAN DEFAULT false,
  
  enviado_em TIMESTAMP,
  aberto_em TIMESTAMP,
  ultima_interacao_em TIMESTAMP,
  
  tracking_id VARCHAR(100) UNIQUE, -- Para aberturas e cliques
  
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Automações de Email
CREATE TABLE IF NOT EXISTS automacoes_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  nome VARCHAR(200) NOT NULL,
  gatilho JSONB NOT NULL, -- ex: { "tipo": "novo_lead", "origem": "instagram" }
  acoes JSONB NOT NULL,   -- ex: [{ "tipo": "esperar", "tempo": "1h" }, { "tipo": "enviar_email", "template_id": "..." }]
  
  ativa BOOLEAN DEFAULT true,
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_smtp_empresa ON conexoes_smtp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_templates_empresa ON templates_email(empresa_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_email_empresa ON campanhas_email(empresa_id);
CREATE INDEX IF NOT EXISTS idx_disparos_email_campanha ON disparos_email(campanha_id);
CREATE INDEX IF NOT EXISTS idx_disparos_email_tracking ON disparos_email(tracking_id);

-- Comentários
COMMENT ON TABLE conexoes_smtp IS 'Configurações de servidores SMTP por empresa';
COMMENT ON TABLE templates_email IS 'Modelos de email reutilizáveis';
COMMENT ON TABLE campanhas_email IS 'Campanhas de disparo de email em massa';
COMMENT ON TABLE disparos_email IS 'Rastreamento individual de cada email enviado';
COMMENT ON TABLE automacoes_email IS 'Workflows automáticos de email';
