const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoLinkedIn(niche, city, limit = 150, onProgress = null) {
    console.log(`[LinkedIn Scraper] Iniciando busca de decisores: ${niche} em ${city}`);

    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

    try {
        // Busca decisores (CEO, Sócio, Proprietário) que colocam o contato no LinkedIn
        const query = encodeURIComponent(`site:linkedin.com/in/ ("CEO" OR "Sócio" OR "Proprietário") "${niche}" "${city}" "9"`);
        await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });

        const leads = [];
        let pages = 0;

        while (leads.length < limit && pages < 5) {
            const results = await page.evaluate(() => {
                const list = [];
                document.querySelectorAll('.g').forEach(el => {
                    const title = el.querySelector('h3')?.innerText;
                    const snippet = el.innerText;
                    // Procura por telefones no snippet
                    const phoneMatch = snippet.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);

                    if (phoneMatch && title) {
                        list.push({ nome: title.split('-')[0].trim(), rawPhone: phoneMatch[0] });
                    }
                });
                return list;
            });

            const { formatarWhatsApp } = require('./gmaps.servico');
            results.forEach(item => {
                const whatsapp = formatarWhatsApp(item.rawPhone);
                if (whatsapp && leads.length < limit && !leads.find(l => l.whatsapp === whatsapp)) {
                    leads.push({ nome: item.nome, whatsapp });
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
        console.error('[LinkedIn Scraper] Erro:', error);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoLinkedIn };
