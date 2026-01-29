/**
 * humanMouse.js
 * Movimentos orgânicos de mouse para evitar detecção bot
 */

const config = require('../config/titan.config');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Gera pontos de uma curva de Bezier para trajetórias de mouse
 * @param {Object} start {x, y}
 * @param {Object} end {x, y}
 * @param {number} steps Quantidade de pontos
 */
function generateBezierCurve(start, end, steps) {
    const control = {
        x: start.x + (end.x - start.x) * Math.random() + (Math.random() * 100 - 50),
        y: start.y + (end.y - start.y) * Math.random() + (Math.random() * 100 - 50)
    };

    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
        points.push({ x, y });
    }
    return points;
}

/**
 * Move o mouse de forma humana entre dois pontos
 * @param {import('puppeteer').Page} page 
 */
async function humanMouseMove(page, targetX, targetY, options = {}) {
    const { steps = 15 + Math.floor(Math.random() * 20) } = options;

    // Pega posição atual (ou assume 0,0)
    const startX = Math.floor(Math.random() * 100);
    const startY = Math.floor(Math.random() * 100);

    const points = generateBezierCurve({ x: startX, y: startY }, { x: targetX, y: targetY }, steps);

    for (const point of points) {
        await page.mouse.move(point.x, point.y);

        // Hesitação aleatória (simula humano pensando/ajustando)
        if (Math.random() < config.mouse.hesitationChance) {
            await sleep(20 + Math.random() * 50);
        }

        await sleep(5 + Math.random() * 10);
    }
}

/**
 * Faz o mouse "passear" e fazer hover em elementos aleatórios
 * @param {import('puppeteer').Page} page 
 * @param {string} selector 
 * @param {number} count 
 */
async function hoverRandomElements(page, selector, count = null) {
    try {
        const elements = await page.$$(selector);
        if (elements.length === 0) return;

        const targetCount = count || Math.floor(Math.random() * (config.mouse.hoverCount.max - config.mouse.hoverCount.min + 1)) + config.mouse.hoverCount.min;

        // Embaralha e pega os N primeiros
        const shuffled = elements.sort(() => 0.5 - Math.random());
        const targets = shuffled.slice(0, targetCount);

        for (const el of targets) {
            const box = await el.boundingBox();
            if (box) {
                const centerX = box.x + box.width / 2;
                const centerY = box.y + box.height / 2;

                await humanMouseMove(page, centerX, centerY);
                // Duração do hover conforme config
                await sleep(Math.floor(Math.random() * (config.mouse.hoverDuration.max - config.mouse.hoverDuration.min + 1)) + config.mouse.hoverDuration.min);
            }
        }
    } catch (e) {
        console.error(`[HumanMouse] Erro no hover: ${e.message}`);
    }
}

/**
 * Move o mouse para um elemento específico
 */
async function moveToElement(page, selectorOrElement) {
    try {
        const el = typeof selectorOrElement === 'string'
            ? await page.$(selectorOrElement)
            : selectorOrElement;

        if (!el) return;

        const box = await el.boundingBox();
        if (box) {
            await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
        }
    } catch (e) { }
}

/**
 * Movimento aleatório de "descanso" ou tédio
 */
async function randomIdleMovement(page) {
    const viewport = page.viewport();
    if (!viewport) return;

    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);

    console.log(`[HumanMouse] Executando movimento idle para [${x}, ${y}]`);
    await humanMouseMove(page, x, y, { steps: 30 });
}

/**
 * Movimento inicial ao carregar a página
 */
async function initialMovement(page) {
    const pause = Math.floor(Math.random() * (config.timing.initialPause.max - config.timing.initialPause.min + 1)) + config.timing.initialPause.min;
    await sleep(pause);
    await randomIdleMovement(page);
}

module.exports = {
    humanMouseMove,
    hoverRandomElements,
    moveToElement,
    randomIdleMovement,
    initialMovement
};
