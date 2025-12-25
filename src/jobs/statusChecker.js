const cron = require('node-cron');
const statusMonitor = require('../services/statusMonitor');
const statusRepository = require('../repositories/statusRepository');

let lastResults = null;

// Executar checks a cada 1 minuto
cron.schedule('* * * * *', async () => {
  try {
    const results = await statusMonitor.runAllChecks();

    // Salvar checks
    for (const [slug, result] of Object.entries(results)) {
      await statusRepository.saveCheck(slug, result);
    }

    // Detectar mudanças e notificar
    if (lastResults) {
      await statusMonitor.detectAndNotify(results, lastResults);
    }

    lastResults = results;

    console.log('[Status] Checks executados:', new Date().toISOString());
  } catch (error) {
    console.error('[Status] Erro ao executar checks:', error.message);
  }
});

// Agregar estatísticas diárias à meia-noite
cron.schedule('5 0 * * *', async () => {
  try {
    const services = await statusRepository.getAllServices();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    for (const service of services) {
      await statusRepository.aggregateDailyStats(service.id, dateStr);
    }

    // Limpar dados antigos
    await statusRepository.cleanOldChecks();
    await statusRepository.cleanOldNotifications();

    console.log('[Status] Estatísticas diárias agregadas');
  } catch (error) {
    console.error('[Status] Erro ao agregar estatísticas:', error.message);
  }
});

// Verificar manutenções que devem iniciar
cron.schedule('* * * * *', async () => {
  try {
    const maintenances = await statusRepository.getScheduledMaintenances();
    const now = new Date();

    for (const m of maintenances) {
      const start = new Date(m.scheduled_start);
      const end = new Date(m.scheduled_end);

      if (m.status === 'scheduled' && now >= start) {
        await statusRepository.updateMaintenanceStatus(m.id, 'in_progress');
        console.log('[Status] Manutenção iniciada:', m.title);
      }

      if (m.status === 'in_progress' && now >= end) {
        await statusRepository.updateMaintenanceStatus(m.id, 'completed');
        console.log('[Status] Manutenção concluída:', m.title);
      }
    }
  } catch (error) {
    console.error('[Status] Erro ao verificar manutenções:', error.message);
  }
});

console.log('[Status] Jobs de monitoramento iniciados');

// Executar check inicial imediatamente
(async () => {
  try {
    console.log('[Status] Executando check inicial...');
    const results = await statusMonitor.runAllChecks();

    // Salvar checks iniciais
    for (const [slug, result] of Object.entries(results)) {
      await statusRepository.saveCheck(slug, result);
    }

    lastResults = results;
    console.log('[Status] Check inicial concluído com sucesso');
  } catch (error) {
    console.error('[Status] Erro no check inicial:', error.message);
  }
})();

module.exports = {};
