const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const { formatarWhatsApp } = require('./gmaps.servico');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoInstagram(niche, city, limit = 150, onProgress = null) {
    return await buscarNaWeb('site:instagram.com', niche, city, limit, onProgress, 'Instagram');
}

async function buscarLeadsNoOLX(niche, city, limit = 150, onProgress = null) {
    return await buscarNaWeb('site:olx.com.br', niche, city, limit, onProgress, 'OLX');
}

async function buscarLeadsNoLinkedIn(niche, city, limit = 150, onProgress = null) {
    return await buscarNaWeb('site:linkedin.com/in/', niche, city, limit, onProgress, 'LinkedIn');
}

async function buscarNaWeb(site, niche, city, limit, onProgress, label) {
    const log = (msg) => {
        console.log(`[${label} Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    const dddsValidos = obterDDDsDaCidade(city);
    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium-browser',
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR']
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        const leads = [];
        const processed = new Set();

        // Multi-Step Search
        const queries = [
            `${site} "${niche}" "${city}" whatsapp`,
            `${site} "${niche}" "${city}" "9"`,
            `${site} "${niche}" ${city} "contato"`
        ];

        for (const queryText of queries) {
            if (leads.length >= limit) break;

            const url = `https://duckduckgo.com/lite/?q=${encodeURIComponent(queryText)}`;
            log(`Buscando: ${queryText}`);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const pageResults = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('.result-link').forEach(el => {
                    const title = el.innerText;
                    const snippet = el.closest('tr').nextElementSibling?.innerText || '';
                    items.push({ title, snippet });
                });
                return items;
            });

            for (const res of pageResults) {
                const fullText = res.title + ' ' + res.snippet;
                // Regex super agressivo que pega quase qualquer formato de número BR
                const numbers = fullText.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9\s?\d{4}[-\s]?\d{4}/g);

                if (numbers) {
                    for (const num of numbers) {
                        const whatsapp = formatarWhatsApp(num);
                        if (whatsapp && !processed.has(whatsapp) && validarDDD(whatsapp, dddsValidos)) {
                            processed.add(whatsapp);
                            leads.push({ nome: res.title.split(/[-|(@]/)[0].trim(), whatsapp });
                            log(`[✓] Sucesso: ${whatsapp}`);
                            if (leads.length >= limit) break;
                        }
                    }
                }
            }
            // Pequena pausa entre queries
            await new Promise(r => setTimeout(r, 2000));
        }

        return leads;
    } catch (e) {
        log(`Erro: ${e.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoInstagram, buscarLeadsNoOLX, buscarLeadsNoLinkedIn };
