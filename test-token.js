const { query } = require('./src/config/database');

async function checkToken() {
    try {
        const token = '6087d64f-dc8e-4813-9100-b1e978fbe4ec';
        const res = await query('SELECT id, nome, api_token FROM usuarios WHERE api_token = $1', [token]);
        if (res.rows.length > 0) {
            console.log('TOKEN_VALIDO:', JSON.stringify(res.rows[0]));
        } else {
            console.log('TOKEN_NAO_ENCONTRADO');
        }
        process.exit(0);
    } catch (err) {
        console.error('ERRO_AO_VERIFICAR:', err.message);
        process.exit(1);
    }
}

checkToken();
