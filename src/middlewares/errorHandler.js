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


/**
 * Middleware para rotas não encontradas (404)
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
