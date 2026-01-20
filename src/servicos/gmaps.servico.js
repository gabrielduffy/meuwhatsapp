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

async function buscarLeadsNoMaps(niche, city, limit = 150) {
    console.log(`[GMaps Scraper] Iniciando busca (Puppeteer): ${niche} em ${city} (limite: ${limit})`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const searchQuery = encodeURIComponent(`${niche} em ${city}`);

    try {
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2' });

        const leads = [];
        let totalScrolled = 0;
        const maxScrolls = 30;

        while (leads.length < limit && totalScrolled < maxScrolls) {
            await page.evaluate(() => {
                const scrollable = document.querySelector('div[role="feed"]');
                if (scrollable) {
                    scrollable.scrollBy(0, 1000);
                }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

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
                const whatsapp = formatarWhatsApp(item.rawPhone);
                if (whatsapp && !leads.find(l => l.whatsapp === whatsapp)) {
                    leads.push({ nome: item.name, whatsapp: whatsapp });
                }
            }

            console.log(`[GMaps Scraper] Coletados: ${leads.length} leads...`);

            const isEnd = await page.evaluate(() => {
                return document.body.innerText.includes('Você chegou ao fim da lista') ||
                    document.body.innerText.includes('Não encontramos resultados');
            });

            if (isEnd) break;
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
