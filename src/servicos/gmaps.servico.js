// src/servicos/gmaps.servico.js
// TITAN v8.2 - Google Maps Scraper com Extração por Clique e Fallback Automatizado

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const config = require('../config/titan.config');
const {
    getProxyWithFallback,
    switchToNextProxy,
    registerSuccess,
    registerFailure,
} = require('../antidetect/proxyHealth');
const { getConsistentIdentity, injectFingerprint } = require('../antidetect/fingerprintManager');
const { configurarContextoGeografico } = require('../antidetect/geoSync');
const { humanScroll } = require('../antidetect/humanScroll');
const { humanMouseMove, randomIdleMovement } = require('../antidetect/humanMouse');

puppeteer.use(StealthPlugin());

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Garante que diretórios de log existam
 */
function ensureLogDirs() {
    const dirs = [config.logging.screenshotDir, config.logging.htmlDir];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

/**
 * Salva screenshot de debug
 */
async function saveDebugScreenshot(page, label) {
    if (!config.logging.saveScreenshotsOnError) return null;

    try {
        ensureLogDirs();
        const filename = `${label}-${Date.now()}.png`;
        const filepath = path.join(config.logging.screenshotDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`[Debug] Screenshot: ${filename}`);
        return filepath;
    } catch (e) {
        return null;
    }
}

/**
 * Salva HTML de debug
 */
async function saveDebugHtml(page, label) {
    if (!config.logging.saveFailedHtml) return null;

    try {
        ensureLogDirs();
        const filename = `${label}-${Date.now()}.html`;
        const filepath = path.join(config.logging.htmlDir, filename);
        const html = await page.content();
        fs.writeFileSync(filepath, html);
        console.log(`[Debug] HTML: ${filename}`);
        return filepath;
    } catch (e) {
        return null;
    }
}

/**
 * Formata telefone para padrão WhatsApp (55XXXXXXXXXXX)
 * Mantido para compatibilidade com o sistema de mensagens
 */
function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = String(telefone).replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);

    if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;

    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        const primeiroDigito = resto.charAt(0);

        if (['6', '7', '8', '9'].includes(primeiroDigito)) {
            return `55${ddd}9${resto}`;
        }
    }

    return (limpo.length >= 12) ? limpo : null;
}

/**
 * Legado / Alias para formatarWhatsApp
 */
function formatarTelefone(telefone) {
    return formatarWhatsApp(telefone);
}

// ═══════════════════════════════════════════════════════════════════
// CRIAÇÃO DO BROWSER
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria browser com configuração anti-detecção e proxy
 */
async function criarBrowserAntiDetect(cidade, pais = 'br') {
    // 1. Obter proxy com fallback automático
    const proxyResult = await getProxyWithFallback(pais);

    if (!proxyResult.success) {
        throw new Error(`Falha ao obter proxy: ${proxyResult.error}`);
    }

    console.log(`[TITAN] Modo: ${proxyResult.name}${proxyResult.isDirect ? '' : ` (IP: ${proxyResult.ip})`}`);

    // 2. Gerar identidade consistente
    let identity;
    try {
        identity = await getConsistentIdentity('pt-BR');
        console.log(`[TITAN] Identidade: ${identity.os || 'Chromium'} (${identity.platform || 'General'})`);
    } catch (e) {
        console.log(`[TITAN] Usando identidade padrão: ${e.message}`);
        identity = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            headers: {},
        };
    }

    // 3. Configurar argumentos do browser
    const launchArgs = [...config.browser.defaultArgs];

    // Adicionar proxy se não for modo direto
    if (!proxyResult.isDirect && (proxyResult.url || proxyResult.host)) {
        const proxyHost = proxyResult.host || new URL(proxyResult.url).host;
        launchArgs.push(`--proxy-server=${proxyHost}`);
        console.log(`[TITAN] Proxy configurado: ${proxyHost}`);
    }

    // 4. Iniciar browser
    const browser = await puppeteer.launch({
        headless: config.browser.headless,
        args: launchArgs,
        defaultViewport: null,
        timeout: config.browser.timeout,
    });

    const page = await browser.newPage();

    // 5. Autenticação do proxy (se necessário)
    if (!proxyResult.isDirect) {
        const username = proxyResult.username || (proxyResult.url ? new URL(proxyResult.url).username : null);
        const password = proxyResult.password || (proxyResult.url ? new URL(proxyResult.url).password : null);

        if (username && password) {
            await page.authenticate({
                username: username,
                password: password,
            });
            console.log(`[TITAN] Autenticação do proxy configurada`);
        }
    }

    // 6. Injetar fingerprint
    try {
        if (identity.fingerprint) {
            await injectFingerprint(page, identity.fingerprint);
        }
    } catch (e) {
        console.log(`[TITAN] Fingerprint parcial: ${e.message}`);
    }

    // 7. Configurar contexto geográfico
    try {
        await configurarContextoGeografico(page, cidade);
    } catch (e) {
        console.log(`[TITAN] GeoSync parcial: ${e.message}`);
    }

    // 8. Configurar User-Agent e headers
    await page.setUserAgent(identity.userAgent);
    if (identity.headers && Object.keys(identity.headers).length > 0) {
        await page.setExtraHTTPHeaders(identity.headers);
    }

    // 9. Configurar viewport
    const viewport = identity.viewport || config.browser.defaultViewport;
    await page.setViewport(viewport);

    return {
        browser,
        page,
        proxyInfo: proxyResult,
        identity,
    };
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE NAVEGAÇÃO E EXTRAÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Fecha popups de consentimento do Google
 */
async function fecharPopups(page) {
    const popupSelectors = [
        'button[aria-label="Aceitar tudo"]',
        'button[aria-label="Accept all"]',
        'form[action*="consent"] button',
        '[aria-label="Fechar"]',
        '[aria-label="Close"]',
        'button.VfPpkd-LgbsSe[jsname]',
    ];

    for (const selector of popupSelectors) {
        try {
            const btn = await page.$(selector);
            if (btn) {
                const isVisible = await btn.isIntersectingViewport();
                if (isVisible) {
                    await btn.click();
                    console.log(`[Popup] Fechado: ${selector}`);
                    await sleep(1000);
                    return true;
                }
            }
        } catch (e) {
            // Continuar tentando outros seletores
        }
    }

    return false;
}

/**
 * Aguarda feed de resultados carregar
 */
async function aguardarFeed(page) {
    const feedSelectors = config.extraction.selectors.feed;
    const timeout = 60000; // Aumentado para 60s

    console.log(`[Feed] Aguardando feed de resultados... (max 60s)`);

    for (const selector of feedSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: timeout / feedSelectors.length });

            // Verificar se tem conteúdo
            const hasContent = await page.evaluate((sel) => {
                const feed = document.querySelector(sel);
                return feed && feed.children.length > 2;
            }, selector);

            if (hasContent) {
                console.log(`[Feed] Detectado com seletor: ${selector}`);
                return true;
            }
        } catch (e) {
            // Tentar próximo seletor
        }
    }

    return false;
}

/**
 * Extrai dados do painel lateral de um estabelecimento
 */
async function extrairDadosPainel(page) {
    const selectors = config.extraction.selectors;

    return await page.evaluate((sel) => {
        const resultado = {
            nome: '',
            telefone: '',
            endereco: '',
            avaliacao: '',
            website: '',
        };

        // Nome
        for (const s of sel.name) {
            const el = document.querySelector(s);
            if (el?.textContent?.trim()) {
                resultado.nome = el.textContent.trim();
                break;
            }
        }

        // Telefone
        for (const s of sel.phone) {
            const el = document.querySelector(s);
            if (el) {
                if (el.href?.startsWith('tel:')) {
                    resultado.telefone = el.href.replace('tel:', '');
                    break;
                } else if (el.textContent) {
                    const numeros = el.textContent.replace(/\D/g, '');
                    if (numeros.length >= 10) {
                        resultado.telefone = numeros;
                        break;
                    }
                }
            }
        }

        // Endereço
        for (const s of sel.address) {
            const el = document.querySelector(s);
            if (el?.textContent?.trim()) {
                resultado.endereco = el.textContent.trim();
                break;
            }
        }

        // Avaliação
        for (const s of sel.rating) {
            const el = document.querySelector(s);
            if (el) {
                const label = el.getAttribute('aria-label');
                if (label) {
                    resultado.avaliacao = label;
                    break;
                }
            }
        }

        // Website
        for (const s of sel.website) {
            const el = document.querySelector(s);
            if (el?.href && !el.href.includes('google.com')) {
                resultado.website = el.href;
                break;
            }
        }

        return resultado;
    }, selectors);
}

// ═══════════════════════════════════════════════════════════════════
// EXTRAÇÃO PRINCIPAL (MÉTODO CLIQUE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Extrai leads clicando em cada resultado para obter telefone
 */
async function extrairLeadsComClique(page, targetLeads = 50, onProgress = null) {
    const leads = [];
    const processados = new Set();
    let scrollAttempts = 0;
    const maxScrolls = config.limits.maxScrolls;
    const cardSelectors = config.extraction.selectors.card;

    console.log(`[Extrator] Iniciando extração por clique. Meta: ${targetLeads}`);

    while (leads.length < targetLeads && scrollAttempts < maxScrolls) {
        // 1. Buscar cards visíveis
        let cards = [];
        for (const selector of cardSelectors) {
            cards = await page.$$(selector);
            if (cards.length > 0) {
                break;
            }
        }

        if (cards.length === 0 && scrollAttempts === 0) {
            console.log('[Extrator] ⚠️ Nenhum card encontrado!');
            await saveDebugScreenshot(page, 'no-cards');
            break;
        }

        // 2. Processar cada card
        for (let i = 0; i < cards.length && leads.length < targetLeads; i++) {
            try {
                // Re-buscar cards (DOM pode ter mudado)
                let currentCards = [];
                for (const selector of cardSelectors) {
                    currentCards = await page.$$(selector);
                    if (currentCards.length > 0) break;
                }

                if (i >= currentCards.length) break;

                const card = currentCards[i];

                // Identificador único
                const cardId = await card.evaluate(el => {
                    return el.href || el.getAttribute('data-place-id') ||
                        el.textContent?.slice(0, 60) || Math.random().toString();
                }).catch(() => Math.random().toString());

                if (processados.has(cardId)) continue;
                processados.add(cardId);

                // 3. Scroll até o card e clicar
                await card.evaluate(el => el.scrollIntoView({ block: 'center' }));
                await sleep(randomInt(200, 400));

                await card.click();

                // 4. Aguardar painel abrir
                await sleep(randomInt(1200, 2000));

                try {
                    await page.waitForSelector('h1', { timeout: config.extraction.timing.waitForPanel });
                } catch (e) { }

                // 5. Extrair dados
                const dados = await extrairDadosPainel(page);

                // 6. Validar e adicionar
                if (dados.nome && dados.nome !== 'Resultados' && dados.nome.length > 2) {
                    const whatsapp = formatarWhatsApp(dados.telefone);

                    if (whatsapp) {
                        const lead = {
                            nome: dados.nome,
                            whatsapp: whatsapp,
                            endereco: dados.endereco || '',
                            avaliacao: dados.avaliacao || '',
                            website: dados.website || '',
                            fonte: 'gmaps-click-v82',
                            coletadoEm: new Date().toISOString(),
                        };

                        leads.push(lead);
                        console.log(`[LEAD] ${leads.length}. ${dados.nome} (${whatsapp})`);

                        if (onProgress) {
                            onProgress({ msg: `[LEAD] ${dados.nome} (${whatsapp})`, p: Math.round((leads.length / targetLeads) * 100), count: leads.length });
                        }
                    }
                }

                // 7. Pausa entre cliques
                await sleep(randomInt(
                    config.extraction.timing.betweenClicks.min,
                    config.extraction.timing.betweenClicks.max
                ));

            } catch (err) {
                continue;
            }
        }

        // Verificar se atingiu meta
        if (leads.length >= targetLeads) break;

        // 8. Scroll para mais resultados
        scrollAttempts++;

        try {
            await humanScroll(page, randomInt(
                config.humanBehavior.scroll.distance.min,
                config.humanBehavior.scroll.distance.max
            ));
        } catch (e) {
            await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) feed.scrollTop += 1500;
                else window.scrollBy(0, 1500);
            });
        }

        // Comportamento humano ocasional
        if (config.humanBehavior.mouse.enabled && Math.random() < config.humanBehavior.mouse.idleChance) {
            try {
                await randomIdleMovement(page);
            } catch (e) { }
        }

        await sleep(randomInt(
            config.humanBehavior.timing.betweenScrolls.min,
            config.humanBehavior.timing.betweenScrolls.max
        ));

        // 9. Verificar se há novos cards
        let novosCards = [];
        for (const selector of cardSelectors) {
            novosCards = await page.$$(selector);
            if (novosCards.length > 0) break;
        }

        if (novosCards.length <= processados.size && scrollAttempts > 5) break;
    }

    return leads;
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL COM RETRY E FALLBACK
// ═══════════════════════════════════════════════════════════════════

/**
 * Executa scraping com retry automático e fallback de proxy
 */
async function executarScrapingComFallback(termo, cidade, targetLeads = 50, onProgress = null) {
    let currentProxyInfo = null;
    let browser = null;
    let leads = [];
    const maxRetries = config.limits.maxRetriesPerSearch;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`\n[TITAN] ════ Tentativa ${attempt}/${maxRetries} ════\n`);

        try {
            // 1. Criar browser
            const browserData = await criarBrowserAntiDetect(cidade);
            browser = browserData.browser;
            currentProxyInfo = browserData.proxyInfo;
            const page = browserData.page;

            // 2. Navegar para busca
            const searchQuery = encodeURIComponent(`${termo} ${cidade}`);
            const url = `https://www.google.com/maps/search/${searchQuery}`;

            console.log(`[TITAN] Navegando: ${url}`);

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: config.browser.timeout,
            });

            // 3. Verificar URL
            const currentUrl = page.url();
            if (!currentUrl.includes('/maps/')) {
                throw new Error(`Redirecionado para URL inesperada: ${currentUrl}`);
            }

            // 4. Comportamento humano inicial
            try { await humanMouseMove(page, randomInt(300, 600), randomInt(200, 400)); } catch (e) { }
            await sleep(randomInt(config.humanBehavior.timing.initialPause.min, config.humanBehavior.timing.initialPause.max));

            // 5. Fechar popups
            await fecharPopups(page);

            // 6. Aguardar feed
            const feedOk = await aguardarFeed(page);

            if (!feedOk) {
                await saveDebugScreenshot(page, 'no-feed');
                throw new Error('Feed não carregou - possível bloqueio');
            }

            // 7. Extrair leads
            leads = await extrairLeadsComClique(page, targetLeads, onProgress);

            // 8. Avaliar resultado
            const minLeads = Math.floor(targetLeads * config.proxy.failureThresholds.minLeadsPercent);

            if (leads.length > 0) {
                registerSuccess(currentProxyInfo.type);
                break;
            } else {
                throw new Error('Zero leads coletados - tentando fallback');
            }

        } catch (error) {
            console.log(`[TITAN] ❌ Erro: ${error.message}`);

            if (currentProxyInfo) {
                registerFailure(currentProxyInfo.type, error.message);

                if (attempt < maxRetries) {
                    const nextProxy = await switchToNextProxy(currentProxyInfo.type);
                    if (nextProxy.success) {
                        console.log(`[TITAN] Próxima tentativa usará: ${nextProxy.name}`);
                    }
                }
            }

        } finally {
            if (browser) {
                try { await browser.close(); } catch (e) { }
                browser = null;
            }
        }
    }

    return {
        success: leads.length > 0,
        leads,
        total: leads.length,
        meta: targetLeads,
        taxaSucesso: ((leads.length / targetLeads) * 100).toFixed(1),
        proxyUsado: currentProxyInfo?.name || 'desconhecido',
    };
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO DE ENTRADA (API PÚBLICA)
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca leads no Google Maps - Versão TITAN v8.2
 */
async function buscarLeadsGoogleMaps(termo, cidade, quantidade = 50, onProgress = null) {
    const resultado = await executarScrapingComFallback(termo, cidade, quantidade, onProgress);
    return resultado.leads;
}

/**
 * Alias para compatibilidade com o sistema de prospecção e versões anteriores
 */
async function buscarLeadsNoMaps(niche, city, limit = 50, onProgress = null, jobId = null) {
    console.log(`[TITAN v8.2] Chamada via buscarLeadsNoMaps para: ${niche} em ${city}`);

    // Encapsular onProgress para logar no repositório se necessário
    const progressHandler = (p) => {
        if (onProgress) onProgress(p);
        if (jobId && p.msg) {
            const repo = require('../repositorios/prospeccao.repositorio');
            if (repo && repo.atualizarHistoricoScraping) {
                repo.atualizarHistoricoScraping(jobId, { log: p.msg });
            }
        }
    };

    return await buscarLeadsGoogleMaps(niche, city, limit, progressHandler);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    buscarLeadsGoogleMaps,
    buscarLeadsNoMaps, // Exportando para compatibilidade
    executarScrapingComFallback,
    criarBrowserAntiDetect,
    extrairLeadsComClique,
    formatarWhatsApp,
    formatarTelefone
};
