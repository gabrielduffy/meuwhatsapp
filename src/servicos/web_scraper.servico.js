const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const { formatarWhatsApp } = require('./gmaps.servico');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoInstagram(niche, city, limit = 150, onProgress = null, jobId = null) {
    return await buscarNaWeb('site:instagram.com', niche, city, limit, onProgress, 'Instagram', jobId);
}

async function buscarLeadsNoOLX(niche, city, limit = 150, onProgress = null, jobId = null) {
    return await buscarNaWeb('site:olx.com.br', niche, city, limit, onProgress, 'OLX', jobId);
}

async function buscarLeadsNoLinkedIn(niche, city, limit = 150, onProgress = null, jobId = null) {
    return await buscarNaWeb('site:linkedin.com/in/', niche, city, limit, onProgress, 'LinkedIn', jobId);
}

async function buscarLeadsNoFacebook(niche, city, limit = 150, onProgress = null, jobId = null) {
    return await buscarNaWeb('site:facebook.com', niche, city, limit, onProgress, 'Facebook', jobId);
}

async function buscarLeadsNoThreads(niche, city, limit = 150, onProgress = null, jobId = null) {
    return await buscarNaWeb('site:threads.net', niche, city, limit, onProgress, 'Threads', jobId);
}

async function buscarNaWeb(site, niche, city, limit, onProgress, label, jobId = null) {
    const log = async (msg) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[TITAN-${label}] ${msg}`);
        if (onProgress) onProgress({ msg });
        if (jobId) {
            try {
                const repo = require('../repositorios/prospeccao.repositorio');
                if (repo && repo.atualizarHistoricoScraping) {
                    await repo.atualizarHistoricoScraping(jobId, { log: `[${timestamp}][${label}] ${msg}` });
                }
            } catch (e) { }
        }
    };

    const dddsValidos = obterDDDsDaCidade(city);
    const PROXY_HOST = 'gw.dataimpulse.com:823';

    const leads = [];
    const processed = new Set();

    // DORKING AVANÇADO: foca em links diretos do WhatsApp indexados
    const searchQueries = [
        `${site} "${niche}" "${city}" "wa.me/55"`,
        `${site} "${niche}" "${city}" "9" "whatsapp"`,
        `${site} "${niche}" "${city}" "11" "9"`
    ];

    for (const query of searchQueries) {
        if (leads.length >= limit) break;

        const sessionId = Math.random().toString(36).substring(7);
        const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
        const PROXY_PASS = '8aebbfaa273d7787';

        const browser = await puppeteer.launch({
            headless: true,
            args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Usar normal DuckDuckGo com kl=br-pt
            const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=br-pt`;
            await log(`Buscando (v6): ${query}`);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));

            const texts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('article, .result, span, div, p'))
                    .map(el => el.innerText)
                    .filter(t => t && t.length > 20);
            });

            for (const text of texts) {
                // Regex para wa.me/ e números puros
                const waLinks = text.match(/wa\.me\/55(\d{10,11})/g) || [];
                const nums = text.match(/(?:\d{2}\s?)?9\d{4}[-\s]?\d{4}/g) || [];

                const allRaw = [...waLinks.map(l => l.replace('wa.me/', '')), ...nums];

                for (const n of allRaw) {
                    const whatsapp = formatarWhatsApp(n);
                    if (whatsapp && !processed.has(whatsapp) && validarDDD(whatsapp, dddsValidos)) {
                        processed.add(whatsapp);
                        leads.push({ nome: `${niche} - ${label}`, whatsapp });
                        console.log(`[✓] Lead Dork: ${whatsapp}`);
                        if (leads.length >= limit) break;
                    }
                }
                if (leads.length >= limit) break;
            }

        } catch (e) {
            await log(`Aviso: Erro na query.`);
        } finally {
            await browser.close();
        }
    }

    await log(`Busca em ${label} finalizada. Capturados: ${leads.length}`);
    return leads;
}

module.exports = {
    buscarLeadsNoInstagram,
    buscarLeadsNoOLX,
    buscarLeadsNoLinkedIn,
    buscarLeadsNoFacebook,
    buscarLeadsNoThreads
};
