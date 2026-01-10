const { query } = require('./src/config/database');

async function checkWebhook() {
    try {
        const res = await query("SELECT webhook_url FROM instances WHERE instance_name = 'benemax'");
        if (res.rows.length > 0) {
            console.log('WEBHOOK_URL:', res.rows[0].webhook_url);
        } else {
            console.log('Instância não encontrada no banco.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkWebhook();
