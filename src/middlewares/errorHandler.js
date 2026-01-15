/**
 * Error Handler Global
 * Centraliza tratamento de erros com formato padronizado
 */

const config = require('../config/env');

/**
 * Classe de erro customizada para erros operacionais
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Erro esperado (não é bug)
    Error.captureStackTrace(this, this.constructor);
  }
}

const logger = require('../config/logger');

/**
 * Middleware de error handling
 * Deve ser o ÚLTIMO middleware registrado
 */
const errorHandler = (err, req, res, next) => {
  // Log do erro usando o logger centralizado
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.logError(err, req);
  } else {
    logger.warn(`[WARNING] ${err.message}`, {
      code: err.code,
      url: req.url,
      method: req.method,
      user: req.user?.id
    });
  }

  // Erro operacional (esperado) - retornar detalhes
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      }
    });
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token de autenticação expirado'
      }
    });
  }

  // Erros de Postgres (pg)
  if (err.code && typeof err.code === 'string' && err.code.startsWith('23')) {
    // 23505 = unique violation
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Registro duplicado. Este valor já existe no sistema.',
          details: err.detail
        }
      });
    }

    // 23503 = foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Violação de integridade referencial. Registro relacionado não encontrado.',
          details: err.detail
        }
      });
    }

    // Outras constraint violations
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_CONSTRAINT',
        message: 'Violação de restrição do banco de dados',
        details: config.nodeEnv === 'production' ? undefined : err.detail
      }
    });
  }

  // Erro de conexão com banco
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.'
      }
    });
  }

  // Erro não esperado (bug no código)
  // Não expor detalhes em produção
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production'
        ? 'Erro interno do servidor'
        : err.message,
      ...(config.nodeEnv !== 'production' && { stack: err.stack })
    }
  });
};

/**
 * Wrapper para async handlers
 * Captura erros de promises e passa para o error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para rotas não encontradas
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Rota não encontrada: ${req.method} ${req.url}`,
    404,
    'ROUTE_NOT_FOUND'
  );

  // Log básico para debug rápido de rotas inexistentes
  logger.warn(`404 - Rota inexistente: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
