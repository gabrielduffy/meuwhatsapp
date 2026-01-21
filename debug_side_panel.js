const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    const niche = 'Restaurante';
    const city = 'São Paulo';
    const searchQuery = encodeURIComponent(`${niche} em ${city}`);

    console.log('Navigating to Google Maps...');
    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'networkidle2' });

    console.log('Waiting for results...');
    await page.waitForSelector('div[role="article"]');

    console.log('Clicking the first result...');
    await page.click('div[role="article"]');

    console.log('Waiting for side panel...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Capturing side panel screenshot...');
    await page.screenshot({ path: 'gmaps_side_panel.png' });

    const html = await page.evaluate(() => document.body.innerHTML);
    const fs = require('fs');
    fs.writeFileSync('gmaps_side_panel.html', html);

    console.log('Done.');
    await browser.close();
}

run();
