const { query } = require('./src/config/database');

async function check() {
    try {
        const empresas = await query('SELECT * FROM empresas');
        console.log('Empresas found:', empresas.rows.length);
        empresas.rows.forEach(e => console.log(`- ${e.nome} (ID: ${e.id})`));

        const contatos = await query('SELECT id, nome, telefone FROM contatos LIMIT 10');
        console.log('\nContatos (first 10):');
        contatos.rows.forEach(c => console.log(`- ${c.nome} (${c.telefone}) [ID: ${c.id}]`));

        const conversas = await query('SELECT * FROM conversas_chat LIMIT 5');
        console.log('\nConversas (first 5):');
        conversas.rows.forEach(c => console.log(`- ID: ${c.id}, Status: ${c.status}, Contato: ${c.contato_id}`));

        const msgs = await query('SELECT * FROM mensagens_chat ORDER BY criado_em DESC LIMIT 5');
        console.log('\nMensagens (last 5):');
        msgs.rows.forEach(m => console.log(`- ID: ${m.id}, Dir: ${m.direcao}, Tipo: ${m.tipo_mensagem}, Conteudo: ${m.conteudo}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

check();
