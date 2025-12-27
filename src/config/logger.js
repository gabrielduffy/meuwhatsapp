/**
 * Configuração de logging estruturado com Winston
 * Logs em arquivo e console com rotação automática
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./env');

// Garantir que diretório de logs existe
const logDir = config.logDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato customizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    return log;
  })
);

// Criar logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.json(),
  defaultMeta: {
    service: 'whatsbenemax-api',
    env: config.nodeEnv
  },
  transports: [
    // Erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: customFormat
    }),

    // Warnings em arquivo separado
    new winston.transports.File({
      filename: path.join(logDir, 'warn.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 3,
      format: customFormat
    }),

    // Todos os logs em arquivo combinado
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: customFormat
    })
  ],
  // Não crashar em caso de erro no logger
  exitOnError: false
});

// Em desenvolvimento, também logar no console com cores
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, metadata }) => {
        let log = `${timestamp} ${level}: ${message}`;

        if (metadata && Object.keys(metadata).length > 0) {
          log += `\n${JSON.stringify(metadata, null, 2)}`;
        }

        return log;
      })
    )
  }));
}

// Helpers para logging estruturado
logger.logRequest = (req, message = 'HTTP Request') => {
  logger.info(message, {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    user: req.user?.id,
    ip: req.ip
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code
  };

  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.url,
      user: req.user?.id,
      ip: req.ip
    };
  }

  logger.error('Application Error', errorLog);
};

logger.logDatabaseQuery = (query, params = null, duration = null) => {
  const log = { query };
  if (params) log.params = params;
  if (duration) log.duration = `${duration}ms`;

  logger.debug('Database Query', log);
};

// Log de inicialização
logger.info('Logger inicializado', {
  logLevel: config.logLevel,
  logDir: logDir,
  nodeEnv: config.nodeEnv
});

module.exports = logger;
