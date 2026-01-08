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

// Autenticação por instância (API Key OU Instance Token OU JWT)
async function instanceAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  const instanceToken = req.headers['x-instance-token'] || req.query.instancetoken;
  const instanceName = req.params.instanceName || req.body?.instanceName;

  // 1. Verificar se é um token vindo no header Authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // Tenta validar como Token Pessoal primeiro (compatibilidade com integrações externas tipo Lovable)
    const { query } = require('../config/database');
    try {
      const userRes = await query(`
        SELECT u.*, e.id as emp_id, e.nome as emp_nome, e.plano_id, e.status as emp_status
        FROM usuarios u
        LEFT JOIN empresas e ON u.empresa_id = e.id
        WHERE u.api_token = $1 AND u.ativo = true
      `, [token.trim()]);

      if (userRes.rows.length > 0) {
        const usuario = userRes.rows[0];
        console.log(`[Auth Debug] Token Pessoal aceito via Bearer: ${usuario.nome}`);

        req.usuario = usuario;
        req.usuarioId = usuario.id;
        req.empresaId = usuario.empresa_id;
        req.empresa = {
          id: usuario.empresa_id,
          nome: usuario.emp_nome,
          plano_id: usuario.plano_id,
          status: usuario.emp_status,
          max_instancias: usuario.max_instancias || 5,
          max_usuarios: usuario.max_usuarios || 10
        };
        return next();
      }
    } catch (err) {
      console.error('[Auth Debug] Erro ao validar Bearer como Token Pessoal:', err);
    }

    // Se não for um token pessoal, tenta validar como JWT do Dashboard
    const { autenticarMiddleware } = require('./autenticacao');
    return autenticarMiddleware(req, res, next);
  }

  // 2. Verificar API Key (X-API-Key)
  if (apiKey) {
    const { query } = require('../config/database');

    // 2a. Verificar se é a API Key Master (Admin)
    const MASTER_KEY = process.env.API_KEY || 'sua-chave-secreta-aqui';
    if (apiKey === MASTER_KEY) {
      const requestedEmpresaId = req.headers['x-empresa-id'];
      try {
        let sql = 'SELECT * FROM empresas ORDER BY criado_em DESC LIMIT 1';
        let params = [];
        if (requestedEmpresaId) {
          sql = 'SELECT * FROM empresas WHERE id = $1';
          params = [requestedEmpresaId];
        }
        const dbRes = await query(sql, params);
        if (dbRes.rows.length > 0) {
          req.empresa = dbRes.rows[0];
          req.empresaId = req.empresa.id;
        }
        return next();
      } catch (e) {
        return next();
      }
    }

    // 2b. SE NÃO FOR A MASTER, verificar se é um Token Pessoal de Usuário
    try {
      const trimmedKey = apiKey.trim();
      const userRes = await query(`
        SELECT u.*, e.id as emp_id, e.nome as emp_nome, e.plano_id, e.status as emp_status
        FROM usuarios u
        LEFT JOIN empresas e ON u.empresa_id = e.id
        WHERE u.api_token = $1 AND u.ativo = true
      `, [trimmedKey]);

      if (userRes.rows.length > 0) {
        const usuario = userRes.rows[0];
        console.log(`[Auth Debug] Token pessoal vlido para: ${usuario.nome}`);

        // Se a empresa estiver inativa, barrar (exceto para admin se for o caso)
        if (usuario.empresa_id && usuario.emp_status !== 'ativo') {
          return res.status(403).json({ error: 'Empresa inativa' });
        }

        req.usuario = usuario;
        req.usuarioId = usuario.id;
        req.empresaId = usuario.empresa_id;
        req.empresa = {
          id: usuario.empresa_id,
          nome: usuario.emp_nome,
          plano_id: usuario.plano_id,
          status: usuario.emp_status,
          max_instancias: 5,
          max_usuarios: 10
        };

        return next();
      } else {
        console.warn(`[Auth Debug] Token no encontrado: ${trimmedKey.substring(0, 5)}...`);
      }
    } catch (err) {
      console.error('[Auth Debug] Erro ao validar token:', err);
    }
  }

  // 3. Verificar Token de Instância (Legado)
  if (instanceName && instanceToken) {
    const validToken = instanceTokens[instanceName];
    if (validToken && validToken === instanceToken) {
      return next();
    }
  }

  // 4. Se nenhum for válido
  return res.status(401).json({
    success: false,
    error: 'Não autorizado',
    message: 'Forneça uma API Key válida (Master ou Pessoal), Instance Token ou esteja logado.'
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
