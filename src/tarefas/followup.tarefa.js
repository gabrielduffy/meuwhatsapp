const cron = require('node-cron');
const followupServico = require('../servicos/followup.servico');

/**
 * Tarefa cron para processar follow-ups pendentes
 * Executa a cada 5 minutos
 */
function iniciarTarefaFollowup() {
  console.log('[Cron] Tarefa de follow-up iniciada - executa a cada 5 minutos');

  // Executar a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[Cron] Iniciando processamento de follow-ups...');
      const resultado = await followupServico.processarInscricoesPendentes();
      console.log('[Cron] Follow-ups processados:', resultado);
    } catch (erro) {
      console.error('[Cron] Erro ao processar follow-ups:', erro);
    }
  });

  console.log('[Cron] ✅ Tarefa de follow-up agendada com sucesso');
}

module.exports = { iniciarTarefaFollowup };
