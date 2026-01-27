const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function monitorNetwork() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const searchQuery = encodeURIComponent('Academia em São Paulo');

    console.log('Monitorando rede...');
    page.on('request', req => {
        const url = req.url();
        if (url.includes('search') || url.includes('rpc')) {
            console.log('REQ:', url.substring(0, 150));
        }
    });

    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2' });

    console.log('Iniciando scroll para disparar mais requisições...');
    await page.evaluate(async () => {
        const feed = document.querySelector('div[role="feed"]');
        for (let i = 0; i < 5; i++) {
            if (feed) feed.scrollBy(0, 5000);
            await new Promise(r => setTimeout(r, 1000));
        }
    });

    await browser.close();
}

monitorNetwork();
