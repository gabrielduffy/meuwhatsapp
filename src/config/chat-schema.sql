-- =====================================================
-- WHATSBENEMAX - CHAT INTERNO
-- =====================================================

-- =====================================================
-- CONVERSAS DO CHAT
-- =====================================================

CREATE TABLE IF NOT EXISTS conversas_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  instancia_id UUID,  -- Referência à tabela instances (instance_name)
  contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) DEFAULT 'aberta',

  -- Atribuição
  atribuido_para UUID REFERENCES usuarios(id),
  departamento VARCHAR(100),

  -- Contadores
  nao_lidas INTEGER DEFAULT 0,
  total_mensagens INTEGER DEFAULT 0,

  -- Timestamps
  ultima_mensagem_em TIMESTAMP,
  primeira_resposta_em TIMESTAMP,
  resolvida_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Mensagens do chat
CREATE TABLE IF NOT EXISTS mensagens_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES conversas_chat(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Identificador WhatsApp
  whatsapp_mensagem_id VARCHAR(100),

  -- Direção
  direcao VARCHAR(10) NOT NULL,

  -- Remetente (se saída)
  remetente_id UUID REFERENCES usuarios(id),
  tipo_remetente VARCHAR(20),

  -- Conteúdo
  tipo_mensagem VARCHAR(20) NOT NULL,
  conteudo TEXT,
  midia_url VARCHAR(500),
  midia_tipo VARCHAR(100),
  midia_nome_arquivo VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'enviada',

  -- Metadados
  metadados JSONB DEFAULT '{}',

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INTEGRAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS integracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,

  -- Configurações
  configuracoes JSONB DEFAULT '{}',

  -- Status
  ativo BOOLEAN DEFAULT true,
  ultimo_uso_em TIMESTAMP,

  -- Estatísticas
  total_requisicoes INTEGER DEFAULT 0,
  requisicoes_sucesso INTEGER DEFAULT 0,
  requisicoes_erro INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Logs de integrações
CREATE TABLE IF NOT EXISTS logs_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID REFERENCES integracoes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo_evento VARCHAR(50),
  direcao VARCHAR(20),

  url VARCHAR(500),
  metodo VARCHAR(10),

  payload_enviado JSONB,
  payload_recebido JSONB,

  codigo_http INTEGER,
  status VARCHAR(20),

  duracao_ms INTEGER,
  mensagem_erro TEXT,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversas_chat_empresa ON conversas_chat(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_chat_contato ON conversas_chat(contato_id);
CREATE INDEX IF NOT EXISTS idx_conversas_chat_atribuido ON conversas_chat(atribuido_para);
CREATE INDEX IF NOT EXISTS idx_conversas_chat_status ON conversas_chat(status);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens_chat(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado ON mensagens_chat(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_id ON mensagens_chat(whatsapp_mensagem_id);

CREATE INDEX IF NOT EXISTS idx_integracoes_empresa ON integracoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_integracoes_tipo ON integracoes(tipo);

CREATE INDEX IF NOT EXISTS idx_logs_integracao ON logs_integracao(integracao_id, criado_em DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_conversas_chat_atualizado
  BEFORE UPDATE ON conversas_chat
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_integracoes_atualizado
  BEFORE UPDATE ON integracoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE conversas_chat IS 'Conversas do chat interno';
COMMENT ON TABLE mensagens_chat IS 'Mensagens das conversas';
COMMENT ON TABLE integracoes IS 'Integrações externas (webhooks, APIs)';
COMMENT ON TABLE logs_integracao IS 'Logs de requisições das integrações';
