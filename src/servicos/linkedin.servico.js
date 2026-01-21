const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const { formatarWhatsApp } = require('./gmaps.servico');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoLinkedIn(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[LinkedIn Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca LinkedIn para: ${niche} em ${city}`);
    const dddsValidos = obterDDDsDaCidade(city);

    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/google-chrome');

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromePath,
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        const query = encodeURIComponent(`site:linkedin.com/in/ ("CEO" OR "Sócio" OR "Proprietário") "${niche}" "${city}" "9"`);
        log(`Buscando no Google: ${query}`);
        await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });

        const leads = [];
        let pages = 0;

        while (leads.length < limit && pages < 10) {
            log(`Analisando página ${pages + 1} do Google...`);

            const results = await page.evaluate(() => {
                const list = [];
                document.querySelectorAll('.g').forEach(el => {
                    const title = el.querySelector('h3')?.innerText;
                    const snippet = el.innerText;
                    const phoneMatch = snippet.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);

                    if (phoneMatch && title) {
                        list.push({ nome: title.split('-')[0].split('|')[0].trim(), rawPhone: phoneMatch[0] });
                    }
                });
                return list;
            });

            for (const item of results) {
                if (leads.length >= limit) break;
                const whatsapp = formatarWhatsApp(item.rawPhone);

                if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                    if (!leads.find(l => l.whatsapp === whatsapp)) {
                        leads.push({ nome: item.nome, whatsapp });
                        log(`[✓] Lead: ${item.nome} (${whatsapp})`);
                    }
                } else if (whatsapp) {
                    log(`[-] DDD Ignorado: ${whatsapp}`);
                }
            }

            if (onProgress) onProgress({ p: Math.min(Math.round((leads.length / limit) * 100), 99) });

            const nextButton = await page.$('#pnnext');
            if (nextButton && leads.length < limit) {
                await nextButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                pages++;
                await new Promise(r => setTimeout(r, 1000));
            } else {
                break;
            }
        }

        return leads;
    } catch (error) {
        log(`Erro: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoLinkedIn };
