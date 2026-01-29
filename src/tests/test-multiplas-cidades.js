/**
 * TITAN v8 - Teste de Múltiplas Cidades
 */

const { testarScrapingReal } = require('./test-scraping-real');

const CIDADES_TESTE = [
    { cidade: 'São Paulo', termo: 'Pizzaria', quantidade: 20 },
    { cidade: 'Rio de Janeiro', termo: 'Restaurante', quantidade: 20 },
    { cidade: 'Belo Horizonte', termo: 'Dentista', quantidade: 20 },
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarMultiplasCidades() {
    console.log('\n🌎 TITAN v8 - Teste de Múltiplas Cidades\n');

    const resultados = [];

    for (let i = 0; i < CIDADES_TESTE.length; i++) {
        const { cidade, termo, quantidade } = CIDADES_TESTE[i];
        console.log(`\n📍 TESTE ${i + 1}/${CIDADES_TESTE.length}: ${cidade}`);

        try {
            const metrics = await testarScrapingReal(termo, cidade, quantidade);
            resultados.push(metrics);
        } catch (error) {
            resultados.push({ cidade, termo, erro: error.message });
        }

        if (i < CIDADES_TESTE.length - 1) {
            console.log('\n⏳ Aguardando 20 segundos antes da próxima cidade...\n');
            await sleep(20000);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO GERAL');
    resultados.forEach(r => {
        console.log(`   - ${r.cidade}: ${r.leadsColetados || 0}/${r.targetLeads || 0} leads (${r.taxaSucesso || 0}%)`);
    });
}

if (require.main === module) {
    testarMultiplasCidades()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
