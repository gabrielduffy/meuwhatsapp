const logger = require('../config/logger');

/**
 * Sistema simples de Circuit Breaker para Webhooks
 * Evita que o sistema tente enviar webhooks para destinos que estão offline repetidamente
 */
class CircuitBreaker {
    constructor() {
        this.states = new Map(); // url -> state
        this.threshold = 5; // Falhas seguidas para abrir o circuito
        this.resetTimeout = 60000 * 5; // 5 minutos para tentar fechar novamente
    }

    isAvailable(url) {
        const state = this.states.get(url);
        if (!state) return true;

        if (state.status === 'OPEN') {
            const now = Date.now();
            if (now - state.lastFailure > this.resetTimeout) {
                state.status = 'HALF-OPEN';
                logger.info(`[CircuitBreaker] Circuito para ${url} está HALF-OPEN. Tentando novamente...`);
                return true;
            }
            return false;
        }

        return true;
    }

    recordSuccess(url) {
        this.states.delete(url);
    }

    recordFailure(url) {
        let state = this.states.get(url) || { failures: 0, status: 'CLOSED' };
        state.failures++;
        state.lastFailure = Date.now();

        if (state.failures >= this.threshold) {
            if (state.status !== 'OPEN') {
                state.status = 'OPEN';
                logger.warn(`[CircuitBreaker] Circuito para ${url} está ABERTO após ${state.failures} falhas.`);
            }
        }

        this.states.set(url, state);
    }
}

module.exports = new CircuitBreaker();
