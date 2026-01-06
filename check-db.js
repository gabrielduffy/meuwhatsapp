
const { query } = require('./src/config/database');

async function checkCols() {
    try {
        const res = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversas_chat'");
        console.log('Columns in conversas_chat:');
        res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkCols();
