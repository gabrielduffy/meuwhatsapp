const Queue = require('bull');
const { redis } = require('../config/redis');
const gmapsServico = require('../servicos/gmaps.servico');
const instagramServico = require('../servicos/instagram.servico');
const olxServico = require('../servicos/olx.servico');
const linkedinServico = require('../servicos/linkedin.servico');
const prospeccaoRepo = require('../repositorios/prospeccao.repositorio');
const axios = require('axios');

// Criar fila de scraping
const redisConfig = process.env.REDIS_URL || 'redis://:@412Trocar@redis:6379';
const mapScraperQueue = new Queue('map-scraper', redisConfig, {
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 10000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

// Processar jobs de scraping
mapScraperQueue.process(async (job) => {
    const { niche, city, limit, campanhaId, empresaId, webhookUrl, sources = ['gmaps'] } = job.data;
    const jobIdStr = String(job.id);

    console.log(`[MapScraperQueue] Iniciando job #${jobIdStr} para: ${niche} em ${city} | Fontes: ${sources.join(', ')}`);

    try {
        await prospeccaoRepo.atualizarHistoricoScraping(jobIdStr, { progresso: 5 });

        const allRawLeads = [];

        // Determinar limite por fonte
        const limitPerSource = Math.ceil((limit || 150) / sources.length);

        for (const source of sources) {
            console.log(`[MapScraperQueue] Processando fonte: ${source}`);
            let sourceLeads = [];

            try {
                if (source === 'gmaps') {
                    sourceLeads = await gmapsServico.buscarLeadsNoMaps(niche, city, limitPerSource, (p) => {
                        prospeccaoRepo.atualizarHistoricoScraping(jobIdStr, { progresso: Math.min(25, p) }).catch(() => { });
                    });
                } else if (source === 'instagram') {
                    sourceLeads = await instagramServico.buscarLeadsNoInstagram(niche, city, limitPerSource);
                } else if (source === 'olx') {
                    sourceLeads = await olxServico.buscarLeadsNoOLX(niche, city, limitPerSource);
                } else if (source === 'linkedin') {
                    sourceLeads = await linkedinServico.buscarLeadsNoLinkedIn(niche, city, limitPerSource);
                }
            } catch (err) {
                console.error(`[MapScraperQueue] Erro na fonte ${source}:`, err.message);
            }

            sourceLeads.forEach(l => {
                if (!allRawLeads.find(existing => existing.whatsapp === l.whatsapp)) {
                    allRawLeads.push({ ...l, source });
                }
            });
        }

        // 2. Inserir no Banco de Dados
        const leadsParaInserir = allRawLeads.map(lead => ({
            campanhaId: campanhaId || null,
            empresaId: empresaId,
            nome: lead.nome,
            telefone: lead.whatsapp,
            origem: `${lead.source}_scraper`,
            metadados: { niche, city, job_id: jobIdStr, source: lead.source }
        }));

        if (leadsParaInserir.length > 0) {
            await prospeccaoRepo.criarLeadsEmLote(leadsParaInserir);

            if (campanhaId) {
                await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'total_leads', leadsParaInserir.length);
            }

            await prospeccaoRepo.atualizarHistoricoScraping(jobIdStr, {
                status: 'concluido',
                leadsColetados: leadsParaInserir.length,
                progresso: 100
            }).catch(e => console.error('Erro ao atualizar histórico:', e.message));
        } else {
            await prospeccaoRepo.atualizarHistoricoScraping(jobIdStr, {
                status: 'concluido',
                leadsColetados: 0,
                progresso: 100
            }).catch(() => { });
        }

        if (webhookUrl) {
            await axios.post(webhookUrl, {
                event: 'prospeccao_completed',
                data: { niche, city, leads_collected: leadsParaInserir.length, sources, status: 'success' }
            }).catch(() => { });
        }

        return { success: true, count: leadsParaInserir.length };

    } catch (error) {
        console.error(`[MapScraperQueue] Erro fatal:`, error.message);
        await prospeccaoRepo.atualizarHistoricoScraping(jobIdStr, {
            status: 'falhado',
            mensagem_erro: error.stack || error.message,
            progresso: 0
        }).catch(() => { });
        throw error;
    }
});

module.exports = {
    mapScraperQueue
};
