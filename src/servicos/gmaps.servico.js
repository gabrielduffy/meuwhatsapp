const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps - VERSÃO RESTAURADA E ESTABILIZADA
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);
    if (limpo.length === 10 || limpo.length === 11) {
        limpo = '55' + limpo;
    }
    if (limpo.length === 13 && limpo.startsWith('55')) {
        return limpo;
    }
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }
    return null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[GMaps Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca otimizada: ${niche} em ${city}`);

    const dddsValidos = obterDDDsDaCidade(city);
    const sessionId = Math.random().toString(36).substring(7);

    // CORREÇÃO CRÍTICA DO PROXY: Separador ';' é obrigatório
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
        await page.setViewport({ width: 1280, height: 800 });

        const searchQuery = encodeURIComponent(`${niche} em ${city}`);
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2', timeout: 60000 });

        const leads = [];
        const processedNames = new Set();
        let totalScrolled = 0;
        const maxScrolls = 60;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            log(`Minerando página... (${leads.length} encontrados)`);

            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) scrollable.scrollBy(0, 1000);
            });

            await new Promise(r => setTimeout(r, 2000));

            // EXTRAÇÃO DIRETA (A que funcionava antes)
            const results = await page.evaluate(() => {
                const list = [];
                const cards = document.querySelectorAll('div[role="article"]');
                cards.forEach(card => {
                    const name = card.querySelector('.qBF1Pd')?.innerText;
                    const text = card.innerText;
                    const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
                    if (name && phoneMatch) {
                        list.push({ name, rawPhone: phoneMatch[0] });
                    }
                });
                return list;
            });

            for (const item of results) {
                if (leads.length >= limit) break;
                if (processedNames.has(item.name)) continue;
                processedNames.add(item.name);

                const whatsapp = formatarWhatsApp(item.rawPhone);
                if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                    if (!leads.find(l => l.whatsapp === whatsapp)) {
                        leads.push({ nome: item.name, whatsapp });
                    }
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

        log(`Busca finalizada com ${leads.length} contatos.`);
        return leads;

    } catch (error) {
        log(`Erro: ${error.message}`);
        return leads; // Retorna o que conseguiu
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
