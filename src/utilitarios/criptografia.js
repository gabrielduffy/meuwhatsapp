const crypto = require('crypto');
const config = require('../config/env');

// Chave para criptografia (deve ser fixa para conseguir descriptografar depois)
// Se não houver uma chave no ENV, usamos uma derivação do JWT_SECRET
const ENCRYPTION_KEY = crypto.scryptSync(config.jwtSecret || 'fallback-secret', 'salt', 32);
const IV_LENGTH = 16;

/**
 * Criptografa um texto
 * @param {string} text 
 * @returns {string} iv:encryptedData
 */
function criptografar(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Descriptografa um texto
 * @param {string} text 
 * @returns {string}
 */
function descriptografar(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Erro na descriptografia:', err.message);
        return null;
    }
}

module.exports = {
    criptografar,
    descriptografar
};
