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
                }
            } catch (err) {
                logger.error(`Erro ao corrigir ${item.tabela}.${item.coluna}:`, err.message);
            }
        }

        // 2. Corrigir estrutura da tabela contatos
        logger.info('Verificando colunas da tabela contatos...');
        const colunasContatos = [
            { nome: 'empresa', tipo: 'VARCHAR(255)' },
            { nome: 'cargo', tipo: 'VARCHAR(255)' },
            { nome: 'tags', tipo: 'JSONB DEFAULT \'[]\'::jsonb' },
            { nome: 'campos_customizados', tipo: 'JSONB DEFAULT \'{}\'::jsonb' },
            { nome: 'observacoes', tipo: 'TEXT' },
            { nome: 'ultima_interacao_em', tipo: 'TIMESTAMP' },
            { nome: 'tipo_ultima_interacao', tipo: 'VARCHAR(50)' },
            { nome: 'total_interacoes', tipo: 'INTEGER DEFAULT 0' }
        ];

        for (const col of colunasContatos) {
            try {
                const res = await query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'contatos' AND column_name = $1
                `, [col.nome]);

                if (res.rows.length === 0) {
                    logger.info(`Adicionando coluna faltante contatos.${col.nome}...`);
                    await query(`ALTER TABLE contatos ADD COLUMN ${col.nome} ${col.tipo}`);
                }
            } catch (err) {
                logger.error(`Erro ao adicionar coluna contatos.${col.nome}:`, err.message);
            }
        }

        // 3. Criar ALIASES (VIEWS) para resolver inconsistências
        logger.info('Verificando aliases de tabelas (Views)...');
        const aliases = [
            { view: 'chat_mensagens', alvo: 'mensagens_chat' },
            { view: 'chat_conversas', alvo: 'conversas_chat' },
            { view: 'mensagens', alvo: 'mensagens_chat' },
            { view: 'conversas', alvo: 'conversas_chat' },
            { view: 'instancias', alvo: 'instances' }
        ];

        for (const alias of aliases) {
            try {
                const checkAlvo = await query(`SELECT to_regclass('public.${alias.alvo}')`);
                if (checkAlvo.rows[0].to_regclass) {
                    await query(`CREATE OR REPLACE VIEW ${alias.view} AS SELECT * FROM ${alias.alvo}`);
                }
            } catch (err) {
                logger.error(`Erro ao criar alias ${alias.view}:`, err.message);
            }
        }

        // 4. Criar tabela de logs de debug se não existir
        await query(`
          CREATE TABLE IF NOT EXISTS debug_logs (
            id SERIAL PRIMARY KEY,
            area VARCHAR(50),
            mensagem TEXT,
            detalhes JSONB,
            criado_em TIMESTAMP DEFAULT NOW()
          )
        `);

        // 5. Garantir colunas em instances (SaaS base)
        try {
            const colsInstances = [
                { nome: 'empresa_id', tipo: 'UUID' },
                { nome: 'token', tipo: 'VARCHAR(255)' }
            ];

            for (const col of colsInstances) {
                const res = await query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'instances' AND column_name = $1
            `, [col.nome]);

                if (res.rows.length === 0) {
                    logger.info(`Adicionando coluna instances.${col.nome}...`);
                    await query(`ALTER TABLE instances ADD COLUMN ${col.nome} ${col.tipo}`);
                }
            }
        } catch (err) {
            logger.error('Erro ao reparar tabela instances:', err.message);
        }

        // 6. Garantir api_token em usuarios
        try {
            const res = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' AND column_name = 'api_token'
            `);

            if (res.rows.length === 0) {
                logger.info('Adicionando coluna usuarios.api_token...');
                await query('ALTER TABLE usuarios ADD COLUMN api_token VARCHAR(255)');
                await query('CREATE INDEX IF NOT EXISTS idx_usuarios_api_token ON usuarios(api_token)');
            }
        } catch (err) {
            logger.error('Erro ao reparar tabela usuarios (api_token):', err.message);
        }

        // 8. Boost limites do plano Starter por segurança
        try {
            logger.info('Ajustando limites do plano Starter...');
            await query("UPDATE planos SET max_instancias = 10, max_usuarios = 10 WHERE slug = 'starter'");

            // Garantir que a primeira empresa tenha plano e status ativo
            await query("UPDATE empresas SET plano_id = (SELECT id FROM planos WHERE slug = 'starter'), status = 'ativo' WHERE status IS NULL OR status != 'ativo'");
        } catch (err) {
            logger.error('Erro ao ajustar limites do plano:', err.message);
        }

        logger.info('Reparo do banco concluído.');
    } catch (error) {
        logger.error('Erro crítico no reparo do banco:', error.message);
    }
}

module.exports = { repararBanco };
