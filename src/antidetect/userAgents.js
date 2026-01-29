/**
 * userAgents.js
 * Pool de identidades e headers realistas para simulação de desktop
 */

const userAgentPool = [
    // CHROME WINDOWS
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        platform: 'Windows',
        version: '124',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        platform: 'Windows',
        version: '123',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'Windows',
        version: '122',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'Windows',
        version: '121',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Windows',
        version: '120',
        brand: 'Google Chrome'
    },

    // CHROME MACOS
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        platform: 'macOS',
        version: '124',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        platform: 'macOS',
        version: '123',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'macOS',
        version: '122',
        brand: 'Google Chrome'
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        platform: 'macOS',
        version: '121',
        brand: 'Google Chrome'
    },

    // EDGE WINDOWS
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        platform: 'Windows',
        version: '124',
        brand: 'Microsoft Edge'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        platform: 'Windows',
        version: '123',
        brand: 'Microsoft Edge'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
        platform: 'Windows',
        version: '122',
        brand: 'Microsoft Edge'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
        platform: 'Windows',
        version: '121',
        brand: 'Microsoft Edge'
    }
];

/**
 * Gera os cabeçalhos de Accept-Language dinamicamente baseado no locale configurado
 */
function getAcceptLanguage(locale = 'pt-BR') {
    if (locale.startsWith('pt')) {
        return 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
    } else if (locale.startsWith('en')) {
        return 'en-US,en;q=0.9';
    } else if (locale.startsWith('es')) {
        return 'es-ES,es;q=0.9,en;q=0.8';
    }
    return 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
}

/**
 * Gera headers Client Hints consistentes com o perfil do navegador
 */
function getClientHints(profile) {
    const { version, platform, brand } = profile;
    const brands = brand === 'Microsoft Edge'
        ? `"Not-A.Brand";v="99", "Chromium";v="${version}", "Microsoft Edge";v="${version}"`
        : `"Not-A.Brand";v="99", "Chromium";v="${version}", "Google Chrome";v="${version}"`;

    return {
        'sec-ch-ua': brands,
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': `"${platform}"`,
        'sec-ch-ua-platform-version': platform === 'Windows' ? '"15.0.0"' : '"14.4.1"'
    };
}

/**
 * Retorna um perfil de identidade consistente e realista
 * @param {string} locale Ex: 'pt-BR'
 * @returns {Object} { userAgent, headers, platform, chromeVersion }
 */
function getConsistentProfile(locale = 'pt-BR') {
    const profile = userAgentPool[Math.floor(Math.random() * userAgentPool.length)];

    const headers = {
        'User-Agent': profile.ua,
        ...getClientHints(profile),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': getAcceptLanguage(locale),
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'DNT': '1', // Do Not Track ligado (comum em humanos)
        'Cache-Control': 'max-age=0'
    };

    return {
        userAgent: profile.ua,
        headers: headers,
        platform: profile.platform,
        chromeVersion: profile.version
    };
}

module.exports = {
    getConsistentProfile,
    userAgentPool
};
