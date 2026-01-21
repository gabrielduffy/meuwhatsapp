const { buscarLeadsNoInstagram } = require('./src/servicos/instagram.servico');
const { buscarLeadsNoOLX } = require('./src/servicos/olx.servico');
const { buscarLeadsNoLinkedIn } = require('./src/servicos/linkedin.servico');

async function checkSources() {
    const niche = 'Contabilidade';
    const city = 'Sorocaba'; // Usando Sorocaba para variar

    console.log(`\n--- TESTE DE INTEGRAÇÃO TDD: PROSPECÇÃO ---`);
    console.log(`Nicho: ${niche} | Cidade: ${city}`);

    const results = {
        instagram: 0,
        olx: 0,
        linkedin: 0
    };

    try {
        console.log('\n[TEST] Instagram...');
        const ins = await buscarLeadsNoInstagram(niche, city, 10);
        results.instagram = ins.length;
        console.log(`[RESULT] Instagram: ${ins.length} leads`);

        console.log('\n[TEST] OLX...');
        const olx = await buscarLeadsNoOLX(niche, city, 10);
        results.olx = olx.length;
        console.log(`[RESULT] OLX: ${olx.length} leads`);

        console.log('\n[TEST] LinkedIn...');
        const ln = await buscarLeadsNoLinkedIn(niche, city, 10);
        results.linkedin = ln.length;
        console.log(`[RESULT] LinkedIn: ${ln.length} leads`);

    } catch (e) {
        console.error('Erro no teste:', e.message);
    }

    console.log('\n--- RESUMO DO TESTE ---');
    console.table(results);

    const total = results.instagram + results.olx + results.linkedin;
    if (total === 0) {
        console.error('\n❌ FALHA: Nenhuma das fontes extras retornou contatos!');
        process.exit(1);
    } else {
        console.log('\n✅ SUCESSO: Pelo menos uma fonte extra funcionou.');
        process.exit(0);
    }
}

checkSources();
