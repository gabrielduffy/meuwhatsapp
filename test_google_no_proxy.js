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
    const niche = 'Imobiliária';
    const city = 'São Paulo';
    const query = encodeURIComponent(`site:instagram.com "${niche}" "${city}" "wa.me"`);

    console.log(`Searching Google (NO PROXY): ${query}`);
    try {
        await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'google_no_proxy_debug.png' });

        const results = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.g').forEach(el => {
                const text = el.innerText;
                const waMatch = text.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/);
                if (waMatch) list.push(waMatch[1]);
            });
            return list;
        });

        console.log('Phones found (NO PROXY):', results);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await browser.close();
}

run();
