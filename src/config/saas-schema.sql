-- =====================================================
-- WHATSBENEMAX SAAS - SCHEMA COMPLETO
-- Sistema Multi-Tenant para API WhatsApp com IA
-- =====================================================

-- =====================================================
-- PLANOS E ASSINATURAS
-- =====================================================

CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  preco_mensal DECIMAL(10,2) NOT NULL,
  preco_anual DECIMAL(10,2),
  creditos_mensais INTEGER NOT NULL,
  max_usuarios INTEGER DEFAULT 1,
  max_instancias INTEGER DEFAULT 1,
  max_contatos INTEGER DEFAULT 1000,
  funcionalidades JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO planos (nome, slug, preco_mensal, preco_anual, creditos_mensais, max_usuarios, max_instancias, max_contatos, funcionalidades)
VALUES
('Starter', 'starter', 97.00, 970.00, 1000, 1, 1, 1000, '{"agente_ia": true, "crm": true, "prospeccao": false}'),
('Pro', 'pro', 197.00, 1970.00, 5000, 3, 2, 5000, '{"agente_ia": true, "crm": true, "prospeccao": true, "suporte_prioritario": true}'),
('Business', 'business', 497.00, 4970.00, 20000, 10, 5, 20000, '{"agente_ia": true, "crm": true, "prospeccao": true, "suporte_prioritario": true, "whitelabel": true, "acesso_api": true}')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- AFILIADOS
-- =====================================================

CREATE TABLE IF NOT EXISTS afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  percentual_comissao DECIMAL(5,2) DEFAULT 20.00,
  asaas_conta_id VARCHAR(100),
  asaas_carteira_id VARCHAR(100),
  kyc_status VARCHAR(20) DEFAULT 'pendente',
  kyc_dados JSONB DEFAULT '{}',
  total_ganho DECIMAL(10,2) DEFAULT 0,
  total_sacado DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EMPRESAS (TENANTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  documento VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  plano_id UUID REFERENCES planos(id),
  afiliado_id UUID REFERENCES afiliados(id),

  -- Asaas
  asaas_cliente_id VARCHAR(100),
  asaas_assinatura_id VARCHAR(100),

  -- Créditos
  saldo_creditos INTEGER DEFAULT 0,
  creditos_usados_mes INTEGER DEFAULT 0,

  -- White Label
  whitelabel_ativo BOOLEAN DEFAULT false,
  whitelabel_config JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'ativo',
  teste_termina_em TIMESTAMP,
  assinatura_termina_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- USUÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Autenticação
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,

  -- Perfil
  nome VARCHAR(200) NOT NULL,
  avatar_url VARCHAR(500),
  telefone VARCHAR(20),

  -- Função: administrador, afiliado, empresa, usuario
  funcao VARCHAR(20) DEFAULT 'usuario',
  permissoes JSONB DEFAULT '{}',

  -- Status
  ativo BOOLEAN DEFAULT true,
  email_verificado BOOLEAN DEFAULT false,
  token_verificacao_email VARCHAR(100),
  token_redefinir_senha VARCHAR(100),
  expira_token_senha TIMESTAMP,

  -- Preferências
  preferencias JSONB DEFAULT '{"tema": "claro", "idioma": "pt-BR", "notificacoes": true}',
  api_token VARCHAR(255),

  ultimo_login_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Criar constraint para afiliados (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_afiliado_usuario'
  ) THEN
    ALTER TABLE afiliados
      ADD CONSTRAINT fk_afiliado_usuario
      FOREIGN KEY (usuario_id)
      REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- SESSÕES (Refresh Tokens)
-- =====================================================

CREATE TABLE IF NOT EXISTS sessoes_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  token_atualizacao VARCHAR(500) NOT NULL,
  info_dispositivo JSONB DEFAULT '{}',
  endereco_ip VARCHAR(50),
  expira_em TIMESTAMP NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TRANSAÇÕES DE CRÉDITO
-- =====================================================

CREATE TABLE IF NOT EXISTS transacoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(20) NOT NULL,
  quantidade INTEGER NOT NULL,
  saldo_apos INTEGER NOT NULL,

  descricao TEXT,
  tipo_referencia VARCHAR(50),
  id_referencia UUID,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PAGAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  afiliado_id UUID REFERENCES afiliados(id),

  -- Asaas
  asaas_pagamento_id VARCHAR(100),
  asaas_fatura_url VARCHAR(500),

  -- Valores
  valor DECIMAL(10,2) NOT NULL,
  comissao_afiliado DECIMAL(10,2) DEFAULT 0,
  valor_liquido DECIMAL(10,2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pendente',
  metodo_pagamento VARCHAR(50),
  pago_em TIMESTAMP,

  -- Referência
  tipo_referencia VARCHAR(50),
  id_referencia UUID,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COMISSÕES DE AFILIADOS
-- =====================================================

CREATE TABLE IF NOT EXISTS comissoes_afiliado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID REFERENCES afiliados(id) ON DELETE CASCADE,
  pagamento_id UUID REFERENCES pagamentos(id),
  empresa_id UUID REFERENCES empresas(id),

  valor DECIMAL(10,2) NOT NULL,

  status VARCHAR(20) DEFAULT 'pendente',

  disponivel_em TIMESTAMP,
  sacado_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT,

  url_acao VARCHAR(500),
  texto_acao VARCHAR(100),

  lida BOOLEAN DEFAULT false,
  lida_em TIMESTAMP,

  metadados JSONB DEFAULT '{}',

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DOMÍNIOS WHITE LABEL
-- =====================================================

CREATE TABLE IF NOT EXISTS dominios_whitelabel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  dominio VARCHAR(255) UNIQUE NOT NULL,
  eh_subdominio BOOLEAN DEFAULT false,

  ssl_status VARCHAR(20) DEFAULT 'pendente',
  ssl_certificado TEXT,
  ssl_chave_privada TEXT,

  verificado BOOLEAN DEFAULT false,
  verificado_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_funcao ON usuarios(funcao);

CREATE INDEX IF NOT EXISTS idx_empresas_slug ON empresas(slug);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_afiliado ON empresas(afiliado_id);

CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes_usuario(expira_em);

CREATE INDEX IF NOT EXISTS idx_transacoes_empresa ON transacoes_credito(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_criado ON transacoes_credito(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_afiliado ON pagamentos(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);

CREATE INDEX IF NOT EXISTS idx_comissoes_afiliado ON comissoes_afiliado(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes_afiliado(status);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa ON notificacoes(empresa_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_planos_atualizado ON planos;
CREATE TRIGGER trigger_planos_atualizado
  BEFORE UPDATE ON planos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_empresas_atualizado ON empresas;
CREATE TRIGGER trigger_empresas_atualizado
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_usuarios_atualizado ON usuarios;
CREATE TRIGGER trigger_usuarios_atualizado
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_pagamentos_atualizado ON pagamentos;
CREATE TRIGGER trigger_pagamentos_atualizado
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_afiliados_atualizado ON afiliados;
CREATE TRIGGER trigger_afiliados_atualizado
  BEFORE UPDATE ON afiliados
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE planos IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE empresas IS 'Empresas/Tenants do sistema multi-tenant';
COMMENT ON TABLE usuarios IS 'Usuários do sistema (podem pertencer a empresas)';
COMMENT ON TABLE afiliados IS 'Afiliados que indicam clientes';
COMMENT ON TABLE sessoes_usuario IS 'Sessões ativas com refresh tokens JWT';
COMMENT ON TABLE transacoes_credito IS 'Histórico de transações de créditos';
COMMENT ON TABLE pagamentos IS 'Pagamentos e assinaturas via Asaas';
COMMENT ON TABLE comissoes_afiliado IS 'Comissões geradas para afiliados';
COMMENT ON TABLE notificacoes IS 'Notificações in-app para usuários';
COMMENT ON TABLE dominios_whitelabel IS 'Domínios personalizados white-label';
