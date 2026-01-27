const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function extractInitialState() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const searchQuery = encodeURIComponent('Academia em São Paulo');

    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'domcontentloaded' });

    const data = await page.evaluate(() => {
        return window.APP_INITIALIZATION_STATE;
    });

    console.log('DATA TYPE:', typeof data);
    if (data) {
        const json = JSON.stringify(data);
        console.log('DATA LENGTH:', json.length);
        // Procure por padrões de telefone
        const phones = json.match(/\d{2}[\s-]?9?\d{4}[\s-]?\d{4}/g);
        console.log('PHONES FOUND IN INITIAL STATE:', phones ? phones.length : 0);
        if (phones) console.log('SAMPLES:', phones.slice(0, 5));
    }

    await browser.close();
}

extractInitialState();
