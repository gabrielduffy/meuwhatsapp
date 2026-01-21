const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/**
 * Serviço de Scraping do Google Maps usando Puppeteer
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
    // Geramos um ID de sessão aleatório para forçar uma troca de IP real a cada nova busca
    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br__sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--font-render-hinting=none',
            '--lang=pt-BR,pt'
        ]
    });
    console.log(`[GMaps Scraper] Navegador iniciado com Proxy em ${PROXY_HOST}`);

    const page = await browser.newPage();

    // Forçar idioma Português para o Google não se perder
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    // Autenticação do Proxy
    await page.authenticate({
        username: PROXY_USER,
        password: PROXY_PASS
    });

    // Otimização: Bloquear imagens e fontes (mantemos CSS para o layout do Maps não quebrar)
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
        let totalScrolled = 0;
        const maxScrolls = 100; // Aumentado para buscar até 150 contatos

        while (leads.length < limit && totalScrolled < maxScrolls) {
            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) {
                    scrollable.scrollBy(0, 1500);
                }
            });

            // Esperar o Google carregar novos contatos
            await new Promise(resolve => setTimeout(resolve, 3000));

            const items = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('div[role="article"]');

                cards.forEach(card => {
                    const name = card.querySelector('.qBF1Pd')?.innerText;
                    const text = card.innerText;
                    const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
                    const phone = phoneMatch ? phoneMatch[0] : null;

                    if (name && phone) {
                        results.push({ name, rawPhone: phone });
                    }
                });
                return results;
            });

            for (const item of items) {
                if (leads.length >= limit) break;

                // Filtro de segurança: Se o nome da empresa contém outra cidade grande, ignoramos
                // Isso evita que buscas no Rio tragam empresas chamadas "Contabilidade Curitiba"
                const nomeLower = item.name.toLowerCase();
                const cidadeBuscaLower = city.toLowerCase();

                // Se o nome contém uma cidade que não é a da busca (ex: nome tem "Curitiba" e busca é "Rio")
                // mas permitimos se o nome contiver a própria cidade da busca
                const outrasCidades = ['curitiba', 'são paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 'porto alegre', 'fortaleza', 'salvador', 'manaus', 'recife'];
                const encontrouOutraCidade = outrasCidades.find(c => c !== cidadeBuscaLower && nomeLower.includes(c));

                if (encontrouOutraCidade && !nomeLower.includes(cidadeBuscaLower)) {
                    console.log(`[GMaps Scraper] Ignorando lead de outra cidade: ${item.name}`);
                    continue;
                }

                const whatsapp = formatarWhatsApp(item.rawPhone);
                if (whatsapp && !leads.find(l => l.whatsapp === whatsapp)) {
                    leads.push({ nome: item.name, whatsapp: whatsapp });
                }
            }

            console.log(`[GMaps Scraper] Coletados: ${leads.length} leads... (${totalScrolled + 1}/${maxScrolls} scrolls)`);

            const isEnd = await page.evaluate(() => {
                const text = document.body.innerText;
                return text.includes('Você chegou ao fim da lista') ||
                    text.includes('You\'ve reached the end of the list') ||
                    text.includes('Não encontramos resultados');
            });

            if (onProgress) {
                const progresso = Math.min(Math.round((leads.length / limit) * 100), 99);
                onProgress(progresso);
            }

            if (isEnd && leads.length > 5) break;
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
