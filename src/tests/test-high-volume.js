/**
 * TITAN v8.1 - Teste de Volume Alto
 * 
 * Valida se o sistema consegue coletar 100-150 leads sem shadow-ban.
 * 
 * Uso: node src/tests/test-high-volume.js [cidade]
 * Exemplo: node src/tests/test-high-volume.js "São Paulo"
 */

const path = require('path');
const fs = require('fs');
const { buscarLeadsNoMaps } = require('../servicos/gmaps.servico');

const RESULTS_DIR = path.join(__dirname, '../../logs/volume-tests');
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Configurações do teste
const TESTES_VOLUME = [
    { termo: 'Restaurante', meta: 100 },
    { termo: 'Dentista', meta: 100 },
    { termo: 'Advogado', meta: 100 },
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarVolumeAlto(cidade = 'São Paulo') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log('\n🚀 TITAN v8.1 - Teste de Volume Alto\n');
    console.log('='.repeat(60));
    console.log(`   Cidade: ${cidade}`);
    console.log(`   Testes: ${TESTES_VOLUME.length}`);
    console.log(`   Meta por teste: 100 leads`);
    console.log('='.repeat(60));

    const resultados = [];
    let totalLeads = 0;
    let totalMeta = 0;
    let shadowBans = 0;

    for (let i = 0; i < TESTES_VOLUME.length; i++) {
        const { termo, meta } = TESTES_VOLUME[i];

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📍 TESTE ${i + 1}/${TESTES_VOLUME.length}: "${termo}" em ${cidade}`);
        console.log(`   Meta: ${meta} leads`);
        console.log(`${'─'.repeat(60)}`);

        const startTime = Date.now();
        let leadsColetados = 0;
        let shadowBanDetectado = false;
        const logs = [];

        try {
            const leads = await new Promise((resolve, reject) => {
                // Aumentar o timeout para 10 minutos para volume alto
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout: 10 minutos excedidos'));
                }, 10 * 60 * 1000);

                buscarLeadsNoMaps(termo, cidade, meta, (progress) => {
                    const log = progress.msg || JSON.stringify(progress);
                    logs.push(log);

                    if (log.toLowerCase().includes('shadowban') || log.toLowerCase().includes('shadow-ban')) {
                        shadowBanDetectado = true;
                    }

                    // Extrair contagem de leads do log se disponível
                    const match = log.match(/(\d+)\s*leads?/i);
                    if (match && !log.includes('Meta')) {
                        const count = parseInt(match[1]);
                        if (!isNaN(count)) leadsColetados = count;
                    }

                    // Log simplificado
                    if (log.includes('[LEAD]') || log.includes('Progresso') || log.includes('finalizada') || log.includes('⚠️')) {
                        console.log(`   ${log}`);
                    }
                })
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(err => {
                        clearTimeout(timeout);
                        reject(err);
                    });
            });

            const duration = (Date.now() - startTime) / 1000;
            leadsColetados = (leads && Array.isArray(leads)) ? leads.length : leadsColetados;
            const taxaSucesso = ((leadsColetados / meta) * 100).toFixed(1);

            resultados.push({
                termo,
                cidade,
                meta,
                leadsColetados,
                taxaSucesso: parseFloat(taxaSucesso),
                duration,
                shadowBan: shadowBanDetectado,
                leadsPerMinute: (leadsColetados / (duration / 60)).toFixed(1)
            });

            totalLeads += leadsColetados;
            totalMeta += meta;
            if (shadowBanDetectado) shadowBans++;

            // Resumo do teste
            const statusIcon = taxaSucesso >= 80 ? '✅' : taxaSucesso >= 50 ? '⚠️' : '❌';
            console.log(`\n   ${statusIcon} Resultado: ${leadsColetados}/${meta} leads (${taxaSucesso}%)`);
            console.log(`   ⏱️ Tempo: ${duration.toFixed(1)}s`);
            console.log(`   🚫 Shadow-ban: ${shadowBanDetectado ? 'SIM ⚠️' : 'NÃO ✅'}`);

            // Salvar leads
            if (leads && Array.isArray(leads) && leads.length > 0) {
                const safeTerm = termo.toLowerCase().replace(/\s+/g, '_');
                const leadsPath = path.join(RESULTS_DIR, `leads-${safeTerm}-${timestamp}.json`);
                fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
                console.log(`   📁 Leads salvos: ${leadsPath}`);
            }

        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            resultados.push({
                termo,
                cidade,
                meta,
                leadsColetados: 0,
                taxaSucesso: 0,
                error: error.message,
                shadowBan: false
            });
        }

        // Pausa entre testes para não queimar IP
        if (i < TESTES_VOLUME.length - 1) {
            console.log('\n   ⏳ Pausa de 60 segundos antes do próximo teste...');
            await sleep(60000);
        }
    }

    // Relatório final
    const taxaGeral = totalMeta > 0 ? ((totalLeads / totalMeta) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL - TESTE DE VOLUME');
    console.log('='.repeat(60));

    resultados.forEach(r => {
        const statusIcon = r.taxaSucesso >= 80 ? '✅' : r.taxaSucesso >= 50 ? '⚠️' : '❌';
        console.log(`   ${statusIcon} ${r.termo}: ${r.leadsColetados}/${r.meta} (${r.taxaSucesso}%) ${r.shadowBan ? '🚫 SB' : ''}`);
    });

    console.log(`\n   📈 TAXA GERAL: ${taxaGeral}% (${totalLeads}/${totalMeta} leads)`);
    console.log(`   🚫 Shadow-bans: ${shadowBans}/${TESTES_VOLUME.length}`);

    // Avaliação
    console.log('\n' + '='.repeat(60));
    console.log('🏆 AVALIAÇÃO FINAL');
    console.log('='.repeat(60));

    if (taxaGeral >= 80 && shadowBans === 0) {
        console.log('   ✅ EXCELENTE - TITAN v8 aprovado para produção em escala!');
    } else if (taxaGeral >= 60) {
        console.log('   ⚠️ BOM - Funcional, mas considere aumentar delays.');
    } else {
        console.log('   ❌ ATENÇÃO - Taxa baixa, revisar configurações.');
    }

    // Salvar relatório
    const reportPath = path.join(RESULTS_DIR, `volume-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp,
        cidade,
        totalLeads,
        totalMeta,
        taxaGeral: parseFloat(taxaGeral),
        shadowBans,
        resultados
    }, null, 2));

    console.log(`\n   📁 Relatório: ${reportPath}\n`);

    return resultados;
}

// Executar
if (require.main === module) {
    const cidade = process.argv[2] || 'São Paulo';

    testarVolumeAlto(cidade)
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { testarVolumeAlto };
