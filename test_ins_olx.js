const { buscarLeadsNoInstagram } = require('./src/servicos/instagram.servico');
const { buscarLeadsNoOLX } = require('./src/servicos/olx.servico');
const { buscarLeadsNoLinkedIn } = require('./src/servicos/linkedin.servico');

async function testSource(name, fn, niche, city) {
    console.log(`\n--- TESTANDO FONTE: ${name.toUpperCase()} ---`);
    try {
        const leads = await fn(niche, city, 10, (progress) => {
            if (progress.msg) console.log(`[${name}] ${progress.msg}`);
        });
        console.log(`[${name}] Total encontrados: ${leads.length}`);
        leads.forEach((l, i) => console.log(`  ${i + 1}. ${l.nome} - ${l.whatsapp}`));
        return leads.length;
    } catch (e) {
        console.error(`[${name}] Erro:`, e.message);
        return 0;
    }
}

async function run() {
    // Escolhendo um nicho com muita visibilidade de telefone (Auto Peças / Guinchos)
    const niche = 'Guincho 24h';
    const city = 'São Paulo';

    await testSource('instagram', buscarLeadsNoInstagram, niche, city);
    await testSource('olx', buscarLeadsNoOLX, niche, city);
    console.log('\n--- TESTE FINALIZADO ---');
}

run();
