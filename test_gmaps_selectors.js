const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function testSelectors() {
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${Math.random().toString(36).substring(7)}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    console.log('Iniciando teste de seletores GMaps...');

    const browser = await puppeteer.launch({
        headless: true, // Use headless for now
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });

        const niche = 'Restaurantes';
        const city = 'São Paulo';
        const url = `https://www.google.com/maps/search/${encodeURIComponent(niche + ' em ' + city)}`;

        console.log(`Acessando: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('Aguardando 10 segundos para renderização total...');
        await new Promise(r => setTimeout(r, 10000));

        // Captura screenshot para debug visual
        await page.screenshot({ path: 'debug_gmaps_v2.png' });
        console.log('Screenshot salvo em debug_gmaps_v2.png');

        // Verificar o que tem na página
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log('Texto inicial do Body:', bodyText);

        // Testar múltiplos seletores de cards
        const selectors = ['div[role="article"]', 'a[aria-label]', '.hfpxzc'];
        for (const sel of selectors) {
            const count = (await page.$$(sel)).length;
            console.log(`Seletor "${sel}" encontrou: ${count} elementos`);
        }

        // Testar seletor de cards
        const cards = await page.$$('div[role="article"]');
        console.log(`Cards encontrados: ${cards.length}`);

        if (cards.length > 0) {
            const firstCardName = await cards[0].$eval('.qBF1Pd', el => el.innerText).catch(() => 'NÃO ENCONTRADO');
            console.log(`Nome do primeiro card (.qBF1Pd): ${firstCardName}`);

            // Tentar encontrar o nome por outro seletor comum se o acima falhar
            if (firstCardName === 'NÃO ENCONTRADO') {
                const altName = await cards[0].evaluate(el => el.innerText.split('\n')[0]);
                console.log(`Nome alternativo (innerText[0]): ${altName}`);
            }
        }

        // Testar seletor de telefone (clicando no primeiro card)
        if (cards.length > 0) {
            console.log('Clicando no primeiro card...');
            await cards[0].click();
            await new Promise(r => setTimeout(r, 4000)); // Aguarda painel abrir

            const phoneBtn = await page.$('button[data-item-id^="phone:tel:"]');
            if (phoneBtn) {
                const tel = await page.evaluate(el => el.getAttribute('data-item-id'), phoneBtn);
                console.log(`Telefone encontrado (data-item-id): ${tel}`);
            } else {
                console.log('Botão de telefone NÃO encontrado pelo seletor [data-item-id^="phone:tel:"]');
                // Tenta pegar todo o texto do painel
                const panelText = await page.evaluate(() => document.querySelector('[role="main"]')?.innerText || 'PAINEL NÃO ENCONTRADO');
                console.log('Texto do painel lateral (primeiros 200 chars):', panelText.substring(0, 200));
            }
        }

    } catch (err) {
        console.error('Erro no teste:', err.message);
    } finally {
        await browser.close();
    }
}

testSelectors();
