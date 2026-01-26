const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const logger = require('./logger.servico');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps - VERSÃO ROBUSTA (CLIQUE & EXTRAÇÃO)
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) {
        // Se começa com 0, remove o zero (comum em números com operadora 0XX)
        limpo = limpo.substring(1);
    }

    // Se tem 10 ou 11 dígitos, adiciona 55 (Brasil)
    if (limpo.length === 10 || limpo.length === 11) {
        limpo = '55' + limpo;
    }

    // Se for 12 dígitos começando com 55 (sem o 9), tenta padronizar para 13 dígitos
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }

    if (limpo.length === 13 && limpo.startsWith('55')) {
        return limpo;
    }

    return limpo.length >= 10 ? limpo : null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[GMaps Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca robusta: ${niche} em ${city}`);

    const dddsValidos = obterDDDsDaCidade(city);
    const sessionId = Math.random().toString(36).substring(7);

    // Proxy com separador ';' (Crítico para DataImpulse)
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/chromium-browser');

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromePath,
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--lang=pt-BR,pt'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.setViewport({ width: 1280, height: 900 });

        const searchQuery = encodeURIComponent(`${niche} em ${city}`);
        log('Acessando Google Maps...');
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2', timeout: 60000 });

        const leads = [];
        const processedNames = new Set();
        let totalScrolled = 0;
        const maxScrolls = 50;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            log(`Processando página (${leads.length}/${limit})...`);

            // Scroll para carregar mais
            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) scrollable.scrollBy(0, 1000);
            });
            await new Promise(r => setTimeout(r, 2000));

            // Seletores de cards mais robustos
            const cards = await page.$$('div[role="article"], a[aria-label], .hfpxzc');
            log(`Cards brutos encontrados: ${cards.length}`);

            for (let i = 0; i < cards.length && leads.length < limit; i++) {
                try {
                    const card = cards[i];
                    // Tentar pegar o nome de várias formas
                    let name = await card.evaluate(el => {
                        const titleEl = el.querySelector('.qBF1Pd') || el.querySelector('.fontHeadlineSmall');
                        if (titleEl) return titleEl.innerText;
                        return el.getAttribute('aria-label') || el.innerText.split('\n')[0];
                    }).catch(() => null);

                    if (!name || processedNames.has(name)) continue;
                    processedNames.add(name);

                    log(`Analisando: ${name}...`);

                    // Clicar no card para abrir o painel lateral
                    await card.click();

                    // Aguardar o botão de telefone aparecer no painel lateral
                    // Usamos um timeout menor para não travar se não tiver telefone
                    let phoneFound = null;
                    try {
                        const btnSelector = 'button[data-item-id^="phone:tel:"]';
                        await page.waitForSelector(btnSelector, { timeout: 3000 });
                        phoneFound = await page.$eval(btnSelector, el => el.getAttribute('data-item-id').replace('phone:tel:', ''));
                    } catch (e) {
                        // Se não achou o botão, tenta Regex no texto do painel
                        phoneFound = await page.evaluate(() => {
                            const panel = document.querySelector('[role="main"]');
                            if (!panel) return null;
                            const match = panel.innerText.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
                            return match ? match[0] : null;
                        });
                    }

                    if (phoneFound) {
                        const whatsapp = formatarWhatsApp(phoneFound);
                        if (whatsapp && !leads.find(l => l.whatsapp === whatsapp)) {
                            if (validarDDD(whatsapp, dddsValidos)) {
                                leads.push({ nome: name, whatsapp });
                                log(`[✓] Sucesso: ${name} (${whatsapp})`);

                                await logger.info('prospeccao', 'Lead encontrado via Google Maps', {
                                    nome: name,
                                    whatsapp,
                                    niche,
                                    city
                                });
                            } else {
                                // log(`[-] DDD Inválido: ${whatsapp}`);
                            }
                        }
                    }

                    // Intervalo pequeno entre cliques para evitar bloqueio
                    await new Promise(r => setTimeout(r, 500));

                } catch (err) {
                    // Silently ignore individual card errors
                }
            }

            if (onProgress) {
                const perc = Math.min(Math.round((leads.length / limit) * 100), 99);
                onProgress({ p: perc });
            }

            totalScrolled++;
            const isEnd = await page.evaluate(() => document.body.innerText.includes('fim da lista'));
            if (isEnd && leads.length > 0) break;
        }

        log(`Busca concluída. Leads: ${leads.length}`);
        return leads;

    } catch (error) {
        log(`Erro fatal: ${error.message}`);
        return leads;
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
