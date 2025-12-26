-- ==========================================
-- SCHEMA: WHITE LABEL COMPLETO
-- Sistema completo de white label com domínios customizados
-- ==========================================

-- Tabela de configurações de white label
CREATE TABLE IF NOT EXISTS whitelabel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,

  -- Branding
  nome_sistema VARCHAR(100) DEFAULT 'WhatsBenemax',
  logo_url TEXT,
  logo_pequena_url TEXT,
  favicon_url TEXT,

  -- Cores
  cor_primaria VARCHAR(7) DEFAULT '#5B21B6',
  cor_secundaria VARCHAR(7) DEFAULT '#7C3AED',
  cor_sucesso VARCHAR(7) DEFAULT '#10B981',
  cor_erro VARCHAR(7) DEFAULT '#EF4444',
  cor_aviso VARCHAR(7) DEFAULT '#F59E0B',
  cor_info VARCHAR(7) DEFAULT '#3B82F6',
  cor_fundo VARCHAR(7) DEFAULT '#FFFFFF',
  cor_texto VARCHAR(7) DEFAULT '#1F2937',

  -- Tipografia
  fonte_primaria VARCHAR(100) DEFAULT 'Inter',
  fonte_secundaria VARCHAR(100) DEFAULT 'Roboto',

  -- CSS Customizado
  css_customizado TEXT,

  -- Email
  email_remetente VARCHAR(255),
  email_nome_remetente VARCHAR(100),
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_usuario VARCHAR(255),
  smtp_senha VARCHAR(255),
  smtp_seguro BOOLEAN DEFAULT false,

  -- Templates de Email
  template_boas_vindas TEXT,
  template_recuperacao_senha TEXT,
  template_nova_cobranca TEXT,

  -- Redes Sociais
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  youtube_url TEXT,

  -- Contato
  telefone_suporte VARCHAR(20),
  email_suporte VARCHAR(255),
  endereco TEXT,

  -- SEO
  meta_titulo VARCHAR(100),
  meta_descricao TEXT,
  meta_palavras_chave TEXT,

  -- Configurações
  mostrar_powered_by BOOLEAN DEFAULT true,
  permitir_cadastro_publico BOOLEAN DEFAULT true,

  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de domínios customizados
CREATE TABLE IF NOT EXISTS whitelabel_dominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Domínio
  dominio VARCHAR(255) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('dominio', 'subdominio')),

  -- Status de verificação
  verificado BOOLEAN DEFAULT false,
  verificacao_tipo VARCHAR(50) DEFAULT 'dns', -- dns, arquivo, meta_tag
  verificacao_token VARCHAR(255),
  verificado_em TIMESTAMP,

  -- SSL
  ssl_ativo BOOLEAN DEFAULT false,
  ssl_emissor VARCHAR(100),
  ssl_expira_em TIMESTAMP,
  ssl_auto_renovar BOOLEAN DEFAULT true,

  -- Configuração DNS (para verificação)
  dns_tipo VARCHAR(10) DEFAULT 'TXT', -- TXT, CNAME, A
  dns_nome VARCHAR(255),
  dns_valor TEXT,

  -- Status
  ativo BOOLEAN DEFAULT false,
  principal BOOLEAN DEFAULT false, -- apenas um pode ser principal por empresa

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(empresa_id, principal) WHERE principal = true
);

-- Tabela de páginas customizadas
CREATE TABLE IF NOT EXISTS whitelabel_paginas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Identificação
  slug VARCHAR(100) NOT NULL,
  titulo VARCHAR(200) NOT NULL,

  -- Conteúdo
  conteudo TEXT,
  conteudo_html TEXT,

  -- SEO
  meta_titulo VARCHAR(100),
  meta_descricao TEXT,
  meta_imagem_url TEXT,

  -- Configurações
  publicada BOOLEAN DEFAULT false,
  mostrar_menu BOOLEAN DEFAULT true,
  ordem_menu INTEGER DEFAULT 0,

  -- Template
  template VARCHAR(50) DEFAULT 'padrao', -- padrao, landing, documentacao

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(empresa_id, slug)
);

-- Tabela de scripts customizados (analytics, chat, etc)
CREATE TABLE IF NOT EXISTS whitelabel_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,

  -- Script
  script TEXT NOT NULL,
  posicao VARCHAR(20) DEFAULT 'head', -- head, body_inicio, body_fim

  -- Configurações
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de redirecionamentos
CREATE TABLE IF NOT EXISTS whitelabel_redirecionamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Redirecionamento
  origem VARCHAR(500) NOT NULL,
  destino VARCHAR(500) NOT NULL,
  tipo INTEGER DEFAULT 301, -- 301 (permanente), 302 (temporário)

  -- Estatísticas
  total_acessos INTEGER DEFAULT 0,
  ultimo_acesso TIMESTAMP,

  -- Status
  ativo BOOLEAN DEFAULT true,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(empresa_id, origem)
);

-- Tabela de verificações de DNS
CREATE TABLE IF NOT EXISTS whitelabel_verificacoes_dns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dominio_id UUID REFERENCES whitelabel_dominios(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Verificação
  tipo_registro VARCHAR(10) NOT NULL, -- TXT, CNAME, A, AAAA
  nome VARCHAR(255) NOT NULL,
  valor_esperado TEXT NOT NULL,
  valor_encontrado TEXT,

  -- Resultado
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, sucesso, falha
  mensagem TEXT,

  -- Tentativas
  tentativas INTEGER DEFAULT 0,
  ultima_tentativa TIMESTAMP,
  proxima_tentativa TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de histórico de certificados SSL
CREATE TABLE IF NOT EXISTS whitelabel_certificados_ssl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dominio_id UUID REFERENCES whitelabel_dominios(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Certificado
  emissor VARCHAR(100) NOT NULL,
  emitido_em TIMESTAMP NOT NULL,
  expira_em TIMESTAMP NOT NULL,

  -- Detalhes
  tipo VARCHAR(50) DEFAULT 'Let''s Encrypt',
  algoritmo VARCHAR(50),
  fingerprint VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, expirado, revogado
  renovado BOOLEAN DEFAULT false,

  criado_em TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_whitelabel_config_empresa ON whitelabel_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_dominios_empresa ON whitelabel_dominios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_dominios_dominio ON whitelabel_dominios(dominio);
CREATE INDEX IF NOT EXISTS idx_whitelabel_dominios_verificado ON whitelabel_dominios(verificado);
CREATE INDEX IF NOT EXISTS idx_whitelabel_dominios_ativo ON whitelabel_dominios(ativo);
CREATE INDEX IF NOT EXISTS idx_whitelabel_paginas_empresa ON whitelabel_paginas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_paginas_slug ON whitelabel_paginas(slug);
CREATE INDEX IF NOT EXISTS idx_whitelabel_scripts_empresa ON whitelabel_scripts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_redirecionamentos_empresa ON whitelabel_redirecionamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_redirecionamentos_origem ON whitelabel_redirecionamentos(origem);
CREATE INDEX IF NOT EXISTS idx_whitelabel_verificacoes_dominio ON whitelabel_verificacoes_dns(dominio_id);
CREATE INDEX IF NOT EXISTS idx_whitelabel_certificados_dominio ON whitelabel_certificados_ssl(dominio_id);

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION atualizar_timestamp_whitelabel()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whitelabel_config_timestamp
  BEFORE UPDATE ON whitelabel_config
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

CREATE TRIGGER trigger_whitelabel_dominios_timestamp
  BEFORE UPDATE ON whitelabel_dominios
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

CREATE TRIGGER trigger_whitelabel_paginas_timestamp
  BEFORE UPDATE ON whitelabel_paginas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

CREATE TRIGGER trigger_whitelabel_scripts_timestamp
  BEFORE UPDATE ON whitelabel_scripts
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

CREATE TRIGGER trigger_whitelabel_redirecionamentos_timestamp
  BEFORE UPDATE ON whitelabel_redirecionamentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

CREATE TRIGGER trigger_whitelabel_verificacoes_timestamp
  BEFORE UPDATE ON whitelabel_verificacoes_dns
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_whitelabel();

-- ==========================================
-- FUNÇÃO PARA GARANTIR APENAS UM DOMÍNIO PRINCIPAL
-- ==========================================

CREATE OR REPLACE FUNCTION garantir_dominio_principal_unico()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.principal = true THEN
    -- Desmarcar outros domínios principais da mesma empresa
    UPDATE whitelabel_dominios
    SET principal = false
    WHERE empresa_id = NEW.empresa_id
    AND id != NEW.id
    AND principal = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dominio_principal_unico
  BEFORE INSERT OR UPDATE ON whitelabel_dominios
  FOR EACH ROW
  WHEN (NEW.principal = true)
  EXECUTE FUNCTION garantir_dominio_principal_unico();

-- ==========================================
-- DADOS INICIAIS
-- ==========================================

-- Criar configuração padrão para empresas existentes
INSERT INTO whitelabel_config (empresa_id)
SELECT id FROM empresas
WHERE id NOT IN (SELECT empresa_id FROM whitelabel_config WHERE empresa_id IS NOT NULL)
ON CONFLICT (empresa_id) DO NOTHING;
