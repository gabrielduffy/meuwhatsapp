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
    await page.setViewport({ width: 1280, height: 800 });

    const query = encodeURIComponent(`Guinchos em São Paulo instagram whatsapp`);

    console.log(`Searching Bing (HUMAN QUERY): ${query}`);
    await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'bing_human_debug.png' });

    const results = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('.b_algo').forEach(el => {
            list.push(el.innerText);
        });
        return list;
    });

    console.log('Results found:', results.length);
    if (results.length > 0) {
        console.log('First result sample:', results[0].substring(0, 100));
    }
    await browser.close();
}

run();
