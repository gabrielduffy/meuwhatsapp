const { query } = require('../config/database');
const logger = require('../config/logger');

async function repararBanco() {
    logger.info('Iniciando reparo do banco de dados...');

    try {
        // 1. Corrigir instancia_id em conversas_chat
        logger.info('Verificando tipos de coluna para instancia_id...');

        const tabelasParaCorrigir = [
            { tabela: 'conversas_chat', coluna: 'instancia_id' },
            { tabela: 'agentes_ia', coluna: 'instancia_id' },
            { tabela: 'campanhas_prospeccao', coluna: 'instancia_id' }
        ];

        for (const item of tabelasParaCorrigir) {
            try {
                // Verificar tipo atual
                const res = await query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [item.tabela, item.coluna]);

                if (res.rows.length > 0 && res.rows[0].data_type === 'uuid') {
                    logger.info(`Corrigindo coluna ${item.coluna} na tabela ${item.tabela} (UUID -> VARCHAR)...`);
                    await query(`ALTER TABLE ${item.tabela} ALTER COLUMN ${item.coluna} TYPE VARCHAR(255)`);
                    logger.info(`Coluna ${item.coluna} corrigida com sucesso.`);
                } else {
                    logger.info(`Coluna ${item.coluna} na tabela ${item.tabela} já está correta ou não existe.`);
                }
            } catch (err) {
                logger.error(`Erro ao corrigir ${item.tabela}.${item.coluna}:`, err.message);
            }
        }

        // 2. Criar tabela de logs de debug se não existir
        await query(`
          CREATE TABLE IF NOT EXISTS debug_logs (
            id SERIAL PRIMARY KEY,
            area VARCHAR(50),
            mensagem TEXT,
            detalhes JSONB,
            criado_em TIMESTAMP DEFAULT NOW()
          )
        `);
        logger.info('Tabela debug_logs verificada.');

        logger.info('Reparo do banco concluído.');
    } catch (error) {
        logger.error('Erro crítico no reparo do banco:', error.message);
    }
}

module.exports = { repararBanco };
