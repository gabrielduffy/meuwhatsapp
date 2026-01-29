/**
 * TITAN v8 - Teste de Anti-Detecção
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Importar módulos TITAN v8
const { getConsistentIdentity, injectFingerprint } = require('../antidetect/fingerprintManager');
const { configurarContextoGeografico } = require('../antidetect/geoSync');
const { getHealthyProxy } = require('../antidetect/proxyHealth');
const { humanMouseMove } = require('../antidetect/humanMouse');
const config = require('../config/titan.config');

puppeteer.use(StealthPlugin());

const RESULTS_DIR = path.join(__dirname, '../../logs/antidetect-tests');
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarAntiDetect() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results = {
        timestamp,
        tests: [],
        passed: 0,
        failed: 0
    };

    console.log('\n🔬 TITAN v8 - Iniciando Testes de Anti-Detecção\n');

    let browser;
    let page;

    try {
        const identity = await getConsistentIdentity('pt-BR');
        console.log(`[1/6] Identidade: ${identity.platform} / Chrome ${identity.chromeVersion}`);

        let proxyData;
        try {
            proxyData = await getHealthyProxy('br');
            console.log(`[2/6] Proxy OK: ${proxyData.host}`);
        } catch (e) {
            console.log(`[2/6] Sem proxy: ${e.message}`);
        }

        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-web-security',
            `--user-agent=${identity.userAgent}`
        ];

        if (proxyData) {
            launchArgs.push(`--proxy-server=${proxyData.host}`);
        }

        browser = await puppeteer.launch({
            headless: config.browser.headless,
            args: launchArgs
        });

        page = await browser.newPage();

        if (proxyData) {
            await page.authenticate({
                username: proxyData.username,
                password: proxyData.password
            });
        }

        await injectFingerprint(page, identity.fingerprint);
        await page.setExtraHTTPHeaders(identity.headers);
        await configurarContextoGeografico(page, 'São Paulo');
        await page.setViewport({
            width: identity.viewport.width,
            height: identity.viewport.height
        });

        // Teste 1: Sannysoft
        console.log('\n[5/6] Teste 1: Sannysoft...');
        try {
            await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle2', timeout: 45000 });
            await sleep(3000);
            const screenshotPath1 = path.join(RESULTS_DIR, `sannysoft-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath1, fullPage: true });
            results.passed++;
        } catch (e) {
            console.log(`❌ Sannysoft erro: ${e.message}`);
            results.failed++;
        }

        // Teste 2: CreepJS
        console.log('[6/6] Teste 2: CreepJS...');
        try {
            await page.goto('https://abrahamjuliot.github.io/creepjs/', { waitUntil: 'networkidle2', timeout: 60000 });
            await sleep(10000);
            const screenshotPath2 = path.join(RESULTS_DIR, `creepjs-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath2, fullPage: true });
            results.passed++;
        } catch (e) {
            console.log(`❌ CreepJS erro: ${e.message}`);
            results.failed++;
        }

    } catch (error) {
        console.error('\n❌ Erro fatal:', error.message);
    } finally {
        if (browser) await browser.close();
    }

    return results;
}

if (require.main === module) {
    testarAntiDetect().then(r => process.exit(r.failed > 0 ? 1 : 0));
}
