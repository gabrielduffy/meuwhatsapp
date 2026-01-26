const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const logger = require('./logger.servico');

puppeteer.use(StealthPlugin());

/**
 * SERVIÇO DE ELITE: TITAN-ENGINE GMAPS
 * Extração paralela baseada em Offsets de Rede (Estilo Outscraper/SerpApi)
 */

function formatarWhatsApp(telefone) {
    if (!telefone) return null;
    let limpo = telefone.replace(/\D/g, '');
    if (limpo.startsWith('0')) limpo = limpo.substring(1);
    if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;
    if (limpo.length === 12 && limpo.startsWith('55')) {
        const ddd = limpo.substring(2, 4);
        const resto = limpo.substring(4);
        return `55${ddd}9${resto}`;
    }
    return limpo.length >= 12 ? limpo : null;
}

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null) {
    const log = (msg) => console.log(`[TITAN-ENGINE] ${msg}`);
    const dddsValidos = obterDDDsDaCidade(city);
    const searchQuery = encodeURIComponent(`${niche} em ${city}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });

        log(`Iniciando Extração de Elite para ${limit} leads...`);

        // Acessa a página inicial para pegar tokens de sessão do Google
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // TÉCNICA DE ELITE: Executar 10 fetches paralelos dentro do contexto do Google
        const totalLeads = await page.evaluate(async (limit, searchQuery) => {
            const results = [];
            const seen = new Set();

            // Cada página do Google traz 20 resultados. 
            // Vamos disparar 8 páginas simultâneas (160 candidatos)
            const numPages = Math.ceil(limit / 20) + 2;
            const fetchPromises = [];

            for (let i = 0; i < numPages; i++) {
                const offset = i * 20;
                // O segredo do Outscraper: URL de RPC do Google com echo e offset
                const url = `/maps/search/${searchQuery}/?authuser=0&hl=pt-BR&gl=br&pb=!1m4!1i${i}!2i20!4m2!11m1!2i${offset}!20m1!1e1!2b1`;

                fetchPromises.push(
                    fetch(url)
                        .then(r => r.text())
                        .then(text => {
                            // Extração via Regex de Alta Velocidade no Protobuf/GWS
                            const matches = text.match(/\["0x[a-f0-9]+:0x[a-f0-9]+",\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/g);
                            if (matches) {
                                matches.forEach(m => {
                                    const match = m.match(/\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/);
                                    if (match && !seen.has(match[1])) {
                                        seen.add(match[1]);
                                        results.push({ nome: match[1], telefone: match[2] });
                                    }
                                });
                            }
                        })
                        .catch(() => { })
                );
            }

            await Promise.all(fetchPromises);
            return results;
        }, limit, searchQuery);

        log(`Extração Instantânea: ${totalLeads.length} candidatos encontrados.`);

        const finalLeads = [];
        for (const item of totalLeads) {
            if (finalLeads.length >= limit) break;
            const whatsapp = formatarWhatsApp(item.telefone);
            if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                if (!finalLeads.find(l => l.whatsapp === whatsapp)) {
                    finalLeads.push({ nome: item.nome, whatsapp });
                }
            }
        }

        if (onProgress) onProgress({ p: 100 });

        log(`Operação finalizada em tempo recorde: ${finalLeads.length} leads.`);
        return finalLeads;

    } catch (error) {
        log(`Erro no Titan-Engine: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
