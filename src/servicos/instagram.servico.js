const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoInstagram(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[Instagram Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca Instagram para: ${niche} em ${city}`);
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
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const query = encodeURIComponent(`site:instagram.com "${niche}" "${city}" "wa.me/" OR "api.whatsapp.com"`);
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
                    const waMatch = snippet.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/);

                    if (waMatch && title) {
                        list.push({ nome: title.split('(@')[0].split('•')[0].trim(), rawPhone: waMatch[1] });
                    }
                });
                return list;
            });

            for (const item of results) {
                if (leads.length >= limit) break;

                let phone = item.rawPhone;
                if (!phone.startsWith('55') && phone.length <= 11) phone = '55' + phone;

                if (validarDDD(phone, dddsValidos)) {
                    if (!leads.find(l => l.whatsapp === phone)) {
                        leads.push({ nome: item.nome, whatsapp: phone });
                        log(`[✓] Lead: ${item.nome} (${phone})`);
                    }
                } else {
                    log(`[-] DDD Ignorado: ${phone}`);
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

module.exports = { buscarLeadsNoInstagram };
