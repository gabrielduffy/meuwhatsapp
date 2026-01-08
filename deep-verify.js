const { query } = require('./src/config/database');

async function check() {
    try {
        const token = '6087d64f-dc8e-4813-9100-b1e978fbe4ec';
        const user = await query('SELECT * FROM usuarios WHERE api_token = $1', [token]);
        if (user.rows.length === 0) {
            console.log('USER_NOT_FOUND_BY_TOKEN');
        } else {
            const u = user.rows[0];
            console.log(`User: ${u.nome} (ID: ${u.id}, Empresa: ${u.empresa_id})`);

            const emp = await query('SELECT * FROM empresas WHERE id = $1', [u.empresa_id]);
            if (emp.rows.length > 0) {
                console.log(`Empresa: ${emp.rows[0].nome} (ID: ${emp.rows[0].id}, Status: ${emp.rows[0].status})`);
            } else {
                console.log('EMPRESA_NOT_FOUND');
            }

            const instances = await query('SELECT * FROM instances WHERE empresa_id = $1', [u.empresa_id]);
            console.log(`Instances: ${instances.rows.length}`);
            instances.rows.forEach(i => console.log(`- ${i.instance_name} (Status: ${i.status})`));

            const msgs = await query('SELECT * FROM mensagens_chat WHERE empresa_id = $1 ORDER BY criado_em DESC LIMIT 5', [u.empresa_id]);
            console.log(`Last 5 messages for this company: ${msgs.rows.length}`);
            msgs.rows.forEach(m => console.log(`- [${m.criado_em}] ${m.direcao}: ${m.conteudo}`));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

check();
