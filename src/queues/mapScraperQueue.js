const Queue = require('bull');
const { redis } = require('../config/redis');
const gmapsServico = require('../servicos/gmaps.servico');
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
    const { niche, city, limit, campanhaId, empresaId, webhookUrl } = job.data;

    console.log(`[MapScraperQueue] Iniciando job para: ${niche} em ${city}`);

    try {
        // 0. Atualizar progresso inicial
        await prospeccaoRepo.atualizarHistoricoScraping(job.id, { progresso: 10 }).catch(() => { });

        // 1. Executar Scraping
        const rawLeads = await gmapsServico.buscarLeadsNoMaps(niche, city, limit || 150, (p) => {
            // Callback de progresso se o serviço suportar (vamos assumir que sim ou simular)
            job.progress(p);
            prospeccaoRepo.atualizarHistoricoScraping(job.id, { progresso: p }).catch(() => { });
        });

        // 2. Inserir no Banco de Dados
        const leadsParaInserir = rawLeads.map(lead => ({
            campanhaId: campanhaId || null,
            empresaId: empresaId,
            nome: lead.nome,
            telefone: lead.whatsapp,
            variaveis: { origem: 'gmaps_scraper', niche, city, job_id: job.id }
        }));

        if (leadsParaInserir.length > 0) {
            await prospeccaoRepo.criarLeadsEmLote(leadsParaInserir);

            if (campanhaId) {
                await prospeccaoRepo.incrementarContadorCampanha(campanhaId, 'total_leads', leadsParaInserir.length);
            }

            // Atualizar Histórico de Scraping como concluído
            await prospeccaoRepo.atualizarHistoricoScraping(job.id, {
                status: 'concluido',
                leadsColetados: leadsParaInserir.length,
                progresso: 100
            }).catch(e => console.error('Erro ao atualizar histórico:', e.message));
        } else {
            // Mesmo se zero leads, marca como concluído
            await prospeccaoRepo.atualizarHistoricoScraping(job.id, {
                status: 'concluido',
                leadsColetados: 0,
                progresso: 100
            }).catch(() => { });
        }

        // 3. Disparar Webhook se existir
        if (webhookUrl) {
            try {
                await axios.post(webhookUrl, {
                    event: 'map_scraper_completed',
                    data: {
                        niche,
                        city,
                        leads_collected: leadsParaInserir.length,
                        campanhaId,
                        status: 'success',
                        timestamp: new Date().toISOString()
                    }
                });
                console.log(`[MapScraperQueue] Webhook enviado para: ${webhookUrl}`);
            } catch (webhookError) {
                console.error(`[MapScraperQueue] Erro ao enviar webhook:`, webhookError.message);
            }
        }

        return {
            success: true,
            count: leadsParaInserir.length
        };

    } catch (error) {
        console.error(`[MapScraperQueue] Erro ao processar scraping:`, error.message);

        if (webhookUrl) {
            await axios.post(webhookUrl, {
                event: 'map_scraper_failed',
                data: { niche, city, error: error.message, status: 'error' }
            }).catch(() => { });
        }

        // Atualizar Histórico em caso de erro com o log completo
        await prospeccaoRepo.atualizarHistoricoScraping(job.id, {
            status: 'falhado',
            leadsColetados: 0,
            mensagem_erro: error.stack || error.message,
            progresso: 0
        }).catch(() => { });

        throw error;
    }
});

module.exports = {
    mapScraperQueue
};
