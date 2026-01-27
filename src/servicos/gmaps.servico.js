const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
// const logger = require('./logger.servico');

puppeteer.use(StealthPlugin());

/**
 * TITAN-ENGINE v4: O FINAL BOSS DO SCRAPING
 * Híbrido: Rede (XHR) + DOM (Fast Scan) + Intercepção de Protocolo
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);
    if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }
    return limpo.length >= 12 ? limpo : null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null, jobId = null) {
    const log = async (msg) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[TITAN-v4] ${msg}`);
        if (onProgress) onProgress({ msg });
        if (jobId) {
            try {
                // Import dinâmico para evitar quebras se o DB estiver offline
                const repo = require('../repositorios/prospeccao.repositorio');
                if (repo && repo.atualizarHistoricoScraping) {
                    await repo.atualizarHistoricoScraping(jobId, {
                        log: `[${timestamp}] ${msg}`
                    });
                }
            } catch (e) { }
        }
    };

    const dddsValidos = obterDDDsDaCidade(city);
    const searchQuery = encodeURIComponent(`${niche} em ${city}`);
    const sessionId = Math.random().toString(36).substring(7);

    // Proxies Residenciais
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-gpu', '--blink-settings=imagesEnabled=false'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        const leads = [];
        const seen = new Set();

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('search') || url.includes('rpc')) {
                try {
                    const text = await response.text();
                    const matches = text.match(/\["0x[a-f0-9]+:0x[a-f0-9]+",\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/g);
                    if (matches) {
                        for (const m of matches) {
                            const detail = m.match(/\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/);
                            if (detail && detail[1] && detail[2]) {
                                const nome = detail[1];
                                const whatsapp = formatarWhatsApp(detail[2]);
                                if (whatsapp && validarDDD(whatsapp, dddsValidos) && !seen.has(whatsapp)) {
                                    seen.add(whatsapp);
                                    leads.push({ nome, whatsapp });
                                    await log(`[LEAD] Novo lead encontrado: ${nome} (${whatsapp})`);
                                }
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        await log(`Buscando: ${niche} em ${city}...`);
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'domcontentloaded' });

        let scrolls = 0;
        const maxScrolls = 60;

        while (leads.length < limit && scrolls < maxScrolls) {
            const domLeads = await page.evaluate(() => {
                const items = [];
                const cards = document.querySelectorAll('div[role="article"]');
                cards.forEach(c => {
                    const name = c.querySelector('.qBF1Pd')?.innerText;
                    const text = c.innerText || "";
                    // Regex v4: Pega celular (com 9) e fixo opcionalmente
                    const phoneMatch = text.match(/(?:\(?\d{2}\)?\s?)?9\d{4}[-\s]?\d{4}/);
                    if (name && phoneMatch) items.push({ nome: name, telefone: phoneMatch[0] });
                });
                return items;
            });

            for (const item of domLeads) {
                const whatsapp = formatarWhatsApp(item.telefone);
                if (whatsapp && validarDDD(whatsapp, dddsValidos) && !seen.has(whatsapp)) {
                    seen.add(whatsapp);
                    leads.push({ nome: item.nome, whatsapp });
                    await log(`[LEAD] Novo lead encontrado: ${item.nome} (${whatsapp})`);
                }
            }

            if (onProgress && leads.length > 0) {
                onProgress({ p: Math.min(Math.round((leads.length / limit) * 100), 99) });
            }

            if (leads.length >= limit) break;

            await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) feed.scrollBy(0, 8000);
                else window.scrollBy(0, 8000);
            });

            await new Promise(r => setTimeout(r, 1200));
            scrolls++;

            const isEnd = await page.evaluate(() => document.body.innerText.includes('fim da lista'));
            if (isEnd) break;
        }

        await log(`Busca finalizada! ${leads.length} leads encontrados.`);
        return leads.slice(0, limit);

    } catch (error) {
        await log(`ERRO: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
