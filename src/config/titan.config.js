// src/config/titan.config.js
// TITAN v8.2 - Configuração com Fallback Automático

const path = require('path');

module.exports = {
    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURAÇÃO DE PROXY COM FALLBACK AUTOMÁTICO
    // ═══════════════════════════════════════════════════════════════════
    proxy: {
        // Ordem de tentativas (fallback automático)
        strategy: ['direct', 'mobile', 'residential'],

        // Credenciais por tipo
        credentials: {
            mobile: {
                user: '339527bb72c72d38445',
                pass: 'a8233778245f279',
            },
            residential: {
                user: '14e775730d7037f4aad0',
                pass: '8aebbfaa273d7787',
            },
        },

        // Host comum
        host: 'gw.dataimpulse.com',
        port: '823',

        // Configurações por tipo
        types: {
            direct: {
                enabled: true,
                name: 'Direto (Sem Proxy)',
                prefix: null,
                costPerGB: 0,
                priority: 1,
            },
            mobile: {
                enabled: true,
                name: 'Mobile 4G/5G',
                prefix: '', // Mobile não usa prefixo, usa credencial separada
                costPerGB: 2.00,
                priority: 2,
            },
            residential: {
                enabled: true,
                name: 'Residencial',
                prefix: '__cr.br', // country residential brazil
                costPerGB: 1.00,
                priority: 3,
            },
        },

        // Quando considerar "falha" e trocar de estratégia
        failureThresholds: {
            zeroLeads: true,              // 0 leads = falha imediata
            minLeadsPercent: 0.3,         // Menos de 30% da meta = falha
            consecutiveFailures: 2,       // 2 falhas seguidas no mesmo tipo = cooldown
            errorPatterns: [              // Padrões de erro que indicam bloqueio
                'net::ERR_',
                'timeout',
                'blocked',
                'captcha',
                'unusual traffic',
                'ERR_PROXY',
                'ECONNREFUSED',
            ],
        },

        // Configurações de conexão
        connection: {
            testTimeout: 15000,           // 15s para testar proxy
            cooldownMinutes: 30,          // Tempo de "descanso" após falhas
            maxRetries: 3,                // Tentativas por tipo antes de trocar
            rotateSessionOnFail: true,    // Gerar nova sessão se falhar
        },
    },

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURAÇÃO DE EXTRAÇÃO (MÉTODO CLIQUE)
    // ═══════════════════════════════════════════════════════════════════
    extraction: {
        method: 'click', // 'click' = clica em cada resultado para pegar telefone

        // Seletores do Google Maps (com fallbacks)
        selectors: {
            // Container do feed de resultados
            feed: [
                'div[role="feed"]',
                '[data-results]',
                '.section-result',
                '#QA0Szd div[role="feed"]',
            ],
            // Cards individuais de estabelecimentos
            card: [
                'div[role="feed"] > div > div > a',
                '.Nv2PK a',
                'a[href*="/maps/place/"]',
                'div[role="article"] a',
            ],
            // Nome do estabelecimento (no painel lateral)
            name: [
                'h1.DUwDvf',
                'h1',
                '.fontHeadlineLarge',
                '[data-item-id="title"]',
            ],
            // Telefone
            phone: [
                'a[href^="tel:"]',
                'button[data-item-id*="phone"]',
                '[data-tooltip*="telefone"]',
                '[data-item-id="phone"]',
                'a[data-item-id*="phone"]',
            ],
            // Endereço
            address: [
                'button[data-item-id="address"]',
                '[data-item-id="address"]',
                '.rogA2c',
                'button[data-tooltip*="endereço"]',
            ],
            // Avaliação
            rating: [
                'span[aria-label*="estrela"]',
                'span.fontBodyMedium[aria-hidden]',
                '.F7nice span',
            ],
            // Website
            website: [
                'a[data-item-id="authority"]',
                'a[data-tooltip*="site"]',
                'a[href*="http"]:not([href*="google"])',
            ],
        },

        // Timing entre ações
        timing: {
            waitForPanel: 5000,
            waitForFeed: 15000,
            betweenClicks: { min: 600, max: 1400 },
            afterExtraction: { min: 300, max: 700 },
        },
    },

    // ═══════════════════════════════════════════════════════════════════
    // COMPORTAMENTO HUMANO
    // ═══════════════════════════════════════════════════════════════════
    humanBehavior: {
        scroll: {
            distance: { min: 1500, max: 2500 },
            steps: { min: 15, max: 25 },
            stepDelay: { min: 10, max: 25 },
            overshootChance: 0.3,
            overshootMax: 150,
        },
        mouse: {
            enabled: true,
            moveChance: 0.25,
            hoverChance: 0.15,
            idleChance: 0.10,
        },
        timing: {
            initialPause: { min: 2000, max: 4000 },
            betweenScrolls: { min: 1500, max: 3000 },
            readingTime: { min: 800, max: 2000 },
        },
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIMITES E SEGURANÇA
    // ═══════════════════════════════════════════════════════════════════
    limits: {
        maxScrolls: 35,
        maxLeadsPerSession: 120,
        maxSessionDuration: 6 * 60 * 1000, // 6 minutos
        pauseBetweenSessions: { min: 10000, max: 30000 },
        maxRetriesPerSearch: 3,
    },

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURAÇÃO DO BROWSER
    // ═══════════════════════════════════════════════════════════════════
    browser: {
        headless: true,
        defaultArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--no-first-run',
            '--window-size=1366,768',
            '--lang=pt-BR',
        ],
        defaultViewport: {
            width: 1366,
            height: 768,
        },
        timeout: 60000,
    },

    // ═══════════════════════════════════════════════════════════════════
    // LOGGING E DEBUG
    // ═══════════════════════════════════════════════════════════════════
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        saveScreenshotsOnError: true,
        screenshotDir: path.join(process.cwd(), 'logs', 'screenshots'),
        saveFailedHtml: true,
        htmlDir: path.join(process.cwd(), 'logs', 'html'),
    },
};
