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
    const query = encodeURIComponent(`Imobiliária São Paulo instagram whatsapp`);

    console.log(`Searching DDG LITE: ${query}`);
    try {
        await page.goto(`https://duckduckgo.com/lite/?q=${query}`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'ddg_lite_debug.png' });

        const results = await page.evaluate(() => {
            const list = [];
            // DDG Lite results are rows in a table usually
            document.querySelectorAll('.result-link').forEach(el => {
                const title = el.innerText;
                const snippet = el.parentElement.parentElement.nextElementSibling?.innerText || '';
                const fullText = title + ' ' + snippet;
                const phoneMatch = fullText.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
                if (phoneMatch) {
                    list.push({ title, phone: phoneMatch[0] });
                }
            });
            return list;
        });

        console.log('Results found (DDG LITE):', results);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await browser.close();
}

run();
