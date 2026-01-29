// src/antidetect/proxyHealth.js
// TITAN v8.2 - Sistema de Proxy com Fallback Automático

const config = require('../config/titan.config');

// ═══════════════════════════════════════════════════════════════════
// STATUS E CACHE
// ═══════════════════════════════════════════════════════════════════

// Status de cada tipo de proxy
const proxyStatus = {
    direct: { failures: 0, lastFail: null, blocked: false, lastSuccess: null },
    mobile: { failures: 0, lastFail: null, blocked: false, lastSuccess: null },
    residential: { failures: 0, lastFail: null, blocked: false, lastSuccess: null },
};

// Cache de sessões ativas
const sessionCache = new Map();

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera ID de sessão único para sticky sessions
 */
function generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(16).slice(2, 10);
    return `titan_${timestamp}_${random}`;
}

/**
 * Pausa assíncrona
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Constrói URL do proxy baseado no tipo
 */
function buildProxyUrl(type, country = 'br') {
    const typeConfig = config.proxy.types[type];

    // Modo direto não usa proxy
    if (type === 'direct' || !typeConfig || typeConfig.prefix === null) {
        return null;
    }

    const credentials = config.proxy.credentials[type];
    if (!credentials) {
        console.log(`[Proxy] ⚠️ Credenciais não encontradas para: ${type}`);
        return null;
    }

    const sessionId = generateSessionId();
    const { host, port } = config.proxy;

    let username;

    if (type === 'mobile') {
        // Mobile: usa credencial direta com sessão
        // Formato: user__sid.SESSION
        username = `${credentials.user}__sid.${sessionId}`;
    } else {
        // Residential: usa prefixo de país
        // Formato: user__cr.br__sid.SESSION
        username = `${credentials.user}${typeConfig.prefix}__sid.${sessionId}`;
    }

    const url = `http://${username}:${credentials.pass}@${host}:${port}`;

    return {
        url,
        sessionId,
        type,
        username,
        host: `${host}:${port}`,
        password: credentials.pass
    };
}

/**
 * Testa conectividade do proxy
 */
async function testProxy(proxyUrl, timeout = null) {
    const testTimeout = timeout || config.proxy.connection.testTimeout;

    // Modo direto - testar conexão básica
    if (!proxyUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), testTimeout);

            const start = Date.now();
            const response = await fetch('https://api.ipify.org?format=json', {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            const latency = Date.now() - start;

            console.log(`[Proxy:Direct] IP ${data.ip} | Latência: ${latency}ms ✅`);
            return { success: true, ip: data.ip, latency, type: 'direct' };

        } catch (e) {
            console.log(`[Proxy:Direct] Erro: ${e.message}`);
            return { success: false, error: e.message, type: 'direct' };
        }
    }

    // Com proxy
    try {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        const agent = new HttpsProxyAgent(proxyUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), testTimeout);

        const start = Date.now();
        const response = await fetch('https://api.ipify.org?format=json', {
            agent,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        const latency = Date.now() - start;

        const status = latency > 5000 ? 'slow ⚠️' : 'healthy ✅';
        console.log(`[Proxy:Test] IP ${data.ip} | Latência: ${latency}ms | Status: ${status}`);

        return { success: true, ip: data.ip, latency };

    } catch (e) {
        console.log(`[Proxy:Test] Falhou: ${e.message}`);
        return { success: false, error: e.message };
    }
}

/**
 * Verifica se tipo está em cooldown
 */
function isInCooldown(type) {
    const status = proxyStatus[type];
    if (!status || !status.lastFail || !status.blocked) return false;

    const cooldownMs = config.proxy.connection.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - status.lastFail;

    if (elapsed >= cooldownMs) {
        // Cooldown expirou, resetar
        status.blocked = false;
        status.failures = 0;
        console.log(`[Proxy:${type}] Cooldown expirado, tipo liberado`);
        return false;
    }

    const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
    console.log(`[Proxy:${type}] Em cooldown por mais ${remaining} minutos`);
    return true;
}

/**
 * Registra falha
 */
function registerFailure(type, reason = '') {
    const status = proxyStatus[type];
    if (!status) return;

    status.failures++;
    status.lastFail = Date.now();

    const maxRetries = config.proxy.connection.maxRetries;

    if (status.failures >= maxRetries) {
        status.blocked = true;
        console.log(`[Proxy:${type}] ⛔ Bloqueado após ${status.failures} falhas. Entrando em cooldown.`);
    } else {
        console.log(`[Proxy:${type}] ⚠️ Falha ${status.failures}/${maxRetries}: ${reason}`);
    }
}

/**
 * Registra sucesso
 */
function registerSuccess(type) {
    const status = proxyStatus[type];
    if (!status) return;

    status.failures = 0;
    status.blocked = false;
    status.lastSuccess = Date.now();
    console.log(`[Proxy:${type}] ✅ Sucesso registrado`);
}

/**
 * Reseta status de um tipo manualmente
 */
function resetProxyStatus(type) {
    const status = proxyStatus[type];
    if (!status) return;

    status.failures = 0;
    status.blocked = false;
    status.lastFail = null;
    console.log(`[Proxy:${type}] Status resetado manualmente`);
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: OBTER PROXY COM FALLBACK
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtém proxy funcional seguindo estratégia de fallback
 * Ordem: direct → mobile → residential
 */
async function getProxyWithFallback(country = 'br') {
    const strategy = config.proxy.strategy;

    console.log(`[Proxy] Iniciando busca por proxy disponível...`);
    console.log(`[Proxy] Estratégia: ${strategy.join(' → ')}`);

    for (const type of strategy) {
        const typeConfig = config.proxy.types[type];

        // Verificar se está habilitado
        if (!typeConfig || !typeConfig.enabled) {
            console.log(`[Proxy:${type}] Desabilitado, pulando...`);
            continue;
        }

        // Verificar cooldown
        if (isInCooldown(type)) {
            continue;
        }

        console.log(`[Proxy] Tentando: ${typeConfig.name}...`);

        // Construir URL
        const proxyInfo = buildProxyUrl(type, country);
        const proxyUrl = proxyInfo?.url || null;

        // Testar conexão
        const testResult = await testProxy(proxyUrl);

        if (testResult.success) {
            console.log(`[Proxy] ✅ Usando: ${typeConfig.name}`);

            return {
                success: true,
                type,
                name: typeConfig.name,
                url: proxyUrl,
                username: proxyInfo?.username || null,
                password: proxyInfo?.password || null,
                sessionId: proxyInfo?.sessionId || null,
                ip: testResult.ip,
                latency: testResult.latency,
                isDirect: type === 'direct',
                host: proxyInfo?.host || null,
                credentials: type !== 'direct' ? config.proxy.credentials[type] : null,
            };
        }

        // Falhou, registrar e tentar próximo
        registerFailure(type, testResult.error || 'Teste falhou');
    }

    // Nenhum funcionou
    console.log('[Proxy] ❌ Todas as estratégias falharam!');

    return {
        success: false,
        error: 'Nenhum proxy disponível',
        triedTypes: strategy,
    };
}

/**
 * Força troca para próximo tipo na estratégia
 */
async function switchToNextProxy(currentType, country = 'br') {
    const strategy = config.proxy.strategy;
    const currentIndex = strategy.indexOf(currentType);

    // Marcar atual como falho
    registerFailure(currentType, 'Troca forçada para fallback');

    // Procurar próximo disponível
    for (let i = currentIndex + 1; i < strategy.length; i++) {
        const type = strategy[i];
        const typeConfig = config.proxy.types[type];

        if (!typeConfig || !typeConfig.enabled || isInCooldown(type)) {
            continue;
        }

        console.log(`[Proxy] Trocando: ${currentType} → ${type}`);

        const proxyInfo = buildProxyUrl(type, country);
        const testResult = await testProxy(proxyInfo?.url);

        if (testResult.success) {
            return {
                success: true,
                type,
                name: typeConfig.name,
                url: proxyInfo?.url || null,
                username: proxyInfo?.username || null,
                password: proxyInfo?.password || null,
                sessionId: proxyInfo?.sessionId || null,
                ip: testResult.ip,
                latency: testResult.latency,
                isDirect: type === 'direct',
                host: proxyInfo?.host || null,
            };
        }

        registerFailure(type, testResult.error);
    }

    return { success: false, error: 'Nenhum fallback disponível' };
}

/**
 * Gera nova sessão para o mesmo tipo (rotação de IP)
 */
function rotateSession(type, country = 'br') {
    if (type === 'direct') {
        return null;
    }

    console.log(`[Proxy:${type}] Rotacionando sessão...`);
    return buildProxyUrl(type, country);
}

/**
 * Retorna estatísticas dos proxies
 */
function getProxyStats() {
    return {
        status: { ...proxyStatus },
        config: {
            strategy: config.proxy.strategy,
            types: Object.entries(config.proxy.types).map(([key, val]) => ({
                type: key,
                name: val.name,
                enabled: val.enabled,
                cost: val.costPerGB,
            })),
        },
    };
}

/**
 * Limpa cooldowns (útil para debug/teste)
 */
function clearAllCooldowns() {
    for (const type of Object.keys(proxyStatus)) {
        resetProxyStatus(type);
    }
    console.log('[Proxy] Todos os cooldowns limpos');
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    // Principais
    getProxyWithFallback,
    switchToNextProxy,
    rotateSession,

    // Controle de status
    registerFailure,
    registerSuccess,
    resetProxyStatus,
    clearAllCooldowns,

    // Utilitários
    testProxy,
    buildProxyUrl,
    generateSessionId,
    getProxyStats,
    isInCooldown,
};
