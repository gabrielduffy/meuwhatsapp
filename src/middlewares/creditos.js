const empresaRepositorio = require('../repositorios/empresa.repositorio');

/**
 * Verificar se empresa tem créditos suficientes
 */
function verificarCreditos(quantidadeRequerida = 1) {
  return async (req, res, next) => {
    try {
      const empresaId = req.empresaId;

      if (!empresaId) {
        return res.status(400).json({ erro: 'Empresa não identificada' });
      }

      const empresa = await empresaRepositorio.buscarPorId(empresaId);

      if (!empresa) {
        return res.status(404).json({ erro: 'Empresa não encontrada' });
      }

      if (empresa.saldo_creditos < quantidadeRequerida) {
        return res.status(402).json({
          erro: 'Créditos insuficientes',
          saldo_atual: empresa.saldo_creditos,
          creditos_requeridos: quantidadeRequerida,
          codigo: 'CREDITOS_INSUFICIENTES'
        });
      }

      // Adicionar informação de créditos ao request
      req.creditosDisponiveis = empresa.saldo_creditos;

      next();
    } catch (erro) {
      console.error('[Middleware Créditos] Erro:', erro);
      return res.status(500).json({ erro: 'Erro ao verificar créditos' });
    }
  };
}

/**
 * Debitar créditos após a ação
 * Use como middleware final ou chame manualmente
 */
async function debitarCreditos(empresaId, quantidade, descricao, tipoReferencia = null, idReferencia = null) {
  try {
    await empresaRepositorio.debitarCreditos(
      empresaId,
      quantidade,
      descricao,
      tipoReferencia,
      idReferencia
    );
    return true;
  } catch (erro) {
    console.error('[Debitar Créditos] Erro:', erro);
    throw erro;
  }
}

module.exports = {
  verificarCreditos,
  debitarCreditos
};
