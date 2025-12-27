const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Controller para relatórios e analytics
 */

// Obter métricas gerais
async function obterMetricas(req, res) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { data_inicio, data_fim } = req.query;

    const dataInicio = data_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dataFim = data_fim || new Date().toISOString();

    // Buscar métricas de mensagens
    const mensagens = await query(
      `SELECT
        COUNT(*) FILTER (WHERE tipo = 'enviada') as enviadas,
        COUNT(*) FILTER (WHERE tipo = 'recebida') as recebidas,
        COUNT(*) FILTER (WHERE tipo = 'enviada' AND status = 'entregue') as entregues,
        COUNT(*) FILTER (WHERE tipo = 'enviada' AND status = 'lido') as lidas
       FROM mensagens
       WHERE empresa_id = $1
       AND criado_em BETWEEN $2 AND $3`,
      [empresaId, dataInicio, dataFim]
    );

    // Buscar conversas
    const conversas = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'aberto') as abertas,
        COUNT(*) FILTER (WHERE status = 'resolvido') as resolvidas
       FROM conversas
       WHERE empresa_id = $1
       AND criado_em BETWEEN $2 AND $3`,
      [empresaId, dataInicio, dataFim]
    );

    // Buscar contatos novos
    const contatos = await query(
      `SELECT COUNT(*) as novos
       FROM contatos
       WHERE empresa_id = $1
       AND criado_em BETWEEN $2 AND $3`,
      [empresaId, dataInicio, dataFim]
    );

    // Calcular taxas
    const enviadasTotal = parseInt(mensagens.rows[0].enviadas) || 0;
    const recebidasTotal = parseInt(mensagens.rows[0].recebidas) || 0;
    const entreguesTotal = parseInt(mensagens.rows[0].entregues) || 0;
    const lidasTotal = parseInt(mensagens.rows[0].lidas) || 0;

    const taxaEntrega = enviadasTotal > 0 ? ((entreguesTotal / enviadasTotal) * 100).toFixed(1) : 0;
    const taxaLeitura = enviadasTotal > 0 ? ((lidasTotal / enviadasTotal) * 100).toFixed(1) : 0;
    const taxaResposta = enviadasTotal > 0 ? ((recebidasTotal / enviadasTotal) * 100).toFixed(1) : 0;

    res.json({
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      mensagens: {
        enviadas: enviadasTotal,
        recebidas: recebidasTotal,
        entregues: entreguesTotal,
        lidas: lidasTotal,
      },
      conversas: {
        total: parseInt(conversas.rows[0].total) || 0,
        abertas: parseInt(conversas.rows[0].abertas) || 0,
        resolvidas: parseInt(conversas.rows[0].resolvidas) || 0,
      },
      contatos: {
        novos: parseInt(contatos.rows[0].novos) || 0,
      },
      taxas: {
        entrega: parseFloat(taxaEntrega),
        leitura: parseFloat(taxaLeitura),
        resposta: parseFloat(taxaResposta),
      },
    });
  } catch (error) {
    logger.error('Erro ao obter métricas:', error);
    res.status(500).json({ erro: 'Erro ao obter métricas' });
  }
}

// Obter gráfico de mensagens por dia
async function obterGraficoMensagens(req, res) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { dias = 30 } = req.query;

    const result = await query(
      `SELECT
        DATE(criado_em) as data,
        COUNT(*) FILTER (WHERE tipo = 'enviada') as enviadas,
        COUNT(*) FILTER (WHERE tipo = 'recebida') as recebidas
       FROM mensagens
       WHERE empresa_id = $1
       AND criado_em >= NOW() - INTERVAL '${parseInt(dias)} days'
       GROUP BY DATE(criado_em)
       ORDER BY data DESC
       LIMIT $2`,
      [empresaId, parseInt(dias)]
    );

    res.json({ grafico: result.rows.reverse() });
  } catch (error) {
    logger.error('Erro ao obter gráfico:', error);
    res.status(500).json({ erro: 'Erro ao obter gráfico' });
  }
}

// Obter top conversas
async function obterTopConversas(req, res) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { limite = 10 } = req.query;

    const result = await query(
      `SELECT
        c.id,
        c.nome_contato,
        c.telefone_contato,
        COUNT(m.id) as total_mensagens,
        MAX(m.criado_em) as ultima_mensagem
       FROM conversas c
       LEFT JOIN mensagens m ON m.conversa_id = c.id
       WHERE c.empresa_id = $1
       GROUP BY c.id, c.nome_contato, c.telefone_contato
       ORDER BY total_mensagens DESC
       LIMIT $2`,
      [empresaId, parseInt(limite)]
    );

    res.json({ conversas: result.rows });
  } catch (error) {
    logger.error('Erro ao obter top conversas:', error);
    res.status(500).json({ erro: 'Erro ao obter top conversas' });
  }
}

// Obter relatório de instâncias
async function obterRelatorioInstancias(req, res) {
  try {
    const empresaId = req.usuario.empresa_id;

    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'conectado') as conectadas,
        COUNT(*) FILTER (WHERE status = 'desconectado') as desconectadas,
        COUNT(*) FILTER (WHERE status = 'erro') as com_erro
       FROM instancias
       WHERE empresa_id = $1`,
      [empresaId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao obter relatório de instâncias:', error);
    res.status(500).json({ erro: 'Erro ao obter relatório de instâncias' });
  }
}

// Exportar relatório
async function exportarRelatorio(req, res) {
  try {
    const empresaId = req.usuario.empresa_id;
    const { tipo = 'mensagens', formato = 'json' } = req.query;

    // Por enquanto retorna JSON, depois pode implementar CSV/PDF
    let dados;

    if (tipo === 'mensagens') {
      const result = await query(
        `SELECT * FROM mensagens WHERE empresa_id = $1 ORDER BY criado_em DESC LIMIT 1000`,
        [empresaId]
      );
      dados = result.rows;
    } else if (tipo === 'conversas') {
      const result = await query(
        `SELECT * FROM conversas WHERE empresa_id = $1 ORDER BY criado_em DESC LIMIT 1000`,
        [empresaId]
      );
      dados = result.rows;
    }

    res.json({ dados, tipo, total: dados?.length || 0 });
  } catch (error) {
    logger.error('Erro ao exportar relatório:', error);
    res.status(500).json({ erro: 'Erro ao exportar relatório' });
  }
}

module.exports = {
  obterMetricas,
  obterGraficoMensagens,
  obterTopConversas,
  obterRelatorioInstancias,
  exportarRelatorio,
};
