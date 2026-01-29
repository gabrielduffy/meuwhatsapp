/**
 * TITAN v8.1 - Fingerprint Manager (CORRIGIDO)
 * 
 * Gerencia a geração e injeção de fingerprints realistas.
 * Compatível com fingerprint-generator e fingerprint-injector mais recentes.
 */

const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');
const { getConsistentProfile } = require('./userAgents');

// Cache do fingerprint por sessão
let cachedFingerprint = null;
let cachedIdentity = null;

// Fingerprints de fallback caso a biblioteca falhe
const FALLBACK_FINGERPRINTS = {
    windows: {
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelRatio: 1 },
        navigator: {
            hardwareConcurrency: 8,
            deviceMemory: 8,
            platform: 'Win32',
            languages: ['pt-BR', 'pt', 'en-US', 'en']
        },
        webgl: {
            vendor: 'Google Inc. (Intel)',
            renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        fonts: ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana']
    },
    macos: {
        screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1055, colorDepth: 30, pixelRatio: 2 },
        navigator: {
            hardwareConcurrency: 10,
            deviceMemory: 8,
            platform: 'MacIntel',
            languages: ['pt-BR', 'pt', 'en-US', 'en']
        },
        webgl: {
            vendor: 'Google Inc. (Apple)',
            renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)'
        },
        fonts: ['Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Grande', 'Monaco', 'Palatino', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana']
    }
};

/**
 * Gera um fingerprint realista usando a biblioteca ou fallback
 */
async function generateFingerprint(options = {}) {
    const {
        browser = 'chrome',
        os = Math.random() > 0.5 ? 'windows' : 'macos',
        locale = 'pt-BR'
    } = options;

    try {
        // Tentar usar a biblioteca oficial
        const generator = new FingerprintGenerator();

        const fingerprintData = await generator.getFingerprint({
            browsers: [browser],
            operatingSystems: [os === 'macos' ? 'macos' : 'windows'],
            devices: ['desktop'],
            locales: [locale]
        });

        console.log(`[Fingerprint] Gerado via biblioteca: ${os}/${browser}`);
        return {
            ...fingerprintData.fingerprint,
            _source: 'library',
            _os: os,
            _browser: browser
        };

    } catch (error) {
        console.warn(`[Fingerprint] Biblioteca falhou, usando fallback: ${error.message}`);

        // Usar fingerprint de fallback
        const fallback = FALLBACK_FINGERPRINTS[os] || FALLBACK_FINGERPRINTS.windows;

        return {
            fingerprint: fallback,
            screen: fallback.screen,
            navigator: fallback.navigator,
            webgl: fallback.webgl,
            fonts: fallback.fonts,
            _source: 'fallback',
            _os: os,
            _browser: browser
        };
    }
}

/**
 * Injeta o fingerprint na página usando múltiplos métodos
 */
async function injectFingerprint(page, fingerprintData) {
    const fingerprint = fingerprintData.fingerprint || fingerprintData;
    const screen = fingerprintData.screen || fingerprint.screen;
    const navigatorProps = fingerprintData.navigator || fingerprint.navigator;
    const webglProps = fingerprintData.webgl || fingerprint.webgl;

    try {
        // Método 1: Tentar usar FingerprintInjector oficial
        try {
            const injector = new FingerprintInjector();

            // Verificar se o método existe
            if (typeof injector.attachFingerprintToPage === 'function') {
                await injector.attachFingerprintToPage(page, fingerprintData);
                console.log('[Fingerprint] Injetado via attachFingerprintToPage');
                return true;
            }

            // Método alternativo da biblioteca
            if (typeof injector.injectFingerprintToPage === 'function') {
                await injector.injectFingerprintToPage(page, fingerprintData);
                console.log('[Fingerprint] Injetado via injectFingerprintToPage');
                return true;
            }

            // Outro método possível
            if (typeof injector.inject === 'function') {
                await injector.inject(page, fingerprintData);
                console.log('[Fingerprint] Injetado via inject');
                return true;
            }

        } catch (libError) {
            console.warn(`[Fingerprint] Biblioteca de injeção falhou ou não compatível: ${libError.message}`);
        }

        // Método 2: Injeção manual via evaluateOnNewDocument
        await page.evaluateOnNewDocument((fp) => {
            // ===== NAVIGATOR SPOOFING =====
            const nav = fp.navigator || {};

            // Hardware Concurrency
            if (nav.hardwareConcurrency) {
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => nav.hardwareConcurrency
                });
            }

            // Device Memory
            if (nav.deviceMemory) {
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => nav.deviceMemory
                });
            }

            // Platform
            if (nav.platform) {
                Object.defineProperty(navigator, 'platform', {
                    get: () => nav.platform
                });
            }

            // Languages
            if (nav.languages) {
                Object.defineProperty(navigator, 'languages', {
                    get: () => Object.freeze([...nav.languages])
                });
            }

            // Remover webdriver flag (CRÍTICO)
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // ===== WEBGL SPOOFING =====
            const wg = fp.webgl || {};

            if (wg.vendor || wg.renderer) {
                const getParameterProto = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function (param) {
                    // UNMASKED_VENDOR_WEBGL
                    if (param === 37445) {
                        return wg.vendor || 'Google Inc. (Intel)';
                    }
                    // UNMASKED_RENDERER_WEBGL  
                    if (param === 37446) {
                        return wg.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                    }
                    return getParameterProto.call(this, param);
                };

                // WebGL2 também
                if (typeof WebGL2RenderingContext !== 'undefined') {
                    const getParameter2Proto = WebGL2RenderingContext.prototype.getParameter;
                    WebGL2RenderingContext.prototype.getParameter = function (param) {
                        if (param === 37445) {
                            return wg.vendor || 'Google Inc. (Intel)';
                        }
                        if (param === 37446) {
                            return wg.renderer || 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                        }
                        return getParameter2Proto.call(this, param);
                    };
                }
            }

            // ===== SCREEN SPOOFING =====
            const sc = fp.screen || {};

            if (sc.width) {
                Object.defineProperty(screen, 'width', { get: () => sc.width });
                Object.defineProperty(screen, 'availWidth', { get: () => sc.availWidth || sc.width });
            }
            if (sc.height) {
                Object.defineProperty(screen, 'height', { get: () => sc.height });
                Object.defineProperty(screen, 'availHeight', { get: () => sc.availHeight || sc.height - 40 });
            }
            if (sc.colorDepth) {
                Object.defineProperty(screen, 'colorDepth', { get: () => sc.colorDepth });
                Object.defineProperty(screen, 'pixelDepth', { get: () => sc.colorDepth });
            }

            // ===== PLUGINS SPOOFING =====
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                    ];
                    plugins.length = 3;
                    return plugins;
                }
            });

            // ===== PERMISSIONS SPOOFING =====
            const originalQuery = window.navigator.permissions?.query;
            if (originalQuery) {
                window.navigator.permissions.query = (parameters) => {
                    if (parameters.name === 'notifications') {
                        return Promise.resolve({ state: Notification.permission });
                    }
                    return originalQuery(parameters);
                };
            }

            // ===== CHROME RUNTIME =====
            if (!window.chrome) {
                window.chrome = { runtime: {} };
            } else if (!window.chrome.runtime) {
                window.chrome.runtime = {};
            }

            // ===== CANVAS NOISE (Anti-fingerprint) =====
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function (type) {
                if (type === 'image/png' || type === undefined) {
                    const context = this.getContext('2d');
                    if (context) {
                        const imageData = context.getImageData(0, 0, this.width, this.height);
                        // Adicionar ruído mínimo
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.99 ? 1 : 0);
                        }
                        context.putImageData(imageData, 0, 0);
                    }
                }
                return originalToDataURL.apply(this, arguments);
            };

            console.log('[TITAN] Fingerprint injetado com sucesso');

        }, { screen, navigator: navigatorProps, webgl: webglProps });

        console.log('[Fingerprint] Injetado via evaluateOnNewDocument (manual)');
        return true;

    } catch (error) {
        console.error(`[Fingerprint] Erro ao injetar: ${error.message}`);
        return false;
    }
}

/**
 * Valida se o fingerprint está consistente
 */
function validateFingerprint(fingerprint) {
    if (!fingerprint) return false;
    const screen = fingerprint.screen || {};
    const nav = fingerprint.navigator || {};
    const wg = fingerprint.webgl || {};

    const checks = {
        hasScreen: !!(screen.width && screen.height),
        hasNavigator: !!(nav.hardwareConcurrency),
        hasWebGL: !!(wg.renderer),
        isConsistent: true
    };

    // Verificar consistência OS
    if (fingerprint._os === 'windows' && nav.platform !== 'Win32') {
        checks.isConsistent = false;
    }
    if (fingerprint._os === 'macos' && nav.platform !== 'MacIntel') {
        checks.isConsistent = false;
    }

    const isValid = checks.hasScreen && checks.hasNavigator && checks.hasWebGL && checks.isConsistent;

    if (!isValid) {
        console.warn('[Fingerprint] Validação falhou:', checks);
    }

    return isValid;
}

/**
 * Retorna uma identidade completa e consistente (UA + Headers + Fingerprint)
 */
async function getConsistentIdentity(locale = 'pt-BR') {
    // Retornar cache se existir
    if (cachedIdentity) {
        console.log('[Fingerprint] Usando identidade em cache');
        return cachedIdentity;
    }

    // Obter profile de User-Agent
    const profile = getConsistentProfile(locale);
    const os = profile.platform.toLowerCase().includes('windows') ? 'windows' : 'macos';

    // Gerar fingerprint compatível
    const fingerprint = await generateFingerprint({
        browser: 'chrome',
        os: os,
        locale: locale
    });

    // Ajustar fingerprint para ser consistente com UA
    if (fingerprint.navigator) {
        fingerprint.navigator.platform = os === 'windows' ? 'Win32' : 'MacIntel';
    }

    // Validar
    const isValid = validateFingerprint(fingerprint);
    if (!isValid) {
        console.warn('[Fingerprint] Fingerprint gerado pode ter inconsistências');
    }

    // Montar identidade completa
    const identity = {
        userAgent: profile.userAgent,
        headers: profile.headers,
        fingerprint: fingerprint,
        viewport: {
            width: fingerprint.screen?.width || 1920,
            height: fingerprint.screen?.height || 1080
        },
        platform: profile.platform,
        chromeVersion: profile.chromeVersion,
        locale: locale,
        os: os
    };

    // Cachear
    cachedFingerprint = fingerprint;
    cachedIdentity = identity;

    console.log(`[Fingerprint] Identidade criada: ${os}/${profile.chromeVersion}`);

    return identity;
}

/**
 * Limpa o cache (usar entre jobs diferentes)
 */
function clearCache() {
    cachedFingerprint = null;
    cachedIdentity = null;
    console.log('[Fingerprint] Cache limpo');
}

module.exports = {
    generateFingerprint,
    injectFingerprint,
    validateFingerprint,
    getConsistentIdentity,
    clearCache,
    FALLBACK_FINGERPRINTS
};
