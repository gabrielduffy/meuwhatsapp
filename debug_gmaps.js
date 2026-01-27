const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function debugGmaps() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const searchQuery = encodeURIComponent('Academia em São Paulo');

    console.log('Acessando Google Maps...');
    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, { waitUntil: 'domcontentloaded' });

    console.log('Fazendo fetch da página 1...');
    const text = await page.evaluate(async (searchQuery) => {
        const url = `/maps/search/${searchQuery}/?authuser=0&hl=pt-BR&gl=br&pb=!1m4!1i0!2i20!4m2!11m1!2i0!20m1!1e1!2b1`;
        const r = await fetch(url);
        return await r.text();
    }, searchQuery);

    fs.writeFileSync('gmaps_response.txt', text);
    console.log('Resposta salva em gmaps_response.txt. Tamanho:', text.length);

    await browser.close();
}

debugGmaps();
