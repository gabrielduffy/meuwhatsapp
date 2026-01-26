const { query } = require('./src/config/database');

async function createLogsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS logs_sistema (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contexto VARCHAR(50) NOT NULL, -- 'prospeccao', 'vapi', 'n8n', 'whatsapp'
      nivel VARCHAR(20) DEFAULT 'info', -- 'info', 'warn', 'error', 'debug'
      mensagem TEXT NOT NULL,
      dados JSONB,
      empresa_id UUID,
      criado_em TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_logs_contexto ON logs_sistema(contexto);
    CREATE INDEX IF NOT EXISTS idx_logs_criado_em ON logs_sistema(criado_em DESC);
  `;

    try {
        await query(sql);
        console.log('✅ Tabela logs_sistema criada com sucesso');
    } catch (e) {
        console.error('❌ Erro ao criar tabela de logs:', e.message);
    } finally {
        process.exit(0);
    }
}

createLogsTable();
