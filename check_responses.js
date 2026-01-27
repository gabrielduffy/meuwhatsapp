const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function checkResponseTypes() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const searchQuery = encodeURIComponent('Academia em São Paulo');

    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('search') || url.includes('rpc')) {
            const status = res.status();
            const contentType = res.headers()['content-type'];
            console.log(`URL: ${url.substring(0, 80)}... | STATUS: ${status} | TYPE: ${contentType}`);
            if (contentType && contentType.includes('javascript')) {
                try {
                    const text = await res.text();
                    const phones = text.match(/\d{2}[\s-]?9?\d{4}[\s-]?\d{4}/g);
                    if (phones) console.log(`   -> ACHOU ${phones.length} telefones nesta resposta!`);
                } catch (e) { }
            }
        }
    });

    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2' });

    await page.evaluate(async () => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, 10000);
        await new Promise(r => setTimeout(r, 2000));
    });

    await browser.close();
}

checkResponseTypes();
