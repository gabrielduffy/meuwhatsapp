-- =====================================================
-- FOLLOW-UP INTELIGENTE - WhatsBenemax
-- =====================================================

-- Sequências de follow-up
CREATE TABLE IF NOT EXISTS sequencias_followup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  nome VARCHAR(100) NOT NULL,
  descricao TEXT,

  -- Gatilho de início
  gatilho_tipo VARCHAR(50) NOT NULL,
  /*
    gatilho_tipo:
    - manual (adicionar contato manualmente)
    - nova_conversa (quando inicia conversa)
    - etapa_funil (quando entra em etapa do funil)
    - sem_resposta (quando não responde em X horas)
    - tag_adicionada (quando tag é adicionada ao contato)
  */
  gatilho_config JSONB DEFAULT '{}',
  /*
    Para 'etapa_funil': { "etapa_id": "uuid" }
    Para 'sem_resposta': { "horas": 24 }
    Para 'tag_adicionada': { "tag": "interessado" }
  */

  -- Configurações
  instancia_id UUID REFERENCES instancias_whatsapp(id),
  usar_agente_ia BOOLEAN DEFAULT false,
  agente_id UUID REFERENCES agentes_ia(id),

  -- Horários de envio
  horario_inicio INTEGER DEFAULT 8,
  horario_fim INTEGER DEFAULT 20,
  enviar_fim_semana BOOLEAN DEFAULT false,

  -- Status
  ativo BOOLEAN DEFAULT false,

  -- Estatísticas
  total_inscritos INTEGER DEFAULT 0,
  total_concluidos INTEGER DEFAULT 0,
  total_responderam INTEGER DEFAULT 0,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Etapas da sequência
CREATE TABLE IF NOT EXISTS etapas_followup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequencia_id UUID REFERENCES sequencias_followup(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  ordem INTEGER NOT NULL,

  -- Delay antes de enviar
  delay_valor INTEGER NOT NULL,
  delay_unidade VARCHAR(10) DEFAULT 'horas',
  /* delay_unidade: minutos, horas, dias */

  -- Tipo de ação
  tipo_acao VARCHAR(20) DEFAULT 'mensagem',
  /* tipo_acao: mensagem, email, tarefa, mover_funil, webhook */

  -- Conteúdo da mensagem
  tipo_mensagem VARCHAR(20) DEFAULT 'texto',
  /* tipo_mensagem: texto, imagem, audio, documento, video */

  conteudo TEXT,
  midia_url VARCHAR(500),

  -- Variáveis disponíveis: {{nome}}, {{empresa}}, {{telefone}}

  -- Condição para executar (opcional)
  condicao JSONB DEFAULT '{}',
  /*
    condicao: {
      "tipo": "nao_respondeu",
      "valor": true
    }
  */

  -- Para mover_funil
  funil_destino_id UUID REFERENCES funis(id),
  etapa_destino_id UUID REFERENCES etapas_funil(id),

  -- Para webhook
  webhook_url VARCHAR(500),

  ativo BOOLEAN DEFAULT true,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Contatos inscritos em sequências
CREATE TABLE IF NOT EXISTS inscricoes_followup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequencia_id UUID REFERENCES sequencias_followup(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) DEFAULT 'ativa',
  /* status: ativa, pausada, concluida, cancelada, respondeu */

  -- Progresso
  etapa_atual INTEGER DEFAULT 0,
  proxima_execucao TIMESTAMP,

  -- Metadados
  inscrito_por VARCHAR(50),
  /* inscrito_por: manual, gatilho, api */

  iniciado_em TIMESTAMP DEFAULT NOW(),
  concluido_em TIMESTAMP,
  cancelado_em TIMESTAMP,
  respondeu_em TIMESTAMP,

  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(sequencia_id, contato_id)
);

-- Histórico de execuções
CREATE TABLE IF NOT EXISTS execucoes_followup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID REFERENCES inscricoes_followup(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES etapas_followup(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,

  -- Resultado
  status VARCHAR(20) NOT NULL,
  /* status: enviado, entregue, lido, falhou, pulado */

  mensagem_id UUID,
  erro TEXT,

  executado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sequencias_empresa ON sequencias_followup(empresa_id);
CREATE INDEX IF NOT EXISTS idx_etapas_sequencia ON etapas_followup(sequencia_id, ordem);
CREATE INDEX IF NOT EXISTS idx_inscricoes_sequencia ON inscricoes_followup(sequencia_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_contato ON inscricoes_followup(contato_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_proxima ON inscricoes_followup(proxima_execucao) WHERE status = 'ativa';
CREATE INDEX IF NOT EXISTS idx_execucoes_inscricao ON execucoes_followup(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_sequencias_ativo ON sequencias_followup(empresa_id, ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_followup_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sequencias_updated
  BEFORE UPDATE ON sequencias_followup
  FOR EACH ROW EXECUTE FUNCTION update_followup_timestamp();

CREATE TRIGGER trigger_etapas_followup_updated
  BEFORE UPDATE ON etapas_followup
  FOR EACH ROW EXECUTE FUNCTION update_followup_timestamp();

CREATE TRIGGER trigger_inscricoes_updated
  BEFORE UPDATE ON inscricoes_followup
  FOR EACH ROW EXECUTE FUNCTION update_followup_timestamp();
