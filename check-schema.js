const { query } = require('./src/config/database');

async function checkSchema() {
    try {
        console.log('--- SCHEMA LEADS_PROSPECCAO ---');
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads_prospeccao'
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

checkSchema();
