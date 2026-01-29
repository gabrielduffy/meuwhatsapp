/**
 * geoSync.js
 * Sincronização geográfica para o TITAN-v8
 */

const cidadesConfig = {
    // BRASIL
    'sao paulo': {
        timezone: 'America/Sao_Paulo',
        lat: -23.5505,
        lng: -46.6333,
        locale: 'pt-BR',
        accuracy: 100
    },
    'rio de janeiro': {
        timezone: 'America/Sao_Paulo',
        lat: -22.9068,
        lng: -43.1729,
        locale: 'pt-BR',
        accuracy: 120
    },
    'belo horizonte': {
        timezone: 'America/Sao_Paulo',
        lat: -19.9167,
        lng: -43.9345,
        locale: 'pt-BR',
        accuracy: 100
    },
    'brasilia': {
        timezone: 'America/Sao_Paulo',
        lat: -15.7801,
        lng: -47.9292,
        locale: 'pt-BR',
        accuracy: 100
    },
    'salvador': {
        timezone: 'America/Bahia',
        lat: -12.9714,
        lng: -38.5014,
        locale: 'pt-BR',
        accuracy: 150
    },
    'curitiba': {
        timezone: 'America/Sao_Paulo',
        lat: -25.4284,
        lng: -49.2733,
        locale: 'pt-BR',
        accuracy: 100
    },
    'fortaleza': {
        timezone: 'America/Fortaleza',
        lat: -3.7172,
        lng: -38.5284,
        locale: 'pt-BR',
        accuracy: 110
    },
    'recife': {
        timezone: 'America/Recife',
        lat: -8.0476,
        lng: -34.8770,
        locale: 'pt-BR',
        accuracy: 130
    },
    'porto alegre': {
        timezone: 'America/Sao_Paulo',
        lat: -30.0346,
        lng: -51.2177,
        locale: 'pt-BR',
        accuracy: 100
    },
    'manaus': {
        timezone: 'America/Manaus',
        lat: -3.1190,
        lng: -60.0217,
        locale: 'pt-BR',
        accuracy: 150
    },

    // INTERNACIONAL
    'miami': {
        timezone: 'America/New_York',
        lat: 25.7617,
        lng: -80.1918,
        locale: 'en-US',
        accuracy: 100
    },
    'new york': {
        timezone: 'America/New_York',
        lat: 40.7128,
        lng: -74.0060,
        locale: 'en-US',
        accuracy: 100
    },
    'los angeles': {
        timezone: 'America/Los_Angeles',
        lat: 34.0522,
        lng: -118.2437,
        locale: 'en-US',
        accuracy: 100
    },
    'lisboa': {
        timezone: 'Europe/Lisbon',
        lat: 38.7223,
        lng: -9.1393,
        locale: 'pt-PT',
        accuracy: 100
    },
    'madrid': {
        timezone: 'Europe/Madrid',
        lat: 40.4168,
        lng: -3.7038,
        locale: 'es-ES',
        accuracy: 100
    },
    'londres': {
        timezone: 'Europe/London',
        lat: 51.5074,
        lng: -0.1278,
        locale: 'en-GB',
        accuracy: 100
    }
};

/**
 * Remove acentos e padroniza string para busca no mapa
 * @param {string} str 
 * @returns {string}
 */
function normalizar(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Configura o contexto geográfico do browser para simular a cidade alvo
 * @param {import('puppeteer').Page} page 
 * @param {string} cidade_nome 
 */
async function configurarContextoGeografico(page, cidade_nome) {
    const nomeLimpo = normalizar(cidade_nome);
    let config = cidadesConfig[nomeLimpo];

    if (!config) {
        // Fallback: Tenta encontrar se o nome da cidade está contido em alguma chave
        const key = Object.keys(cidadesConfig).find(k => nomeLimpo.includes(k) || k.includes(nomeLimpo));
        config = key ? cidadesConfig[key] : cidadesConfig['sao paulo'];

        if (!key) {
            console.log(`[GeoSync] Cidade "${cidade_nome}" não encontrada. Aplicando fallback (São Paulo).`);
        } else {
            console.log(`[GeoSync] Cidade "${cidade_nome}" mapeada para "${key}".`);
        }
    } else {
        console.log(`[GeoSync] Aplicando configuração para: ${cidade_nome}`);
    }

    try {
        // 1. Emular Timezone
        await page.emulateTimezone(config.timezone);

        // 2. Set Geolocation
        await page.setGeolocation({
            latitude: config.lat,
            longitude: config.lng,
            accuracy: config.accuracy
        });

        // 3. Headers de Idioma
        await page.setExtraHTTPHeaders({
            'Accept-Language': `${config.locale},${config.locale.split('-')[0]};q=0.9`
        });

        console.log(`[GeoSync] Sucesso: Timezone=${config.timezone}, Coords=[${config.lat}, ${config.lng}], Locale=${config.locale}`);
    } catch (error) {
        console.error(`[GeoSync] Erro ao configurar contexto: ${error.message}`);
    }
}

module.exports = {
    configurarContextoGeografico,
    cidadesConfig
};
