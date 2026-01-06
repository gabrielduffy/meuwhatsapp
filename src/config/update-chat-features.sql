
-- Adicionar suporte a IA e Etiquetas nas conversas do chat
ALTER TABLE conversas_chat ADD COLUMN IF NOT EXISTS bot_ativo BOOLEAN DEFAULT false;
ALTER TABLE conversas_chat ADD COLUMN IF NOT EXISTS etiquetas JSONB DEFAULT '[]';

-- Adicionar suporte ao status 'arquivada' se não for um enum (o schema diz VARCHAR(20))
-- Não precisa de alteração, só garantir que o backend trate 'arquivada'.

-- Criar tabela de compromissos/agenda se não existir (para o botão Agendar Reunião)
CREATE TABLE IF NOT EXISTS agenda_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conversa_id UUID REFERENCES conversas_chat(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES contatos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP,
  
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, confirmado, cancelado, concluido
  
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
