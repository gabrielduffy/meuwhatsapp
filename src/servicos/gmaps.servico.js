const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');

puppeteer.use(StealthPlugin());

/**
 * TITAN-ENGINE v7: "Rede de Arrasto" (Maps Deep Scraper)
 * Inspirado na eficiência do Outscraper: Foco em XHR/Network Interception + Scroll Infinito Real
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);

    // Se for um número brasileiro sem 55 mas com DDD
    if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;

    // Normalização de celular (adicionando o 9 se faltar)
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }

    return (limpo.length >= 12) ? limpo : null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null, jobId = null) {
    const log = async (msg) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[TITAN-v7] ${msg}`);
        if (onProgress) onProgress({ msg });
        if (jobId) {
            try {
                const repo = require('../repositorios/prospeccao.repositorio');
                if (repo && repo.atualizarHistoricoScraping) {
                    await repo.atualizarHistoricoScraping(jobId, { log: `[${timestamp}] ${msg}` });
                }
            } catch (e) { }
        }
    };

    const dddsValidos = obterDDDsDaCidade(city);
    const searchQuery = encodeURIComponent(`${niche} em ${city}`);
    const sessionId = Math.random().toString(36).substring(7);

    // Proxies Residenciais de Alta Performance
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const leads = [];
        const seenPhones = new Set();
        const seenNames = new Set();

        // 🛡️ INTERCEPTAÇÃO DE REDE V7 (A AGRESSIVA)
        page.on('response', async (res) => {
            const url = res.url();
            if (url.includes('google.com/maps/preview/search') || url.includes('google.com/maps/rpc')) {
                try {
                    const text = await res.text();

                    // 1. Captura via Regex de Estrutura (Nome + Telefone)
                    const matches = text.match(/\["0x[a-f0-9]+:0x[a-f0-9]+",\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/g) || [];
                    for (const m of matches) {
                        const detail = m.match(/\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/);
                        if (detail && detail[1] && detail[2]) {
                            const nome = detail[1];
                            const telefoneRaw = detail[2];
                            const whatsapp = formatarWhatsApp(telefoneRaw);

                            if (whatsapp && validarDDD(whatsapp, dddsValidos) && !seenPhones.has(whatsapp)) {
                                seenPhones.add(whatsapp);
                                seenNames.add(nome);
                                leads.push({ nome, whatsapp, origem: 'network-struct' });
                                await log(`[LEAD] Encontrado via Rede (Estruturado): ${nome} (${whatsapp})`);
                            }
                        }
                    }

                    // 2. Coletor Universal (Regex de Telefone em qualquer lugar do JSON)
                    const anyPhones = text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9\d{4}[-\s]?\d{4}/g) || [];
                    for (const p of anyPhones) {
                        const whatsapp = formatarWhatsApp(p);
                        if (whatsapp && validarDDD(whatsapp, dddsValidos) && !seenPhones.has(whatsapp)) {
                            seenPhones.add(whatsapp);
                            leads.push({ nome: `${niche} (Maps)`, whatsapp, origem: 'network-any' });
                            await log(`[LEAD] Encontrado via Rede (Varredura): ${whatsapp}`);
                        }
                    }
                } catch (e) { }
            }
        });

        await log(`Iniciando TITAN-v7 para: ${niche} em ${city}...`);
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        let scrollsSemNovos = 0;
        const maxScrollsSemNovos = 15;
        let lastLeadsCount = 0;

        // 🌀 SMART SCROLL V7: Scroll infinito real até bater o limite
        while (leads.length < limit && scrollsSemNovos < maxScrollsSemNovos) {

            // 🔍 EXTRAÇÃO VIA DOM (Fallback e Complemento)
            const domItems = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('div[role="article"]');
                cards.forEach(card => {
                    const nameEl = card.querySelector('.qBF1Pd');
                    const text = card.innerText || "";
                    // Regex v7: Captura padrão de telefone brasileiro no texto do card (celulares e fixos)
                    const phoneMatch = text.match(/(?:\(?\d{2}\)?\s?)?9\d{4}[-\s]?\d{4}/) || text.match(/(?:\(?\d{2}\)?\s?)?\d{4}[-\s]?\d{4}/);
                    if (nameEl && phoneMatch) {
                        results.push({ nome: nameEl.innerText, telefone: phoneMatch[0] });
                    }
                });
                return results;
            });

            for (const item of domItems) {
                const whatsapp = formatarWhatsApp(item.telefone);
                if (whatsapp && validarDDD(whatsapp, dddsValidos) && !seenPhones.has(whatsapp)) {
                    seenPhones.add(whatsapp);
                    seenNames.add(item.nome);
                    leads.push({ nome: item.nome, whatsapp, origem: 'dom' });
                    await log(`[LEAD] Encontrado via DOM: ${item.nome} (${whatsapp})`);
                }
            }

            if (onProgress) {
                onProgress({
                    p: Math.min(Math.round((leads.length / limit) * 100), 99),
                    count: leads.length
                });
            }

            if (leads.length >= limit) break;

            // 🖱️ SMART SCROLL ACTION (Agressivo)
            await page.evaluate(async () => {
                const scrollContainer = document.querySelector('div[role="feed"]') ||
                    document.querySelector('.m67q60eb6Zt__column') ||
                    window;

                if (scrollContainer === window) {
                    window.scrollBy(0, 10000);
                } else {
                    scrollContainer.scrollBy(0, 10000);
                }
            });

            // Aguarda o Google carregar mais dados (XHR)
            await new Promise(r => setTimeout(r, 2500));

            // Detector de Estagnação
            if (leads.length === lastLeadsCount) {
                scrollsSemNovos++;
                await log(`Aguardando mais resultados... (${scrollsSemNovos}/${maxScrollsSemNovos})`);
            } else {
                scrollsSemNovos = 0;
            }
            lastLeadsCount = leads.length;

            // Verifica se chegamos ao fim da lista real
            const isEnd = await page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                const endSelectors = ['.HlvSq', '.m67q60eb6Zt__res-end', '.PbZDve'];
                const hasEndClass = endSelectors.some(s => document.querySelector(s) !== null);

                return bodyText.includes('fim da lista') ||
                    bodyText.includes('não encontramos mais resultados') ||
                    hasEndClass;
            });

            if (isEnd) {
                await log("Fim da lista alcançado pelo Google.");
                // Tenta um último scroll forçado
                await page.evaluate(() => window.scrollBy(0, 5000));
                await new Promise(r => setTimeout(r, 1500));
                if (leads.length === lastLeadsCount) break;
            }
        }

        await log(`Extração concluída! Leads Totais: ${leads.length}`);
        return leads.slice(0, limit);

    } catch (error) {
        await log(`ERRO CRÍTICO NO TITAN-v7: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
