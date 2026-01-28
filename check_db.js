require('dotenv').config();
const { query } = require('./src/config/database');

async function check() {
    try {
        const res = await query("SELECT * FROM historico_prospeccao WHERE nicho ILIKE '%clinica%' AND cidade ILIKE '%rio de janeiro%' ORDER BY criado_em DESC LIMIT 1");
        if (res.rows.length === 0) {
            console.log("Nenhum registro encontrado.");
            return;
        }
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error("ERRO NO CHECK:", e.message);
    }
}
check();
