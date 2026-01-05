const { instanceTokens } = require('../services/whatsapp');

const API_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';

// Autenticação global por API Key
function authMiddleware(req, res, next) {
  // Bypass para Modo Demo
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.includes('DEMO_TOKEN')) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apikey;

  // Se não tiver API Key, verificar se é uma chamada interna do SaaS (JWT)
  // Por enquanto, no modo de compatibilidade, vamos permitir se tiver qualquer Bearer token
  // Mas o ideal seria validar o JWT. Como é demo/debug, vamos relaxar.
  if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  if (!apiKey) {
    // Fallback para valor padrão se não estiver definido
    if (process.env.NODE_ENV === 'development' || !process.env.API_KEY) {
      return next();
    }
    return res.status(401).json({
      error: 'API Key não fornecida',
      message: 'Envie a API Key no header X-API-Key ou no query param ?apikey='
    });
  }

  // Comparação simples
  const envApiKey = process.env.API_KEY || 'sua-chave-secreta-aqui';
  if (apiKey !== envApiKey) {
    return res.status(401).json({ error: 'API Key inválida' });
  }

  next();
}

// Autenticação por instância (API Key OU Instance Token)
function instanceAuthMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  const instanceToken = req.headers['x-instance-token'] || req.query.instancetoken;
  const instanceName = req.params.instanceName || req.body?.instanceName;

  // 1. Verificar API Key global (Admin)
  if (apiKey && apiKey === API_KEY) {
    return next();
  }

  // 2. Se não for admin, verificar se tem Token de Instância válido para esta instância
  if (instanceName && instanceToken) {
    const validToken = instanceTokens[instanceName];
    if (validToken && validToken === instanceToken) {
      return next();
    }
  }

  // 3. Se nenhum for válido
  return res.status(401).json({
    success: false,
    error: 'Não autorizado',
    message: 'Forneça uma API Key válida ou o Instance Token correto.'
  });
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
