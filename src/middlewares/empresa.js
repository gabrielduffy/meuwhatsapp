/**
 * Middleware para garantir que operações são isoladas por empresa (multi-tenant)
 * Injeta automaticamente empresa_id nas queries
 */

function garantirMultiTenant(req, res, next) {
  const empresaId = req.empresaId;

  if (!empresaId) {
    return res.status(400).json({
      erro: 'Empresa não identificada',
      mensagem: 'Esta operação requer que você esteja associado a uma empresa'
    });
  }

  // Adicionar helper para filtrar por empresa
  req.filtroEmpresa = () => {
    return { empresa_id: empresaId };
  };

  next();
}

/**
 * Verificar se empresa tem funcionalidade ativa
 */
function verificarFuncionalidade(funcionalidade) {
  return (req, res, next) => {
    const empresa = req.empresa;

    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa não identificada' });
    }

    // Buscar plano e funcionalidades (já vem do middleware de autenticação)
    const funcionalidades = empresa.funcionalidades || {};

    if (!funcionalidades[funcionalidade]) {
      return res.status(403).json({
        erro: `Funcionalidade '${funcionalidade}' não disponível no seu plano`,
        mensagem: 'Faça upgrade do seu plano para acessar esta funcionalidade',
        codigo: 'FUNCIONALIDADE_NAO_DISPONIVEL'
      });
    }

    next();
  };
}

/**
 * Verificar limites do plano
 */
async function verificarLimite(tipo) {
  return async (req, res, next) => {
    const empresa = req.empresa;

    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa não identificada' });
    }

    const { query } = require('../config/database');

    let contadorAtual = 0;
    let limite = 0;

    switch (tipo) {
      case 'usuarios':
        const resultUsuarios = await query(
          'SELECT COUNT(*) FROM usuarios WHERE empresa_id = $1',
          [empresa.id]
        );
        contadorAtual = parseInt(resultUsuarios.rows[0].count);
        limite = empresa.max_usuarios || 1;
        break;

      case 'instancias':
        const resultInstancias = await query(
          'SELECT COUNT(*) FROM instancias_whatsapp WHERE empresa_id = $1',
          [empresa.id]
        );
        contadorAtual = parseInt(resultInstancias.rows[0].count);
        limite = empresa.max_instancias || 1;
        break;

      case 'contatos':
        const resultContatos = await query(
          'SELECT COUNT(*) FROM contatos WHERE empresa_id = $1',
          [empresa.id]
        );
        contadorAtual = parseInt(resultContatos.rows[0].count);
        limite = empresa.max_contatos || 1000;
        break;

      default:
        return next();
    }

    if (contadorAtual >= limite) {
      return res.status(403).json({
        erro: `Limite de ${tipo} atingido`,
        limite_atual: limite,
        utilizado: contadorAtual,
        mensagem: `Seu plano permite no máximo ${limite} ${tipo}. Faça upgrade para aumentar este limite.`,
        codigo: 'LIMITE_ATINGIDO'
      });
    }

    next();
  };
}

module.exports = {
  garantirMultiTenant,
  verificarFuncionalidade,
  verificarLimite
};
