const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps usando Puppeteer 
 * Versão Estabilizada para Windows e Multi-Busca
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);

    // Se for 10 ou 11 dígitos, é BR, adiciona 55
    if (limpo.length === 10 || limpo.length === 11) {
        limpo = '55' + limpo;
    }

    // Se for 13 dígitos e começa com 55, tá certo
    if (limpo.length === 13 && limpo.startsWith('55')) {
        return limpo;
    }

    // Se for 12 dígitos (DDD sem o 9), tenta padronizar
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }
    return null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[GMaps Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca: ${niche} em ${city}`);

    const dddsValidos = obterDDDsDaCidade(city);
    if (dddsValidos.length > 0) {
        log(`Filtro de DDD ativo para: ${dddsValidos.join(', ')}`);
    }

    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    // Fallback dinâmico de caminhos do Chrome (Windows / Linux)
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/google-chrome'); // Caminho comum no Linux/Docker

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
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.setViewport({ width: 1280, height: 800 });

        const searchQuery = encodeURIComponent(`${niche} em ${city}`);
        log(`Abrindo Google Maps...`);
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2', timeout: 60000 });

        const leads = [];
        const processedNames = new Set();
        let totalScrolled = 0;
        const maxScrolls = 40;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            log(`Scroll ${totalScrolled + 1}/${maxScrolls} | Encontrados: ${leads.length}`);

            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) {
                    scrollable.scrollBy(0, 1200);
                }
            });

            await new Promise(r => setTimeout(r, 2000));

            // Pega todos os cards de estabelecimentos
            const cards = await page.$$('div[role="article"]');

            for (let i = 0; i < cards.length && leads.length < limit; i++) {
                try {
                    // Extração robusta do nome e telefone (se visível) direto do card
                    const cardData = await page.evaluate((idx) => {
                        const allCards = document.querySelectorAll('div[role="article"]');
                        const card = allCards[idx];
                        if (!card) return null;

                        const name = card.querySelector('.qBF1Pd')?.innerText;

                        // Busca telefone no texto bruto do card (às vezes o Google mostra no snippet)
                        const text = card.innerText;
                        const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
                        const phoneSnippet = phoneMatch ? phoneMatch[0] : null;

                        return { name, phoneSnippet };
                    }, i);

                    if (!cardData?.name || processedNames.has(cardData.name)) continue;
                    processedNames.add(cardData.name);

                    let phoneFound = cardData.phoneSnippet;

                    // Se não achou o telefone no snippet, vamos clicar para abrir o painel lateral
                    if (!phoneFound) {
                        log(`Tentando extrair telefone de ${cardData.name} (clicando no card)...`);
                        await page.evaluate((idx) => {
                            const allCards = document.querySelectorAll('div[role="article"]');
                            allCards[idx]?.click();
                        }, i);

                        await new Promise(r => setTimeout(r, 1500));

                        phoneFound = await page.evaluate(() => {
                            // Tenta seletores de botão de telefone
                            const btn = document.querySelector('button[data-item-id^="phone:tel:"]');
                            if (btn) return btn.getAttribute('data-item-id').replace('phone:tel:', '');

                            // Tenta encontrar qualquer telefone por Regex no painel lateral completo
                            const mainPanel = document.querySelector('[role="main"]') || document.body;
                            const match = mainPanel.innerText.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
                            return match ? match[0] : null;
                        });
                    }

                    if (phoneFound) {
                        const whatsapp = formatarWhatsApp(phoneFound);
                        if (whatsapp && !leads.find(l => l.whatsapp === whatsapp)) {
                            // Validação de DDD
                            if (validarDDD(whatsapp, dddsValidos)) {
                                leads.push({ nome: cardData.name, whatsapp });
                                log(`[✓] Lead: ${cardData.name} (${whatsapp})`);
                            } else {
                                log(`[-] Pulei: ${cardData.name} (DDD ${whatsapp.substring(2, 4)} não bate com ${city})`);
                            }
                        }
                    } else {
                        // Log opcional para saber que pulei porque não achei o telefone
                        // log(`[?] Sem telefone: ${cardData.name}`);
                    }
                } catch (e) {
                    continue; // Segue para o próximo estabelecimento se der erro em um
                }
            }

            if (onProgress) {
                const perc = Math.min(Math.round((leads.length / limit) * 100), 99);
                onProgress({ p: perc });
            }

            totalScrolled++;

            // Verifica se chegou ao fim
            const isEnd = await page.evaluate(() => document.body.innerText.includes('fim da lista'));
            if (isEnd) break;
        }

        log(`Busca finalizada. Total: ${leads.length}`);
        return leads;

    } catch (error) {
        log(`ERRO FATAL: ${error.message}`);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
