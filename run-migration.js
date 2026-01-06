
const { query } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('--- Iniciando Migração de Chat ---');
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'src/config/update-chat-features.sql'), 'utf8');
        await query(sql);
        console.log('✅ Migração concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
    } finally {
        process.exit();
    }
}

migrate();
