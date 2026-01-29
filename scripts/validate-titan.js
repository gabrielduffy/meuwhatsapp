/**
 * TITAN v8.1 - Validação Completa
 * 
 * Executa todos os testes em sequência e gera relatório final.
 * 
 * Uso: node scripts/validate-titan.js
 */

const { testarAntiDetectLocal } = require('../src/tests/test-antidetect-local');
const { testarScrapingReal } = require('../src/tests/test-scraping-real');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function validarTitan() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         🦁 TITAN v8.1 - VALIDAÇÃO COMPLETA 🦁            ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n');

    const results = {
        antidetect: null,
        scraping: null,
        overall: 'PENDING'
    };

    try {
        // Teste 1: Anti-Detecção
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  FASE 1: Teste de Anti-Detecção (Fingerprint)            ║');
        console.log('╚══════════════════════════════════════════════════════════╝');

        results.antidetect = await testarAntiDetectLocal();

        console.log('\n⏳ Aguardando 10 segundos antes do próximo teste...\n');
        await sleep(10000);

        // Teste 2: Scraping Real
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  FASE 2: Teste de Scraping Real (50 leads)               ║');
        console.log('╚══════════════════════════════════════════════════════════╝');

        results.scraping = await testarScrapingReal('Restaurante', 'São Paulo', 50);

    } catch (error) {
        console.error('Erro durante validação:', error.message);
    }

    // Avaliação final
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║              📋 RESULTADO DA VALIDAÇÃO                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n');

    const antidetectOk = results.antidetect?.passed >= 1;
    const scrapingOk = results.scraping?.taxaSucesso >= 80;

    console.log(`   Anti-Detecção: ${antidetectOk ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`   Scraping Real: ${scrapingOk ? '✅ PASSOU' : '❌ FALHOU'} (${results.scraping?.taxaSucesso || 0}%)`);

    if (antidetectOk && scrapingOk) {
        results.overall = 'PASSED';
        console.log('\n   ════════════════════════════════════════');
        console.log('   🏆 TITAN v8.1 APROVADO PARA PRODUÇÃO! 🏆');
        console.log('   ════════════════════════════════════════\n');
    } else {
        results.overall = 'FAILED';
        console.log('\n   ════════════════════════════════════════');
        console.log('   ⚠️ TITAN v8.1 precisa de ajustes');
        console.log('   ════════════════════════════════════════\n');
    }

    return results;
}

// Executar
if (require.main === module) {
    validarTitan()
        .then(results => {
            process.exit(results.overall === 'PASSED' ? 0 : 1);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}
