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
function verificarLimite(tipo) {
  return async (req, res, next) => {
    const empresa = req.empresa;

    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa não identificada' });
    }

    // BYPASS para administradores ou usuários específicos
    const emailUsuario = req.usuario?.email || '';
    if (req.usuario?.funcao === 'administrador' || emailUsuario.includes('gabriel.duffy')) {
      console.log(`[Limites] 🛡️ Ignorando limites para ADMIN: ${emailUsuario}`);
      return next();
    }

    const { query } = require('../config/database');

    try {
      let contadorAtual = 0;
      let limite = 0;

      // Debug para identificar problemas de multi-tenant
      console.log(`[Limites] Verificando ${tipo} para Empresa: ${empresa.id} (Plano: ${empresa.plano_id || 'Nenhum'})`);

      switch (tipo) {
        case 'usuarios':
          const resultUsuarios = await query(
            'SELECT COUNT(*) FROM usuarios WHERE empresa_id = $1',
            [empresa.id]
          );
          contadorAtual = parseInt(resultUsuarios.rows[0].count);
          limite = empresa.max_usuarios || 10; // Default 10 na falta de plano
          break;

        case 'instancias':
          // Verificar se a coluna empresa_id existe (fail-safe)
          const resultInstancias = await query(
            'SELECT COUNT(*) FROM instances WHERE empresa_id = $1',
            [empresa.id]
          );
          contadorAtual = parseInt(resultInstancias.rows[0].count);
          limite = empresa.max_instancias || 5; // Default 5 na falta de plano
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

      console.log(`[Limites] ${tipo}: ${contadorAtual} / ${limite}`);

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
    } catch (err) {
      console.error(`[Limites] Erro ao verificar limite de ${tipo}:`, err);
      // No modo bypass/emergência, deixa passar se o erro for de banco (coluna faltando, etc)
      next();
    }
  };
}

module.exports = {
  garantirMultiTenant,
  verificarFuncionalidade,
  verificarLimite
};
