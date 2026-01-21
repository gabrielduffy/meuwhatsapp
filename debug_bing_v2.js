const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox']
    });
    const page = await browser.newPage();
    await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
    await page.setViewport({ width: 1280, height: 800 });

    const niche = 'Guincho';
    const city = 'São Paulo';
    const query = encodeURIComponent(`site:instagram.com ${niche} ${city} whatsapp 9`);

    console.log(`Searching Bing: ${query}`);
    await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'bing_debug_v2.png' });

    const results = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('.b_algo').forEach(el => {
            list.push({
                title: el.querySelector('h2')?.innerText,
                snippet: el.querySelector('.b_caption p')?.innerText || el.querySelector('.b_snippet')?.innerText || 'NO SNIPPET'
            });
        });
        return list;
    });

    console.log('Bing Results:', JSON.stringify(results, null, 2));
    await browser.close();
}

run();
