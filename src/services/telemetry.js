const os = require('os');
const logger = require('../config/logger');

const telemetry = {
    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: Math.round(used.rss / 1024 / 1024),
            heapTotal: Math.round(used.heapTotal / 1024 / 1024),
            heapUsed: Math.round(used.heapUsed / 1024 / 1024),
            external: Math.round(used.external / 1024 / 1024),
            freeSystem: Math.round(os.freemem() / 1024 / 1024),
            totalSystem: Math.round(os.totalmem() / 1024 / 1024)
        };
    },

    logSystemHealth() {
        try {
            const mem = this.getMemoryUsage();
            const load = os.loadavg();

            logger.info('[Telemetry] System Health Check', {
                memory: `${mem.rss}MB (Heap: ${mem.heapUsed}/${mem.heapTotal}MB)`,
                load: `${load[0].toFixed(2)}, ${load[1].toFixed(2)}, ${load[2].toFixed(2)}`,
                uptime: Math.round(process.uptime())
            });

            if (mem.rss > 1500) { // Alerta se passar de 1.5GB
                logger.warn('[Telemetry] High Memory Usage Detected', mem);
            }
        } catch (err) {
            logger.error('[Telemetry] Error logging system health:', err.message);
        }
    },

    start() {
        // Log a cada 5 minutos
        setInterval(() => this.logSystemHealth(), 300000);
        logger.info('[Telemetry] System Monitoring Started');
    }
};

module.exports = telemetry;
