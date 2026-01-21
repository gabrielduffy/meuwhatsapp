const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoInstagram(niche, city, limit = 150, onProgress = null) {
    console.log(`[Instagram Scraper] Iniciando busca com PROXY: ${niche} em ${city}`);

    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();
    await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

    // Bloquear recursos pesados
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        // Busca via Google para encontrar perfis do Instagram com WhatsApp na bio
        const query = encodeURIComponent(`site:instagram.com "${niche}" "${city}" "wa.me/" OR "api.whatsapp.com"`);
        await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });

        const leads = [];
        let pages = 0;

        while (leads.length < limit && pages < 5) {
            const results = await page.evaluate(() => {
                const list = [];
                document.querySelectorAll('.g').forEach(el => {
                    const title = el.querySelector('h3')?.innerText;
                    const snippet = el.innerText;
                    const waMatch = snippet.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/);

                    if (waMatch && title) {
                        list.push({ nome: title.split('(@')[0].trim(), whatsapp: waMatch[1] });
                    }
                });
                return list;
            });

            results.forEach(lead => {
                if (leads.length < limit && !leads.find(l => l.whatsapp === lead.whatsapp)) {
                    leads.push(lead);
                }
            });

            if (onProgress) onProgress(Math.min(Math.round((leads.length / limit) * 100), 99));

            const nextButton = await page.$('#pnnext');
            if (nextButton && leads.length < limit) {
                await nextButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                pages++;
            } else {
                break;
            }
        }

        return leads;
    } catch (error) {
        console.error('[Instagram Scraper] Erro:', error);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoInstagram };
