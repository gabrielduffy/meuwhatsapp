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
    // BING query without quotes
    const query = encodeURIComponent(`site:instagram.com Imobiliária São Paulo whatsapp`);

    console.log(`Searching Bing (NO PROXY): ${query}`);
    try {
        await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'bing_no_proxy_debug.png' });

        const results = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.b_algo').forEach(el => {
                const text = el.innerText;
                const phoneMatch = text.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
                if (phoneMatch) list.push(phoneMatch[0]);
            });
            return list;
        });

        console.log('Phones found (BING NO PROXY):', results);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await browser.close();
}

run();
