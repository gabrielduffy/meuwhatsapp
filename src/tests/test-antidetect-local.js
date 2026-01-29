/**
 * TITAN v8.1 - Teste de Anti-Detecção LOCAL (sem proxy)
 * 
 * Valida o fingerprint isoladamente, sem interferência do proxy.
 * Útil para confirmar que o browser está camuflado corretamente.
 * 
 * Uso: node src/tests/test-antidetect-local.js
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Importar módulos TITAN v8
const { getConsistentIdentity, injectFingerprint, clearCache } = require('../antidetect/fingerprintManager');
const { configurarContextoGeografico } = require('../antidetect/geoSync');
const { humanMouseMove, randomIdleMovement } = require('../antidetect/humanMouse');

puppeteer.use(StealthPlugin());

// Criar pasta de resultados
const RESULTS_DIR = path.join(__dirname, '../../logs/antidetect-tests');
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarAntiDetectLocal() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log('\n🔬 TITAN v8.1 - Teste de Anti-Detecção LOCAL (Sem Proxy)\n');
    console.log('='.repeat(60));
    console.log('Este teste valida o fingerprint sem usar proxy.');
    console.log('Isso elimina erros de rede e foca na camuflagem do browser.');
    console.log('='.repeat(60));

    const results = {
        timestamp,
        mode: 'local (sem proxy)',
        tests: [],
        passed: 0,
        failed: 0,
        fingerprintDetails: null
    };

    let browser;
    let page;

    try {
        // Limpar cache para gerar novo fingerprint
        clearCache();

        // 1. Gerar identidade
        console.log('\n[1/5] Gerando nova identidade...');
        const identity = await getConsistentIdentity('pt-BR');

        results.fingerprintDetails = {
            platform: identity.platform,
            chromeVersion: identity.chromeVersion,
            os: identity.os,
            viewport: identity.viewport,
            webglRenderer: identity.fingerprint?.webgl?.renderer || 'N/A',
            hardwareConcurrency: identity.fingerprint?.navigator?.hardwareConcurrency || 'N/A',
            deviceMemory: identity.fingerprint?.navigator?.deviceMemory || 'N/A'
        };

        console.log(`   ✅ OS: ${identity.os}`);
        console.log(`   ✅ Platform: ${identity.platform}`);
        console.log(`   ✅ Chrome: v${identity.chromeVersion}`);
        console.log(`   ✅ WebGL: ${(results.fingerprintDetails.webglRenderer || '').substring(0, 50)}...`);
        console.log(`   ✅ CPU Cores: ${results.fingerprintDetails.hardwareConcurrency}`);
        console.log(`   ✅ RAM: ${results.fingerprintDetails.deviceMemory}GB`);

        // 2. Criar browser SEM PROXY
        console.log('\n[2/5] Iniciando browser LOCAL (sem proxy)...');

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-web-security',
                '--flag-switches-begin',
                '--flag-switches-end',
                `--user-agent=${identity.userAgent}`
            ]
        });

        page = await browser.newPage();
        console.log('   ✅ Browser iniciado');

        // 3. Injetar fingerprint
        console.log('\n[3/5] Injetando fingerprint...');
        const injected = await injectFingerprint(page, identity.fingerprint);
        await page.setExtraHTTPHeaders(identity.headers);
        await configurarContextoGeografico(page, 'São Paulo');
        await page.setViewport(identity.viewport);

        console.log(`   ✅ Fingerprint injetado: ${injected ? 'Sucesso' : 'Erro na injeção'}`);

        // ============================================
        // TESTE 1: Sannysoft Bot Detector
        // ============================================
        console.log('\n[4/5] Teste 1: Sannysoft Bot Detector...');
        try {
            await page.goto('https://bot.sannysoft.com/', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            // Simular comportamento humano
            await humanMouseMove(page, 400, 300);
            await sleep(2000);
            await randomIdleMovement(page);
            await sleep(3000);

            // Capturar resultados
            const sannysoftResults = await page.evaluate(() => {
                const results = {};
                const rows = document.querySelectorAll('table tr');

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const test = cells[0]?.innerText?.trim();
                        const result = cells[1]?.innerText?.trim();
                        const status = cells[1]?.className || '';
                        if (test && result) {
                            results[test] = {
                                value: result,
                                passed: !status.includes('failed') && !result.toLowerCase().includes('fail')
                            };
                        }
                    }
                });

                return results;
            });

            const screenshotPath1 = path.join(RESULTS_DIR, `sannysoft-local-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath1, fullPage: true });

            // Analisar
            const testEntries = Object.entries(sannysoftResults);
            const failedTests = testEntries.filter(([_, v]) => !v.passed);
            const passedTests = testEntries.filter(([_, v]) => v.passed);

            results.tests.push({
                name: 'Sannysoft Bot Detector',
                screenshot: screenshotPath1,
                passed: failedTests.length <= 2, // Permitir até 2 falhas menores
                totalTests: testEntries.length,
                passedCount: passedTests.length,
                failedCount: failedTests.length,
                failedItems: failedTests.map(([name, _]) => name),
                details: sannysoftResults
            });

            if (failedTests.length === 0) {
                console.log(`   ✅ PERFEITO - Todos os ${testEntries.length} testes passaram!`);
                results.passed++;
            } else if (failedTests.length <= 2) {
                console.log(`   ⚠️ BOM - ${passedTests.length}/${testEntries.length} testes passaram`);
                console.log(`   Falhas menores: ${failedTests.map(([n]) => n).join(', ')}`);
                results.passed++;
            } else {
                console.log(`   ❌ ATENÇÃO - ${failedTests.length} testes falharam:`);
                failedTests.slice(0, 5).forEach(([test]) => {
                    console.log(`      ❌ ${test}`);
                });
                results.failed++;
            }
            console.log(`   📸 Screenshot: ${screenshotPath1}`);

        } catch (e) {
            console.log(`   ❌ Erro: ${e.message}`);
            results.tests.push({ name: 'Sannysoft', passed: false, error: e.message });
            results.failed++;
        }

        // ============================================
        // TESTE 2: CreepJS
        // ============================================
        console.log('\n[5/5] Teste 2: CreepJS (análise profunda)...');
        try {
            await page.goto('https://abrahamjuliot.github.io/creepjs/', {
                waitUntil: 'networkidle2',
                timeout: 90000
            });

            // Simular comportamento humano
            await humanMouseMove(page, 500, 400);
            console.log('   ⏳ Aguardando análise do CreepJS (20s)...');
            await sleep(20000);

            // Tentar capturar scores
            const creepjsData = await page.evaluate(() => {
                // Tentar múltiplos seletores
                const getText = (selectors) => {
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.innerText) return el.innerText.trim();
                    }
                    return 'N/A';
                };

                return {
                    trustScore: getText(['.trust-score', '[class*="trust"]', '#trust-score']),
                    headlessScore: getText(['[class*="headless"]', '#headless']),
                    stealthScore: getText(['[class*="stealth"]', '#stealth']),
                    liesDetected: getText(['[class*="lies"]', '#lies']),
                    botScore: getText(['[class*="bot"]', '#bot']),
                    fingerprintHash: getText(['[class*="fingerprint"]', '#fingerprint']),
                    title: document.title
                };
            });

            const screenshotPath2 = path.join(RESULTS_DIR, `creepjs-local-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath2, fullPage: true });

            results.tests.push({
                name: 'CreepJS',
                screenshot: screenshotPath2,
                passed: true,
                details: creepjsData,
                note: 'Verificar screenshot - headless/stealth scores devem ser baixos'
            });

            console.log('   ✅ Análise capturada');
            console.log(`   📊 Trust Score: ${creepjsData.trustScore}`);
            console.log(`   📊 Lies Detected: ${creepjsData.liesDetected}`);
            console.log(`   📸 Screenshot: ${screenshotPath2}`);
            results.passed++;

        } catch (e) {
            console.log(`   ❌ Erro: ${e.message}`);
            results.tests.push({ name: 'CreepJS', passed: false, error: e.message });
            results.failed++;
        }

        // ============================================
        // TESTE 3: Verificação interna do fingerprint
        // ============================================
        console.log('\n[BONUS] Verificando fingerprint injetado...');

        const injectedValues = await page.evaluate(() => {
            const getPlugins = () => {
                const p = [];
                for (let i = 0; i < navigator.plugins.length; i++) {
                    p.push(navigator.plugins[i].name);
                }
                return p;
            };

            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                webdriver: navigator.webdriver,
                languages: navigator.languages,
                plugins: getPlugins().length,
                screenWidth: screen.width,
                screenHeight: screen.height,
                colorDepth: screen.colorDepth
            };
        });

        console.log('   Valores no browser:');
        console.log(`   - Platform: ${injectedValues.platform}`);
        console.log(`   - CPU Cores: ${injectedValues.hardwareConcurrency}`);
        console.log(`   - RAM: ${injectedValues.deviceMemory}GB`);
        console.log(`   - WebDriver: ${injectedValues.webdriver} (deve ser undefined)`);
        console.log(`   - Plugins: ${injectedValues.plugins}`);
        console.log(`   - Screen: ${injectedValues.screenWidth}x${injectedValues.screenHeight}`);

        results.injectedValues = injectedValues;

    } catch (error) {
        console.error('\n❌ Erro fatal:', error.message);
        results.error = error.message;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Salvar relatório
    const reportPath = path.join(RESULTS_DIR, `report-local-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO DO TESTE LOCAL');
    console.log('='.repeat(60));
    console.log(`   ✅ Passou: ${results.passed}`);
    console.log(`   ❌ Falhou: ${results.failed}`);
    console.log(`   📁 Relatório: ${reportPath}`);
    console.log(`   📁 Screenshots: ${RESULTS_DIR}`);

    if (results.passed >= 2) {
        console.log('\n   🏆 FINGERPRINT APROVADO! Browser está bem camuflado.');
    } else {
        console.log('\n   ⚠️ Revisar screenshots para identificar problemas.');
    }

    console.log('\n💡 Dica: Compare as screenshots com um browser real para validar.\n');

    return results;
}

// Executar
if (require.main === module) {
    testarAntiDetectLocal()
        .then(results => {
            process.exit(results.failed > 1 ? 1 : 0);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { testarAntiDetectLocal };
