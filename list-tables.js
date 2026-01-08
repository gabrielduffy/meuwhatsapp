const { query } = require('./src/config/database');

async function check() {
    try {
        const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:');
        tables.rows.forEach(t => console.log(`- ${t.table_name}`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

check();
