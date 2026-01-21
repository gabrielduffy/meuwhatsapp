const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const { formatarWhatsApp } = require('./gmaps.servico');

puppeteer.use(StealthPlugin());

async function buscarLeadsNoOLX(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => {
        console.log(`[OLX Scraper] ${msg}`);
        if (onProgress) onProgress({ msg: msg });
    };

    log(`Iniciando busca OLX (Humana): ${niche} em ${city}`);
    const dddsValidos = obterDDDsDaCidade(city);
    const sessionId = Math.random().toString(36).substring(7);
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/chromium-browser');

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromePath,
        args: [`--proxy-server=${PROXY_HOST}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.setViewport({ width: 1280, height: 800 });

        const query = encodeURIComponent(`Anúncios OLX de ${niche} em ${city} whatsapp 9`);
        log(`Buscando no Bing: ${query}`);
        await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'networkidle2', timeout: 60000 });

        const leads = [];
        const processed = new Set();

        for (let p = 0; p < 2 && leads.length < limit; p++) {
            const results = await page.evaluate(() => {
                const list = [];
                document.querySelectorAll('.b_algo').forEach(el => {
                    const titleEl = el.querySelector('h2 a');
                    const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_snippet') || el;
                    if (titleEl) {
                        const title = titleEl.innerText;
                        const snippet = snippetEl.innerText;
                        const fullText = title + " " + snippet;
                        const phoneMatch = fullText.match(/(?:\(?\d{2}\)?\s?)?9\d{4}-?\d{4}/g);
                        if (phoneMatch) {
                            phoneMatch.forEach(num => {
                                list.push({ nome: title.split('|')[0].split('-')[0].trim(), rawPhone: num });
                            });
                        }
                    }
                });
                return list;
            });

            for (const item of results) {
                if (leads.length >= limit) break;
                const whatsapp = formatarWhatsApp(item.rawPhone);
                if (whatsapp && !processed.has(whatsapp) && validarDDD(whatsapp, dddsValidos)) {
                    processed.add(whatsapp);
                    leads.push({ nome: item.nome, whatsapp });
                    log(`[✓] Lead OLX: ${item.nome} (${whatsapp})`);
                }
            }

            const nextBtn = await page.$('a.sb_pagN');
            if (nextBtn && leads.length < limit) {
                await nextBtn.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => { });
            } else break;
        }

        return leads;
    } catch (e) {
        log(`Erro: ${e.message}`);
        return leads;
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoOLX };
