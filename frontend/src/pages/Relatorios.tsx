import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  TrendingUp,
  MessageSquare,
  Users,
  CheckCircle,
  Calendar,
  ArrowUp,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import api from '../services/api';

interface Metricas {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  mensagens: {
    enviadas: number;
    recebidas: number;
    entregues: number;
    lidas: number;
  };
  conversas: {
    total: number;
    abertas: number;
    resolvidas: number;
  };
  contatos: {
    novos: number;
  };
  taxas: {
    entrega: number;
    leitura: number;
    resposta: number;
  };
}

interface DadosGrafico {
  data: string;
  enviadas: number;
  recebidas: number;
}

interface TopConversa {
  id: string;
  nome_contato: string;
  telefone_contato: string;
  total_mensagens: number;
  ultima_mensagem: string;
}

interface InstanciasStats {
  total: number;
  conectadas: number;
  desconectadas: number;
  com_erro: number;
}

export default function Relatorios() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [dadosGrafico, setDadosGrafico] = useState<DadosGrafico[]>([]);
  const [topConversas, setTopConversas] = useState<TopConversa[]>([]);
  const [instancias, setInstancias] = useState<InstanciasStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30); // dias
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    carregarDados();
  }, [periodo, dataInicio, dataFim]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const params: any = {};
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;

      // Carregar métricas gerais
      const metricasRes = await api.get('/api/relatorios/metricas', { params });
      setMetricas(metricasRes.data);

      // Carregar dados do gráfico
      const graficoRes = await api.get('/api/relatorios/grafico-mensagens', {
        params: { dias: periodo },
      });
      setDadosGrafico(graficoRes.data.grafico);

      // Carregar top conversas
      const conversasRes = await api.get('/api/relatorios/top-conversas', {
        params: { limite: 10 },
      });
      setTopConversas(conversasRes.data.conversas);

      // Carregar estatísticas de instâncias
      const instanciasRes = await api.get('/api/relatorios/instancias');
      setInstancias(instanciasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = async (tipo: 'mensagens' | 'conversas') => {
    try {
      const res = await api.get('/api/relatorios/exportar', {
        params: { tipo, formato: 'json' },
      });

      const dataStr = JSON.stringify(res.data.dados, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatarDataCompleta = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Relatórios & Analytics</h1>
            <p className="text-sm text-white/60">Visualize o desempenho do seu negócio</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => exportarRelatorio('mensagens')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Mensagens</span>
            <span className="sm:hidden">Mensagens</span>
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => exportarRelatorio('conversas')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Conversas</span>
            <span className="sm:hidden">Conversas</span>
          </Button>
        </div>
      </motion.div>

      {/* Filtros de Período */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Período:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[7, 15, 30, 60, 90].map((dias) => (
                <button
                  key={dias}
                  onClick={() => {
                    setPeriodo(dias);
                    setDataInicio('');
                    setDataFim('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    periodo === dias && !dataInicio
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {dias} dias
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-auto">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-white/40 hidden sm:inline">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* KPI Cards */}
      {metricas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mensagens Enviadas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                  <Badge variant="purple" size="sm">
                    <TrendingUp className="w-3 h-3" />
                  </Badge>
                </div>
                <p className="text-sm text-white/60 mb-1">Mensagens Enviadas</p>
                <p className="text-3xl font-bold text-white mb-2">
                  {metricas.mensagens.enviadas.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    {metricas.taxas.entrega}% entregues
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Mensagens Recebidas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <MessageSquare className="w-8 h-8 text-cyan-400 transform scale-x-[-1]" />
                  <Badge variant="cyan" size="sm">
                    <Activity className="w-3 h-3" />
                  </Badge>
                </div>
                <p className="text-sm text-white/60 mb-1">Mensagens Recebidas</p>
                <p className="text-3xl font-bold text-white mb-2">
                  {metricas.mensagens.recebidas.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-cyan-400 flex items-center gap-1">
                    {metricas.taxas.resposta}% taxa de resposta
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Conversas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <Badge variant="success" size="sm">
                    {metricas.conversas.abertas}
                  </Badge>
                </div>
                <p className="text-sm text-white/60 mb-1">Conversas</p>
                <p className="text-3xl font-bold text-white mb-2">
                  {metricas.conversas.total.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">{metricas.conversas.resolvidas} resolvidas</span>
                  <span className="text-white/40">•</span>
                  <span className="text-yellow-400">{metricas.conversas.abertas} abertas</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Contatos Novos */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="relative overflow-hidden group hover:scale-105 transition-transform">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-bl-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-8 h-8 text-yellow-400" />
                  <Badge variant="warning" size="sm">
                    Novos
                  </Badge>
                </div>
                <p className="text-sm text-white/60 mb-1">Novos Contatos</p>
                <p className="text-3xl font-bold text-white mb-2">
                  {metricas.contatos.novos.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-400 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    Período selecionado
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Gráfico de Mensagens */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Mensagens ao longo do tempo</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm text-white/60">Enviadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded-full" />
                <span className="text-sm text-white/60">Recebidas</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="data"
                  stroke="rgba(255,255,255,0.5)"
                  tickFormatter={formatarData}
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  labelFormatter={formatarData}
                />
                <Line
                  type="monotone"
                  dataKey="enviadas"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: '#a855f7', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="recebidas"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Conversas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">Top Conversas</h2>
            <div className="space-y-3">
              {topConversas.length > 0 ? (
                topConversas.map((conversa, index) => (
                  <div
                    key={conversa.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {conversa.nome_contato || 'Sem nome'}
                        </p>
                        <p className="text-sm text-white/60 truncate">{conversa.telefone_contato}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right ml-4">
                      <Badge variant="purple" size="sm">
                        {conversa.total_mensagens} msgs
                      </Badge>
                      <p className="text-xs text-white/40 mt-1">
                        {formatarDataCompleta(conversa.ultima_mensagem)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/40">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Status das Instâncias */}
        {instancias && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Status das Instâncias</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Total de Instâncias</p>
                      <p className="text-2xl font-bold text-white">{instancias.total}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-xs text-white/60">Conectadas</p>
                    </div>
                    <p className="text-xl font-bold text-green-400">{instancias.conectadas}</p>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <p className="text-xs text-white/60">Desconectadas</p>
                    </div>
                    <p className="text-xl font-bold text-yellow-400">{instancias.desconectadas}</p>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <p className="text-xs text-white/60">Com Erro</p>
                    </div>
                    <p className="text-xl font-bold text-red-400">{instancias.com_erro}</p>
                  </div>
                </div>

                {/* Gráfico de Pizza usando BarChart horizontal */}
                <div className="h-[200px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { name: 'Conectadas', value: instancias.conectadas, fill: '#22c55e' },
                        { name: 'Desconectadas', value: instancias.desconectadas, fill: '#eab308' },
                        { name: 'Com Erro', value: instancias.com_erro, fill: '#ef4444' },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: 'white',
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Taxas de Performance */}
      {metricas && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">Taxas de Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Taxa de Entrega */}
              <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white/60">Taxa de Entrega</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">{metricas.taxas.entrega}%</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metricas.taxas.entrega}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {metricas.mensagens.entregues} de {metricas.mensagens.enviadas} mensagens
                </p>
              </div>

              {/* Taxa de Leitura */}
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white/60">Taxa de Leitura</p>
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-blue-400 mb-2">{metricas.taxas.leitura}%</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metricas.taxas.leitura}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {metricas.mensagens.lidas} de {metricas.mensagens.enviadas} mensagens
                </p>
              </div>

              {/* Taxa de Resposta */}
              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white/60">Taxa de Resposta</p>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-purple-400 mb-2">{metricas.taxas.resposta}%</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metricas.taxas.resposta}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {metricas.mensagens.recebidas} respostas de {metricas.mensagens.enviadas} enviadas
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
