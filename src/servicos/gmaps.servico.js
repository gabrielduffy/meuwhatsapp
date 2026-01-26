const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const logger = require('./logger.servico');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps - VERSÃO ULTRA-RÁPIDA (BATCH EXTRACTION)
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) {
        limpo = limpo.substring(1);
    }

    if (limpo.length === 10 || limpo.length === 11) {
        limpo = '55' + limpo;
    }

    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }

    if (limpo.length === 13 && limpo.startsWith('55')) {
        return limpo;
    }

    return limpo.length >= 10 ? limpo : null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[GMaps Fast] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca ultra-rápida: ${niche} em ${city}`);

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

        // OTIMIZAÇÃO: Bloquear recursos pesados para velocidade extrema
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const leads = [];
        const processedNames = new Set();

        // INTERCEPTAÇÃO: "Ouvir" os dados brutos que o Google envia
        page.on('response', async (response) => {
            const url = response.url();
            // Filtra as respostas de busca que contém os dados das empresas
            if (url.includes('search?authuser') || url.includes('search?tbm=map')) {
                try {
                    const text = await response.text();
                    // O Google envia dados em um formato compactado. 
                    // Este Regex captura o par [Nome, Telefone] direto do fluxo de dados
                    const matches = text.match(/\["0x[a-f0-9]+:0x[a-f0-9]+",\[null,"([^"]+)"\],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"(\+?\d{1,3}[\s-]?\(?\d{2,3}\)?[\s-]?9?\d{4}[\s-]?\d{4})"/g);

                    if (matches) {
                        for (const match of matches) {
                            const [_, nome, telefone] = match.match(/\[null,"([^"]+)"\].*,"(\+?\d[^"]+)"/) || [];
                            if (nome && telefone && !processedNames.has(nome)) {
                                const whatsapp = formatarWhatsApp(telefone);
                                if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                                    processedNames.add(nome);
                                    leads.push({ nome, whatsapp });
                                    log(`[RAW-DATA] Encontrado: ${nome}`);
                                    await logger.info('prospeccao', 'Lead interceptado via rede (GMaps)', { nome, whatsapp });
                                }
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        await page.setViewport({ width: 800, height: 600 });
        const searchQuery = encodeURIComponent(`${niche} em ${city}`);

        log('Motor em modo de escuta (Network Intercept). Carregando...');
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

        let totalScrolled = 0;
        const maxScrolls = 40;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            log(`Extração via Rede: ${leads.length}/${limit} contatos`);

            // Scroll mega-rápido para forçar novas requisições XHR
            await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) feed.scrollBy(0, 5000);
                else window.scrollBy(0, 5000);
            });

            await new Promise(r => setTimeout(r, 1500));

            if (onProgress) {
                onProgress({ p: Math.min(Math.round((leads.length / limit) * 100), 99) });
            }

            totalScrolled++;
            const isEnd = await page.evaluate(() => document.body.innerText.includes('fim da lista'));
            if (isEnd) break;
        }

        log(`Busca concluída. Leads: ${leads.length}`);
        return leads;

    } catch (error) {
        log(`Erro fatal: ${error.message}`);
        return leads;
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
