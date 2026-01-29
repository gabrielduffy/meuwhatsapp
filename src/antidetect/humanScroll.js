/**
 * humanScroll.js
 * Sistema de scroll orgânico com simulação de inércia e comportamento humano
 */

const config = require('../config/titan.config');

/**
 * Gera uma curva de Bezier quadrática simples para suavização
 * @param {number} t Progresso (0 a 1)
 * @returns {number} Posição suavizada
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Delay aleatório entre frames
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Scroll orgânico que simula o movimento humano real
 * @param {import('puppeteer').Page} page 
 * @param {number} distance Distância total para scrollar
 * @param {Object} options Configurações de scroll
 */
async function humanScroll(page, distance, options = {}) {
    const {
        selector = null, // Se nulo, scrola a window
        steps = Math.floor(Math.random() * (config.scroll.steps.max - config.scroll.steps.min + 1)) + config.scroll.steps.min,
        overshootChance = config.scroll.overshootChance
    } = options;

    // Decide se vai dar overshoot (passar um pouco do ponto e voltar)
    const hasOvershoot = Math.random() < overshootChance;
    const overshootDistance = hasOvershoot
        ? Math.floor(Math.random() * (config.scroll.overshootDistance.max - config.scroll.overshootDistance.min + 1)) + config.scroll.overshootDistance.min
        : 0;
    const totalTarget = distance + overshootDistance;

    console.log(`[HumanScroll] Iniciando scroll de ${distance}px (Overshoot: ${overshootDistance}px)`);

    try {
        let currentPos = 0;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const ease = easeOutQuad(t);
            const nextPos = Math.floor(totalTarget * ease);
            const delta = nextPos - currentPos;

            await page.evaluate((sel, d) => {
                const element = sel ? document.querySelector(sel) : window;
                if (element === window) {
                    window.scrollBy(0, d);
                } else if (element) {
                    element.scrollBy(0, d);
                }
            }, selector, delta);

            currentPos = nextPos;

            // Delay variável entre frames para quebrar o padrão rítmico
            await sleep(config.timing.scrollStep.min + Math.floor(Math.random() * (config.timing.scrollStep.max - config.timing.scrollStep.min)));
        }

        // Se deu overshoot, volta suavemente para a posição correta
        if (hasOvershoot) {
            await sleep(150 + Math.floor(Math.random() * 200));
            await humanScroll(page, -overshootDistance, { ...options, overshootChance: 0, steps: 8 });
        }

        // Delay de "leitura" pós-scroll
        const readingTime = Math.floor(Math.random() * (config.timing.readingTime.max - config.timing.readingTime.min + 1)) + config.timing.readingTime.min;
        await sleep(readingTime);

    } catch (error) {
        console.error(`[HumanScroll] Erro: ${error.message}`);
    }
}

/**
 * Simula o scroll via roda do mouse (wheel)
 */
async function wheelScroll(page, distance) {
    try {
        const steps = Math.floor(Math.random() * 5) + 5;
        const deltaY = Math.floor(distance / steps);

        for (let i = 0; i < steps; i++) {
            await page.mouse.wheel({ deltaY });
            await sleep(30 + Math.floor(Math.random() * 50));
        }
    } catch (e) { }
}

/**
 * Scroll suave até um elemento específico
 */
async function smoothScrollTo(page, elementSelector) {
    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, elementSelector);
    await sleep(1000 + Math.random() * 1000);
}

module.exports = {
    humanScroll,
    wheelScroll,
    smoothScrollTo
};
