const rateLimit = require('express-rate-limit');

// Rate limiter global
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite de 100 requisições por minuto. Tente novamente em breve.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar API Key como identificador se disponível, senão usar IP
    return req.headers['x-api-key'] || req.ip;
  }
});

// Rate limiter para envio de mensagens (mais restritivo)
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 mensagens por minuto
  message: {
    error: 'Limite de mensagens excedido',
    message: 'Você excedeu o limite de 30 mensagens por minuto. Aguarde antes de enviar mais.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para criação de instâncias
const instanceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 instâncias por hora
  message: {
    error: 'Limite de criação de instâncias excedido',
    message: 'Você excedeu o limite de 10 instâncias por hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para verificação de números
const checkNumberLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // 50 verificações por minuto
  message: {
    error: 'Limite de verificações excedido',
    message: 'Você excedeu o limite de 50 verificações por minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  rateLimiter,
  messageLimiter,
  instanceLimiter,
  checkNumberLimiter
};
