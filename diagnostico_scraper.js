
const gmapsServico = require('./src/servicos/gmaps.servico');

async function test() {
    console.log('--- INICIANDO TESTE DE DIAGNÓSTICO ---');
    try {
        const results = await gmapsServico.buscarLeadsNoMaps('Academia', 'Belo Horizonte', 5, (p) => {
            console.log(`Progresso: ${p}%`);
        });
        console.log('Resultados obtidos:', results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('ERRO NO TESTE:', error);
    }
    process.exit(0);
}

test();
