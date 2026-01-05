require('dotenv').config();
const { query } = require('../config/database');
const chatServico = require('../servicos/chat.servico');
const contatoRepo = require('../repositorios/contato.repositorio');

async function testeFlow() {
    console.log('>>> INICIANDO TESTE DE FLUXO DE CHAT <<<');

    try {
        // 1. Buscar empresa
        console.log('1. Buscando empresa...');
        const empresaRes = await query('SELECT id FROM empresas ORDER BY criado_em DESC LIMIT 1');

        if (empresaRes.rows.length === 0) {
            throw new Error('Nenhuma empresa encontrada para teste!');
        }

        const empresaId = empresaRes.rows[0].id;
        console.log(`   Empresa encontrada: ${empresaId}`);

        // 2. Simular dados de mensagem
        const dadosMensagem = {
            contatoTelefone: '5511999998888',
            contatoNome: 'Teste Flow Script',
            whatsappMensagemId: 'TEST-' + Date.now(),
            tipoMensagem: 'text',
            conteudo: 'Mensagem de teste gerada pelo script de diagnóstico',
            direcao: 'recebida',
            metadados: { origem: 'script_teste' }
        };

        console.log('2. Chamando chatServico.receberMensagem...');
        const resultado = await chatServico.receberMensagem(empresaId, 'instancia_teste_script', dadosMensagem);

        console.log('3. Resultado do serviço:');
        console.log('   Conversa ID:', resultado.conversa.id);
        console.log('   Mensagem ID:', resultado.mensagem.id);
        console.log('   Contato ID:', resultado.contato.id);

        console.log('>>> SUCESSO! O fluxo de banco de dados está funcionando perfeitamente. <<<');
        console.log('>>> O problema deve estar na recepção do evento do WhatsApp (baileys). <<<');

    } catch (error) {
        console.error('>>> FALHA NO TESTE <<<');
        console.error(error);
    } finally {
        process.exit(0);
    }
}

testeFlow();
