const cron = require('node-cron');
const whitelabelServico = require('../servicos/whitelabel.servico');

/**
 * Tarefa cron para processar verificações DNS pendentes
 * Executa a cada 1 hora
 */
function iniciarTarefaWhiteLabel() {
  console.log('[Cron] Tarefa de white label iniciada - executa a cada 1 hora');

  // Executar a cada 1 hora
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cron] Iniciando processamento de verificações DNS...');
      const resultado = await whitelabelServico.processarVerificacoesPendentes();
      console.log('[Cron] Verificações DNS processadas:', resultado);
    } catch (erro) {
      console.error('[Cron] Erro ao processar verificações DNS:', erro);
    }
  });

  console.log('[Cron] ✅ Tarefa de white label agendada com sucesso');
}

module.exports = { iniciarTarefaWhiteLabel };
