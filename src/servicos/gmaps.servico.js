const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps usando Puppeteer
 * VERSÃO 2.0 - Clica em cada estabelecimento para extrair telefone
 */

/**
 * Limpa e formata o telefone para o padrão 55DDD9XXXXXXXX
 */
function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);
    if (limpo.length === 10 || limpo.length === 11) {
        limpo = '55' + limpo;
    }
    if (limpo.length === 13 && limpo.startsWith('55')) {
        return limpo;
    }
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }
    return null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    console.log(`[GMaps Scraper] Iniciando busca com PROXY RESIDENCIAL: ${niche} em ${city}`);

    // Configurações do Proxy DataImpulse (Segmentação: Brasil)
    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--lang=pt-BR,pt'
        ]
    });
    console.log(`[GMaps Scraper] Navegador iniciado com Proxy em ${PROXY_HOST}`);

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    await page.authenticate({
        username: PROXY_USER,
        password: PROXY_PASS
    });

    // Otimização: Bloquear imagens e fontes
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'font'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.setViewport({ width: 1280, height: 720 });

    const searchQuery = encodeURIComponent(`${niche} em ${city}`);

    try {
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2', timeout: 60000 });

        const leads = [];
        const processedNames = new Set();
        let totalScrolled = 0;
        const maxScrolls = 50;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            // Scroll na lista
            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) {
                    scrollable.scrollBy(0, 1500);
                }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Pegar todos os cards visíveis
            const cards = await page.$$('div[role="article"]');
            console.log(`[GMaps Scraper] Encontrados ${cards.length} estabelecimentos no scroll ${totalScrolled + 1}`);

            for (let i = 0; i < cards.length && leads.length < limit; i++) {
                try {
                    // Pegar o nome antes de clicar
                    const name = await page.evaluate((index) => {
                        const cards = document.querySelectorAll('div[role="article"]');
                        return cards[index]?.querySelector('.qBF1Pd')?.innerText || null;
                    }, i);

                    if (!name || processedNames.has(name)) continue;
                    processedNames.add(name);

                    // Clicar no card
                    await page.evaluate((index) => {
                        const cards = document.querySelectorAll('div[role="article"]');
                        cards[index]?.click();
                    }, i);

                    // Aguardar painel lateral carregar
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // Extrair telefone do painel lateral
                    const phoneData = await page.evaluate(() => {
                        // Procurar botão de telefone
                        const phoneButton = document.querySelector('button[data-item-id^="phone:tel:"]');
                        if (phoneButton) {
                            const dataId = phoneButton.getAttribute('data-item-id');
                            const match = dataId.match(/phone:tel:(.+)/);
                            if (match) return match[1].replace(/\D/g, '');
                        }

                        // Fallback: procurar no texto do painel
                        const panel = document.querySelector('[role="main"]');
                        if (panel) {
                            const text = panel.innerText;
                            const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
                            if (phoneMatch) return phoneMatch[0];
                        }

                        return null;
                    });

                    if (phoneData) {
                        // Filtro de cidade
                        const nomeLower = name.toLowerCase();
                        const cidadeBuscaLower = city.toLowerCase();
                        const outrasCidades = ['curitiba', 'são paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 'porto alegre', 'fortaleza', 'salvador', 'manaus', 'recife'];

                        const mencaoOutraCidade = outrasCidades.find(c => c !== cidadeBuscaLower && nomeLower.includes(c));

                        if (mencaoOutraCidade && !nomeLower.includes(cidadeBuscaLower)) {
                            console.log(`[GMaps Scraper] ✗ Descartado (outra cidade): ${name}`);
                            continue;
                        }

                        const whatsapp = formatarWhatsApp(phoneData);
                        if (whatsapp && !leads.find(l => l.whatsapp === whatsapp)) {
                            leads.push({ nome: name, whatsapp: whatsapp });
                            console.log(`[GMaps Scraper] ✓ Lead #${leads.length}: ${name} - ${whatsapp}`);
                        }
                    }
                } catch (err) {
                    console.log(`[GMaps Scraper] Erro ao processar card ${i}:`, err.message);
                }
            }

            if (onProgress) {
                const progresso = Math.min(Math.round((leads.length / limit) * 100), 99);
                onProgress(progresso);
            }

            totalScrolled++;
        }

        console.log(`[GMaps Scraper] Finalizado. Total: ${leads.length} leads.`);
        return leads;

    } catch (error) {
        console.error('[GMaps Scraper] Erro durante o scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = {
    buscarLeadsNoMaps,
    formatarWhatsApp
};
