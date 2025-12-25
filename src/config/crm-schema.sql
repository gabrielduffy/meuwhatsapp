-- =====================================================
-- CRM KANBAN - WhatsBenemax
-- =====================================================

-- Funis de vendas
CREATE TABLE IF NOT EXISTS funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#5B21B6',

  -- Configurações
  movimentacao_automatica BOOLEAN DEFAULT false,
  config_ia JSONB DEFAULT '{}',
  /*
    config_ia: {
      "ativo": true,
      "gatilhos": [
        { "palavra": "comprar", "mover_para": "etapa_id", "confianca_minima": 0.8 },
        { "palavra": "preço", "mover_para": "etapa_id" }
      ]
    }
  */

  padrao BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Etapas do funil
CREATE TABLE IF NOT EXISTS etapas_funil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(7) DEFAULT '#5B21B6',

  -- Configurações
  ordem INTEGER DEFAULT 0,
  limite_dias INTEGER,
  /* Se ficar mais de X dias, marca como atrasado */

  -- Ações automáticas
  ao_entrar JSONB DEFAULT '{}',
  /*
    ao_entrar: {
      "enviar_mensagem": true,
      "mensagem_id": "uuid",
      "criar_tarefa": true,
      "tarefa_descricao": "Fazer follow-up",
      "notificar_responsavel": true
    }
  */

  -- Estatísticas
  total_negocios INTEGER DEFAULT 0,
  valor_total DECIMAL(12,2) DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Negociações (cards do Kanban)
CREATE TABLE IF NOT EXISTS negociacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES etapas_funil(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES contatos(id) ON DELETE SET NULL,

  -- Dados básicos
  titulo VARCHAR(200) NOT NULL,
  valor DECIMAL(12,2) DEFAULT 0,

  -- Responsável
  responsavel_id UUID REFERENCES usuarios(id),

  -- Status
  status VARCHAR(20) DEFAULT 'aberta',
  /* status: aberta, ganha, perdida, arquivada */

  motivo_perda VARCHAR(200),

  -- Origem
  origem VARCHAR(50),
  /* origem: manual, chat, prospeccao, importacao, api */
  origem_id UUID,

  -- Datas
  data_previsao_fechamento DATE,
  data_fechamento TIMESTAMP,

  -- Prioridade
  prioridade VARCHAR(20) DEFAULT 'normal',
  /* prioridade: baixa, normal, alta, urgente */

  -- Campos personalizados
  campos_personalizados JSONB DEFAULT '{}',

  -- Metadados
  etiquetas JSONB DEFAULT '[]',

  -- Posição no Kanban
  posicao INTEGER DEFAULT 0,

  -- Timestamps
  entrou_etapa_em TIMESTAMP DEFAULT NOW(),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Histórico de movimentações
CREATE TABLE IF NOT EXISTS historico_negociacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID REFERENCES negociacoes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL,
  /* tipo: criada, movida, editada, ganha, perdida, comentario, tarefa_criada, tarefa_concluida */

  usuario_id UUID REFERENCES usuarios(id),

  -- Detalhes da ação
  dados JSONB DEFAULT '{}',
  /*
    Para 'movida': { "de_etapa": "nome", "para_etapa": "nome", "automatico": true }
    Para 'editada': { "campo": "valor", "de": "x", "para": "y" }
    Para 'comentario': { "texto": "..." }
  */

  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tarefas da negociação
CREATE TABLE IF NOT EXISTS tarefas_negociacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID REFERENCES negociacoes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,

  -- Responsável
  responsavel_id UUID REFERENCES usuarios(id),

  -- Status
  concluida BOOLEAN DEFAULT false,
  concluida_em TIMESTAMP,
  concluida_por UUID REFERENCES usuarios(id),

  -- Prazo
  prazo TIMESTAMP,

  -- Lembrete
  lembrar_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Campos personalizados do CRM
CREATE TABLE IF NOT EXISTS campos_personalizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  /* tipo: texto, numero, data, selecao, multipla_escolha, checkbox */

  opcoes JSONB DEFAULT '[]',
  /* Para selecao/multipla_escolha: ["Opção 1", "Opção 2"] */

  obrigatorio BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,

  criado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(empresa_id, slug)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funis_empresa ON funis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_etapas_funil ON etapas_funil(funil_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_empresa ON negociacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_funil ON negociacoes(funil_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_etapa ON negociacoes(etapa_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_contato ON negociacoes(contato_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_responsavel ON negociacoes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_negociacoes_status ON negociacoes(status);
CREATE INDEX IF NOT EXISTS idx_historico_negociacao ON historico_negociacao(negociacao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_tarefas_negociacao ON tarefas_negociacao(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_campos_personalizados_empresa ON campos_personalizados(empresa_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_crm_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_funis_updated
  BEFORE UPDATE ON funis
  FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_etapas_updated
  BEFORE UPDATE ON etapas_funil
  FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_negociacoes_updated
  BEFORE UPDATE ON negociacoes
  FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER trigger_tarefas_updated
  BEFORE UPDATE ON tarefas_negociacao
  FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();
