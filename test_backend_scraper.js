const { buscarLeadsNoMaps } = require('./src/servicos/gmaps.servico');

async function runTest() {
    console.log('--- INICIANDO TESTE DE BACKEND ---');
    try {
        const niche = 'Restaurante';
        const city = 'São Paulo';
        const limit = 5;

        console.log(`Buscando ${limit} leads para "${niche}" em "${city}"...`);

        const leads = await buscarLeadsNoMaps(niche, city, limit, (progress) => {
            if (progress.msg) console.log(`[PROGRESS MSG] ${progress.msg}`);
            if (progress.p) console.log(`[PROGRESS PERC] ${progress.p}%`);
        });

        console.log('--- RESULTADO ---');
        console.log(`Total de leads encontrados: ${leads.length}`);
        leads.forEach((l, i) => {
            console.log(`${i + 1}. ${l.nome} - ${l.whatsapp}`);
        });

        if (leads.length > 0) {
            console.log('✅ TESTE BEM SUCEDIDO!');
        } else {
            console.log('❌ TESTE FALHOU: Nenhum lead encontrado.');
        }

    } catch (error) {
        console.error('❌ ERRO DURANTE O TESTE:', error);
    }
}

runTest();
