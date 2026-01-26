const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { obterDDDsDaCidade, validarDDD } = require('../utilitarios/ddd.util');
const logger = require('./logger.servico');
const prospeccaoRepo = require('../repositorios/prospeccao.repositorio');

puppeteer.use(StealthPlugin());

/**
 * SERVIÇO DE ELITE: TITAN-ENGINE GMAPS v3
 * Extração massiva via Protocolo Paralelo + Proxy Rotativo + Logs em Tempo Real
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

async function buscarLeadsNoMaps(niche, city, limit = 150, onProgress = null, jobId = null) {
    const log = async (msg) => {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMsg = `[TITAN] ${msg}`;
        console.log(formattedMsg);
        if (onProgress) onProgress({ msg: msg });

        // Grava no banco de dados para visualização na aba Histórico
        if (jobId) {
            await prospeccaoRepo.atualizarHistoricoScraping(jobId, {
                log: `[${timestamp}] ${msg}`
            }).catch(() => { });
        }
    };

    const dddsValidos = obterDDDsDaCidade(city);
    const searchQuery = encodeURIComponent(`${niche} em ${city}`);
    const sessionId = Math.random().toString(36).substring(7);

    // Configuração de Proxy (Essencial para não ser bloqueado e ter velocidade)
    const PROXY_HOST = 'gw.dataimpulse.com:823';
    const PROXY_USER = `14e775730d7037f4aad0__cr.br;sessid.${sessionId}`;
    const PROXY_PASS = '8aebbfaa273d7787';

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            `--proxy-server=${PROXY_HOST}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        await page.setViewport({ width: 1024, height: 768 });

        await log(`Engatando Titan-Engine v3...`);
        await log(`Alvo: ${niche} em ${city} (Meta: ${limit} leads)`);

        // Acessa a página inicial para validar o ambiente e cookies
        await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await log(`Protocolos Google interceptados. Iniciando extração paralela...`);

        // TÉCNICA DE ELITE: Extração Multiplexada
        const totalLeadsRaw = await page.evaluate(async (limit, searchQuery) => {
            const results = [];
            const seen = new Set();

            // Disparar requisições para múltiplas janelas de resultados
            const batchSize = 20;
            const numBatches = Math.ceil(limit / batchSize) + 2;
            const promises = [];

            for (let i = 0; i < numBatches; i++) {
                const offset = i * batchSize;
                // Endpoint interno de RPC do Maps - Altíssima velocidade
                const url = `/maps/search/${searchQuery}/?authuser=0&hl=pt-BR&gl=br&pb=!1m4!1i${i}!2i${batchSize}!4m2!11m1!2i${offset}!20m1!1e1!2b1`;

                promises.push(
                    fetch(url)
                        .then(r => r.text())
                        .then(text => {
                            // Regex de alta performance para extração binária de nomes e telefones
                            const pattern = /\["0x[a-f0-9]+:0x[a-f0-9]+",\[null,"([^"]+)"\].*?,"(\+?\d[^"]+)"/g;
                            let match;
                            while ((match = pattern.exec(text)) !== null) {
                                const nome = match[1];
                                const telefone = match[2];
                                if (nome && telefone && !seen.has(nome)) {
                                    seen.add(nome);
                                    results.push({ nome, telefone });
                                }
                            }
                        })
                        .catch(() => { })
                );
            }

            await Promise.all(promises);
            return results;
        }, limit, searchQuery);

        await log(`Extração bruta finalizada: ${totalLeadsRaw.length} candidatos encontrados.`);

        const finalLeads = [];
        for (const item of totalLeadsRaw) {
            if (finalLeads.length >= limit) break;
            const whatsapp = formatarWhatsApp(item.telefone);
            if (whatsapp && validarDDD(whatsapp, dddsValidos)) {
                if (!finalLeads.find(l => l.whatsapp === whatsapp)) {
                    finalLeads.push({ nome: item.nome, whatsapp });
                    // A cada 10 leads, reportamos o sucesso no log do banco
                    if (finalLeads.length % 10 === 0) {
                        await log(`Capturados ${finalLeads.length} leads qualificados...`);
                    }
                }
            }
        }

        if (onProgress) onProgress({ p: 100 });

        await log(`Missão cumprida! ${finalLeads.length} leads processados em tempo recorde.`);
        return finalLeads;

    } catch (error) {
        await log(`FALHA CRÍTICA: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

module.exports = { buscarLeadsNoMaps, formatarWhatsApp };
