const gmapsServico = require('./src/servicos/gmaps.servico');

async function testV7() {
    console.log('--- TESTANDO TITAN-v7 (MAPS DEEP SCRAPER) ---');
    const niche = 'Dentista';
    const city = 'Belo Horizonte';
    const limit = 50; // Teste com 50 primeiro

    try {
        const leads = await gmapsServico.buscarLeadsNoMaps(niche, city, limit, (prog) => {
            if (prog.msg) console.log(` >> ${prog.msg}`);
            if (prog.p) console.log(` [PROCESSO: ${prog.p}%] [Leads: ${prog.count || 0}]`);
        });

        console.log('\n--- RESULTADO FINAL ---');
        console.log(`Leads encontrados: ${leads.length}`);
        leads.forEach((l, i) => {
            console.log(`${i + 1}. ${l.nome} - ${l.whatsapp} (${l.origem})`);
        });

    } catch (error) {
        console.error('ERRO NO TESTE:', error);
    }
}

testV7();
