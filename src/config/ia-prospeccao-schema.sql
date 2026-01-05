-- =====================================================
-- WHATSBENEMAX - AGENTE IA E PROSPECÇÃO
-- =====================================================

-- =====================================================
-- AGENTE IA
-- =====================================================

CREATE TABLE IF NOT EXISTS agentes_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  instancia_id VARCHAR(255),  -- Nome da instância do WhatsApp

  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT false,

  -- Personalidade
  personalidade TEXT,
  tom_de_voz VARCHAR(50) DEFAULT 'profissional',
  area_expertise TEXT,

  -- Regras
  regras_gerais TEXT,
  etapas_atendimento JSONB DEFAULT '[]',
  perguntas_frequentes JSONB DEFAULT '[]',

  -- Gatilhos
  gatilhos JSONB DEFAULT '[]',

  -- Configurações
  configuracoes JSONB DEFAULT '{}',

  -- Modelos de mensagens
  modelos_mensagem JSONB DEFAULT '{}',

  -- Estatísticas
  total_conversas INTEGER DEFAULT 0,
  total_mensagens INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Conversas do agente IA
CREATE TABLE IF NOT EXISTS conversas_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id UUID REFERENCES agentes_ia(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  numero_contato VARCHAR(50) NOT NULL,
  nome_contato VARCHAR(200),

  status VARCHAR(20) DEFAULT 'ativa',
  transferida_para UUID REFERENCES usuarios(id),

  quantidade_mensagens INTEGER DEFAULT 0,
  tokens_usados INTEGER DEFAULT 0,

  iniciada_em TIMESTAMP DEFAULT NOW(),
  ultima_mensagem_em TIMESTAMP,
  encerrada_em TIMESTAMP
);

-- Mensagens da conversa IA
CREATE TABLE IF NOT EXISTS mensagens_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas_ia(id) ON DELETE CASCADE,

  papel VARCHAR(20) NOT NULL,
  conteudo TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PROSPECÇÃO
-- =====================================================

-- Campanhas de prospecção
CREATE TABLE IF NOT EXISTS campanhas_prospeccao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  instancia_id VARCHAR(255),  -- Nome da instância do WhatsApp

  nome VARCHAR(200) NOT NULL,

  -- Filtros de busca
  segmento VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(50),
  filtros_adicionais JSONB DEFAULT '{}',

  -- Mensagem
  modelo_mensagem TEXT NOT NULL,
  variaveis_mensagem JSONB DEFAULT '[]',

  -- Configurações de disparo
  configuracoes JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'rascunho',

  -- Progresso
  total_leads INTEGER DEFAULT 0,
  enviados INTEGER DEFAULT 0,
  entregues INTEGER DEFAULT 0,
  lidos INTEGER DEFAULT 0,
  respondidos INTEGER DEFAULT 0,
  falharam INTEGER DEFAULT 0,

  iniciada_em TIMESTAMP,
  concluida_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Leads da prospecção
CREATE TABLE IF NOT EXISTS leads_prospeccao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES campanhas_prospeccao(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Dados do lead
  nome VARCHAR(200),
  telefone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  empresa_lead VARCHAR(200),
  origem VARCHAR(100),

  -- Status do disparo
  status VARCHAR(20) DEFAULT 'pendente',

  enviado_em TIMESTAMP,
  entregue_em TIMESTAMP,
  lido_em TIMESTAMP,
  respondido_em TIMESTAMP,

  mensagem_erro TEXT,

  -- Dados extras
  metadados JSONB DEFAULT '{}',

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Importações de leads
CREATE TABLE IF NOT EXISTS importacoes_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES campanhas_prospeccao(id),

  nome_arquivo VARCHAR(255),
  total_linhas INTEGER DEFAULT 0,
  linhas_importadas INTEGER DEFAULT 0,
  linhas_falharam INTEGER DEFAULT 0,

  status VARCHAR(20) DEFAULT 'processando',
  erros JSONB DEFAULT '[]',

  criado_em TIMESTAMP DEFAULT NOW(),
  concluida_em TIMESTAMP
);

-- =====================================================
-- CONTATOS (CRM)
-- =====================================================

CREATE TABLE IF NOT EXISTS contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  telefone VARCHAR(50) NOT NULL,
  nome VARCHAR(200),
  nome_push VARCHAR(200),
  avatar_url VARCHAR(500),
  email VARCHAR(255),
  empresa VARCHAR(255),
  cargo VARCHAR(255),

  -- Organização
  etiquetas JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  atribuido_para UUID REFERENCES usuarios(id),

  -- Status
  bloqueado BOOLEAN DEFAULT false,

  -- Metadados
  metadados JSONB DEFAULT '{}',
  campos_customizados JSONB DEFAULT '{}',
  observacoes TEXT,

  ultima_mensagem_em TIMESTAMP,
  ultima_interacao_em TIMESTAMP,
  tipo_ultima_interacao VARCHAR(50),
  total_interacoes INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(empresa_id, telefone)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_agentes_empresa ON agentes_ia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agentes_instancia ON agentes_ia(instancia_id);

CREATE INDEX IF NOT EXISTS idx_conversas_ia_agente ON conversas_ia(agente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_contato ON conversas_ia(numero_contato);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_status ON conversas_ia(status);

CREATE INDEX IF NOT EXISTS idx_mensagens_ia_conversa ON mensagens_ia(conversa_id);

CREATE INDEX IF NOT EXISTS idx_campanhas_empresa ON campanhas_prospeccao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas_prospeccao(status);

CREATE INDEX IF NOT EXISTS idx_leads_campanha ON leads_prospeccao(campanha_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads_prospeccao(status);
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads_prospeccao(telefone);

CREATE INDEX IF NOT EXISTS idx_importacoes_empresa ON importacoes_leads(empresa_id);

CREATE INDEX IF NOT EXISTS idx_contatos_empresa ON contatos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contatos_telefone ON contatos(telefone);
CREATE INDEX IF NOT EXISTS idx_contatos_atribuido ON contatos(atribuido_para);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_agentes_atualizado
  BEFORE UPDATE ON agentes_ia
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_campanhas_atualizado
  BEFORE UPDATE ON campanhas_prospeccao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_leads_atualizado
  BEFORE UPDATE ON leads_prospeccao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_contatos_atualizado
  BEFORE UPDATE ON contatos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE agentes_ia IS 'Agentes de IA configurados por empresa';
COMMENT ON TABLE conversas_ia IS 'Conversas sendo atendidas pelo agente IA';
COMMENT ON TABLE mensagens_ia IS 'Mensagens das conversas com IA';
COMMENT ON TABLE campanhas_prospeccao IS 'Campanhas de prospecção/disparo';
COMMENT ON TABLE leads_prospeccao IS 'Leads de cada campanha';
COMMENT ON TABLE importacoes_leads IS 'Importações em lote de leads';
COMMENT ON TABLE contatos IS 'Contatos do CRM';
