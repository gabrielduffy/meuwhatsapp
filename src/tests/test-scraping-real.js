/**
 * TITAN v8 - Teste de Scraping Real
 * 
 * Executa um scraping completo e mede métricas de performance.
 * 
 * Uso: node src/tests/test-scraping-real.js [termo] [cidade] [quantidade]
 */

const path = require('path');
const fs = require('fs');

// Importar o serviço principal
const { buscarLeadsNoMaps } = require('../servicos/gmaps.servico');

// Criar pasta de resultados
const RESULTS_DIR = path.join(__dirname, '../../logs/scraping-tests');
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function testarScrapingReal(termo, cidade, quantidade) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log('\n🦁 TITAN v8 - Teste de Scraping Real\n');
    console.log('='.repeat(60));
    console.log(`   Termo: "${termo}"`);
    console.log(`   Cidade: ${cidade}`);
    console.log(`   Meta: ${quantidade} leads`);
    console.log('='.repeat(60));

    const metrics = {
        timestamp,
        termo,
        cidade,
        targetLeads: quantidade,
        startTime: Date.now(),
        endTime: null,
        duration: null,
        leadsColetados: 0,
        taxaSucesso: 0,
        shadowBanDetectado: false,
        erros: [],
        logs: []
    };

    return new Promise((resolve) => {
        const progressCallback = (progress) => {
            const log = `[${new Date().toISOString()}] ${progress.msg || JSON.stringify(progress)}`;
            metrics.logs.push(log);
            console.log(progress.msg || JSON.stringify(progress));

            if (progress.msg && progress.msg.includes('ShadowBan')) {
                metrics.shadowBanDetectado = true;
            }

            if (progress.msg && (progress.msg.includes('Error') || progress.msg.includes('Erro'))) {
                metrics.erros.push(progress.msg);
            }
        };

        buscarLeadsNoMaps(termo, cidade, quantidade, progressCallback)
            .then((leads) => {
                metrics.endTime = Date.now();
                metrics.duration = (metrics.endTime - metrics.startTime) / 1000;
                metrics.leadsColetados = leads?.length || 0;
                metrics.taxaSucesso = ((metrics.leadsColetados / quantidade) * 100).toFixed(1);

                const leadsPath = path.join(RESULTS_DIR, `leads-${timestamp}.json`);
                fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));

                const metricsPath = path.join(RESULTS_DIR, `metrics-${timestamp}.json`);
                fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

                console.log('\n' + '='.repeat(60));
                console.log('📊 RESULTADO DO TESTE');
                console.log('='.repeat(60));
                console.log(`   🎯 Meta: ${quantidade} leads`);
                console.log(`   ✅ Coletados: ${metrics.leadsColetados} leads`);
                console.log(`   📈 Taxa de sucesso: ${metrics.taxaSucesso}%`);
                console.log(`   ⏱️ Duração: ${metrics.duration.toFixed(1)} segundos`);

                if (metrics.taxaSucesso >= 80 && !metrics.shadowBanDetectado) {
                    console.log('   ✅ EXCELENTE - Sistema funcionando perfeitamente!');
                } else if (metrics.taxaSucesso >= 50) {
                    console.log('   ⚠️ BOM - Funcionando, mas pode melhorar.');
                } else {
                    console.log('   ❌ ATENÇÃO - Taxa de sucesso baixa.');
                }

                resolve(metrics);
            })
            .catch((error) => {
                metrics.endTime = Date.now();
                metrics.duration = (metrics.endTime - metrics.startTime) / 1000;
                metrics.erros.push(error.message);
                console.error('\n❌ Erro fatal:', error.message);
                resolve(metrics);
            });
    });
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const termo = args[0] || 'Restaurante';
    const cidade = args[1] || 'São Paulo';
    const quantidade = parseInt(args[2]) || 50;

    testarScrapingReal(termo, cidade, quantidade)
        .then(metrics => {
            process.exit(metrics.taxaSucesso >= 50 ? 0 : 1);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { testarScrapingReal };
