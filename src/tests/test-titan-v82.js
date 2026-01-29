// src/tests/test-titan-v82.js
// Teste de validação do TITAN v8.2

const { buscarLeadsGoogleMaps } = require('../servicos/gmaps.servico');
const { getProxyStats, clearAllCooldowns } = require('../antidetect/proxyHealth');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarTitanV82() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         🦁 TITAN v8.2 - TESTE DE VALIDAÇÃO 🦁              ║');
    console.log('║                                                            ║');
    console.log('║   Sistema com Fallback Automático de Proxy                 ║');
    console.log('║   Ordem: Direto → Mobile → Residencial                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Limpar cooldowns anteriores
    clearAllCooldowns();

    const testes = [
        { termo: 'Dentista', cidade: 'São Paulo', meta: 20 },
        { termo: 'Pizzaria', cidade: 'São Paulo', meta: 20 },
        { termo: 'Restaurante', cidade: 'Belo Horizonte', meta: 20 },
    ];

    const resultados = [];

    for (let i = 0; i < testes.length; i++) {
        const teste = testes[i];

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📋 TESTE ${i + 1}/${testes.length}`);
        console.log(`   Termo: "${teste.termo}"`);
        console.log(`   Cidade: ${teste.cidade}`);
        console.log(`   Meta: ${teste.meta} leads`);
        console.log('═'.repeat(60) + '\n');

        const startTime = Date.now();

        try {
            const leads = await buscarLeadsGoogleMaps(teste.termo, teste.cidade, teste.meta);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            const taxaSucesso = ((leads.length / teste.meta) * 100).toFixed(1);

            resultados.push({
                ...teste,
                leads: leads.length,
                duration,
                taxaSucesso: parseFloat(taxaSucesso),
                status: leads.length >= teste.meta * 0.5 ? '✅' : '⚠️',
                erro: null,
            });

            console.log(`\n📊 Resultado: ${leads.length} leads em ${duration}s (${taxaSucesso}%)`);

            // Mostrar alguns leads de exemplo
            if (leads.length > 0) {
                console.log('\n📝 Primeiros leads:');
                leads.slice(0, 3).forEach((lead, idx) => {
                    console.log(`   ${idx + 1}. ${lead.nome} - ${lead.whatsapp}`);
                });
            }

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            resultados.push({
                ...teste,
                leads: 0,
                duration,
                taxaSucesso: 0,
                status: '❌',
                erro: error.message,
            });

            console.log(`\n❌ ERRO: ${error.message}`);
        }

        // Pausa entre testes (exceto o último)
        if (i < testes.length - 1) {
            console.log('\n⏳ Aguardando 15s antes do próximo teste...');
            await sleep(15000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // RESUMO FINAL
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 RESUMO FINAL                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Tabela de resultados
    console.log('┌────────────────┬──────────────────┬──────┬───────┬────────┬────────┐');
    console.log('│ Termo          │ Cidade           │ Meta │ Leads │ Taxa   │ Status │');
    console.log('├────────────────┼──────────────────┼──────┼───────┼────────┼────────┤');

    for (const r of resultados) {
        const termo = r.termo.padEnd(14);
        const cidade = r.cidade.padEnd(16);
        const meta = String(r.meta).padStart(4);
        const leads = String(r.leads).padStart(5);
        const taxa = `${r.taxaSucesso}%`.padStart(6);
        const status = r.status;

        console.log(`│ ${termo} │ ${cidade} │ ${meta} │ ${leads} │ ${taxa} │   ${status}   │`);
    }

    console.log('└────────────────┴──────────────────┴──────┴───────┴────────┴────────┘');

    // Estatísticas gerais
    const totalLeads = resultados.reduce((sum, r) => sum + r.leads, 0);
    const totalMeta = resultados.reduce((sum, r) => sum + r.meta, 0);
    const taxaGeral = totalMeta > 0 ? ((totalLeads / totalMeta) * 100).toFixed(1) : 0;
    const testesPassaram = resultados.filter(r => r.taxaSucesso >= 50).length;

    console.log('\n');
    console.log(`📈 Total de Leads: ${totalLeads}/${totalMeta}`);
    console.log(`📊 Taxa Geral: ${taxaGeral}%`);
    console.log(`✓ Testes OK: ${testesPassaram}/${testes.length}`);

    // Status do proxy
    console.log('\n📡 Status dos Proxies:');
    const stats = getProxyStats();
    for (const [type, status] of Object.entries(stats.status)) {
        const icon = status.blocked ? '🔴' : (status.failures > 0 ? '🟡' : '🟢');
        console.log(`   ${icon} ${type}: ${status.failures} falhas${status.blocked ? ' (bloqueado)' : ''}`);
    }

    // Veredito final
    console.log('\n');
    if (taxaGeral >= 70) {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║     🏆 TITAN v8.2 APROVADO PARA PRODUÇÃO! 🏆               ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } else if (taxaGeral >= 50) {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║     ⚠️ TITAN v8.2 APROVADO COM RESSALVAS                   ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║     ❌ TITAN v8.2 PRECISA DE AJUSTES                       ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    }

    console.log('\n');

    // Retornar código de saída apropriado
    process.exit(taxaGeral >= 50 ? 0 : 1);
}

// Executar
testarTitanV82().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
