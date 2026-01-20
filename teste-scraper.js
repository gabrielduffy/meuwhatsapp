const { buscarLeadsNoMaps } = require('./src/servicos/gmaps.servico');

async function testar() {
    console.log('--- INICIANDO TESTE DE DIAGNÓSTICO ---');
    console.log('1. Verificando Variáveis de Ambiente:');
    console.log('   Executable Path:', process.env.PUPPETEER_EXECUTABLE_PATH);

    try {
        console.log('\n2. Tentando iniciar navegador e buscar leads (ex: Advogado em São Paulo)...');
        // Busca apenas 2 leads para ser rápido
        const leads = await buscarLeadsNoMaps('Advogado', 'São Paulo', 2, (p) => {
            console.log(`   Progresso: ${p}%`);
        });

        console.log('\n✅ SUCESSO NO SCRAPER!');
        console.log('Leads encontrados:', leads.length);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ FALHA NO DIAGNÓSTICO:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testar();
