const logger = require('../config/logger');

/**
 * Middleware global para tratamento de erros
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  // Logar erro
  logger.error(`[Error] ${req.method} ${req.url}`, {
    status: status,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Responder ao cliente
  res.status(status).json({
    error: true,
    message: message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
