const { instanceTokens } = require('../services/whatsapp');

const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';

// Autenticação global por API Key
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API Key não fornecida',
      message: 'Envie a API Key no header X-API-Key ou no query param ?apikey='
    });
  }

  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' });
  }

  next();
}

// Autenticação por instância (API Key + Instance Token)
function instanceAuthMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  const instanceToken = req.headers['x-instance-token'] || req.query.instancetoken;
  const instanceName = req.params.instanceName || req.body?.instanceName;

  // Primeiro verificar API Key global
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'API Key inválida' });
  }

  // Se tiver token de instância, validar
  if (instanceToken && instanceName) {
    if (instanceTokens[instanceName] && instanceTokens[instanceName] !== instanceToken) {
      return res.status(401).json({ error: 'Token de instância inválido' });
    }
  }

  next();
}

// Middleware para validar se instância existe
function validateInstance(req, res, next) {
  const { getInstance } = require('../services/whatsapp');
  const instanceName = req.params.instanceName || req.body?.instanceName;

  if (!instanceName) {
    return res.status(400).json({ error: 'instanceName é obrigatório' });
  }

  const instance = getInstance(instanceName);
  if (!instance) {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  req.instance = instance;
  req.instanceName = instanceName;
  next();
}

// Middleware para validar se instância está conectada
function requireConnected(req, res, next) {
  if (!req.instance?.isConnected) {
    return res.status(400).json({ error: 'Instância não está conectada' });
  }
  next();
}

module.exports = {
  authMiddleware,
  instanceAuthMiddleware,
  validateInstance,
  requireConnected
};
