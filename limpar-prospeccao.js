const { query } = require('./src/config/database');

async function limparTudo() {
    console.log('--- LIMPANDO HISTÓRICO E LEADS DE PROSPECÇÃO ---');
    try {
        // 1. Limpar histórico
        const resHist = await query('DELETE FROM historico_prospeccao');
        console.log(`✅ Histórico removido: ${resHist.rowCount} registros.`);

        // 2. Limpar leads minerados pelo scraper (usando a coluna origem que existe no schema)
        const resLeads = await query("DELETE FROM leads_prospeccao WHERE origem = 'gmaps_scraper'");
        console.log(`✅ Leads minerados removidos: ${resLeads.rowCount} registros.`);

        console.log('\n--- LIMPEZA CONCLUÍDA ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro na limpeza:', error.message);
        process.exit(1);
    }
}

limparTudo();
