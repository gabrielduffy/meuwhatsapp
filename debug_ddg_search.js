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

    const niche = 'Imobiliária';
    const city = 'São Paulo';
    const query = encodeURIComponent(`site:instagram.com "${niche}" "${city}" "9" "whatsapp"`);

    console.log(`Searching DDG: ${query}`);
    try {
        await page.goto(`https://duckduckgo.com/html/?q=${query}`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'ddg_debug.png' });
        const html = await page.evaluate(() => document.body.innerHTML);
        const fs = require('fs');
        fs.writeFileSync('ddg_debug.html', html);
        console.log('DDG Search completed. Screenshot and HTML saved.');
    } catch (e) {
        console.error('Error during search:', e.message);
    }
    await browser.close();
}

run();
