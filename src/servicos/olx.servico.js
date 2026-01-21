const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const { formatarWhatsApp } = require('./gmaps.servico');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoOLX(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[OLX Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca OLX para: ${niche} em ${city}`);
    const dddsValidos = obterDDDsDaCidade(city);
    const sessionId = Math.random().toString(36).substring(7);
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
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        const query = encodeURIComponent(`site:olx.com.br ${niche} ${city} whatsapp`);
        log(`Buscando no Bing: ${query}`);
        await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'networkidle2' });

        const results = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.b_algo').forEach(el => {
                const title = el.querySelector('h2')?.innerText;
                const snippet = el.innerText;
                const phoneMatch = snippet.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
                if (phoneMatch && title) {
                    list.push({ nome: title.split('|')[0].trim(), rawPhone: phoneMatch[0] });
                }
            });
            return list;
        });

        const leads = [];
        for (const item of results) {
            const whatsapp = formatarWhatsApp(item.rawPhone);
            if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                leads.push({ nome: item.nome, whatsapp });
            }
        }
        return leads;
    } catch (e) {
        log(`Erro: ${e.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoOLX };
