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
    // Query for OLX often has phone numbers in the snippet
    const query = encodeURIComponent(`site:olx.com.br "${niche}" "${city}" whatsapp`);

    console.log(`Searching OLX DDG LITE: ${query}`);
    try {
        await page.goto(`https://duckduckgo.com/lite/?q=${query}`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'olx_ddg_lite_debug.png' });

        const results = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.result-link').forEach(el => {
                const title = el.innerText;
                const snippet = el.parentElement.parentElement.nextElementSibling?.innerText || '';
                const fullText = title + ' ' + snippet;
                // Aggressive phone regex
                const phoneMatch = fullText.match(/\d{2}\s?9?\d{4}-?\d{4}/);
                if (phoneMatch) {
                    list.push({ title, phone: phoneMatch[0] });
                }
            });
            return list;
        });

        console.log('Results found (OLX DDG LITE):', results);
    } catch (e) {
        console.error('Error:', e.message);
    }
    await browser.close();
}

run();
