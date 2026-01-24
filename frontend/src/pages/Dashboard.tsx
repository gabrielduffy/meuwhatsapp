import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  MessageCircle,
  Users,
  DollarSign,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import { Link } from 'react-router-dom';

// ==================== INTERFACES ====================

interface DashboardKPIs {
  instanciasConectadas: number;
  mensagensHoje: number;
  contatosAtivos: number;
  creditosRestantes: number;
}

interface MensagemGrafico {
  data: string;
  enviadas: number;
  recebidas: number;
}

interface InstanciaStatus {
  id?: number;
  instance_name: string;
  phone_number?: string;
  status: 'connected' | 'disconnected' | 'qr' | 'connecting';
}

interface AtividadeRecente {
  id?: number;
  descricao: string;
  criado_em: string | Date;
}

// ==================== ANIMAÇÕES ====================

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

// ==================== COMPONENTE KPI CARD ====================

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

function KPICard({ title, value, icon, gradient, iconBg }: KPICardProps) {
  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`
        relative overflow-hidden
        rounded-2xl p-6
        bg-gradient-to-br ${gradient}
        border border-white/10
        shadow-xl
        transition-all duration-300
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <div className={`p-3 ${iconBg} rounded-full`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function Dashboard() {
  // ==================== STATES ====================

  const [kpis, setKpis] = useState<DashboardKPIs>({
    instanciasConectadas: 0,
    mensagensHoje: 0,
    contatosAtivos: 0,
    creditosRestantes: 0,
  });

  const [mensagensGrafico, setMensagensGrafico] = useState<MensagemGrafico[]>([]);
  const [instancias, setInstancias] = useState<InstanciaStatus[]>([]);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);

  // ==================== USEEFFECT ====================

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ==================== FUNÇÕES ====================

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        loadMensagensGrafico(),
        loadInstancias(),
        loadAtividades(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKPIs = async () => {
    try {
      // Tentar carregar da API
      const { data } = await api.get('/api/dashboard/kpis');
      setKpis(data);
    } catch (error) {
      console.log('API não disponível, usando mock data para KPIs');
      // Mock data como fallback
      setKpis({
        instanciasConectadas: 2,
        mensagensHoje: 145,
        contatosAtivos: 38,
        creditosRestantes: 8500,
      });
    }
  };

  const loadMensagensGrafico = async () => {
    try {
      // Tentar carregar da API
      const { data } = await api.get('/api/dashboard/mensagens-grafico');
      setMensagensGrafico(data);
    } catch (error) {
      console.log('API não disponível, usando mock data para gráfico');
      // Mock data como fallback
      setMensagensGrafico([
        { data: 'Seg', enviadas: 45, recebidas: 38 },
        { data: 'Ter', enviadas: 52, recebidas: 43 },
        { data: 'Qua', enviadas: 48, recebidas: 41 },
        { data: 'Qui', enviadas: 61, recebidas: 55 },
        { data: 'Sex', enviadas: 58, recebidas: 49 },
        { data: 'Sáb', enviadas: 42, recebidas: 35 },
        { data: 'Dom', enviadas: 39, recebidas: 32 },
      ]);
    }
  };

  const loadInstancias = async () => {
    try {
      // Tentar carregar da API
      const { data } = await api.get('/instance/list');
      setInstancias(data.slice(0, 3)); // Mostrar apenas 3 primeiras
    } catch (error) {
      console.log('API não disponível, usando mock data para instâncias');
      // Mock data como fallback
      setInstancias([
        { instance_name: 'Comercial', phone_number: '(11) 99999-9999', status: 'connected' },
        { instance_name: 'Suporte', phone_number: '(11) 98888-8888', status: 'connected' },
      ]);
    }
  };

  const loadAtividades = async () => {
    try {
      // Tentar carregar da API
      const { data } = await api.get('/api/dashboard/atividades');
      setAtividades(data);
    } catch (error) {
      console.log('API não disponível, usando mock data para atividades');
      // Mock data como fallback
      setAtividades([
        { descricao: 'Nova mensagem recebida de João Silva', criado_em: new Date(Date.now() - 5 * 60000) },
        { descricao: 'Negociação movida para "Proposta" no CRM', criado_em: new Date(Date.now() - 15 * 60000) },
        { descricao: 'Follow-up enviado automaticamente', criado_em: new Date(Date.now() - 30 * 60000) },
        { descricao: 'Novo contato adicionado: Maria Santos', criado_em: new Date(Date.now() - 45 * 60000) },
      ]);
    }
  };

  const formatTime = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Agora mesmo';
    if (diff < 3600000) return `Há ${Math.floor(diff / 60000)} minutos`;
    if (diff < 86400000) return `Há ${Math.floor(diff / 3600000)} horas`;
    if (diff < 604800000) return `Há ${Math.floor(diff / 86400000)} dias`;
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Conectado</span>;
      case 'connecting':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Conectando</span>;
      case 'qr':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Aguardando QR</span>;
      default:
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Desconectado</span>;
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white/60">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* ==================== HEADER ==================== */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Bem-vindo de volta! Aqui está um resumo da sua conta.</p>
      </motion.div>

      {/* ==================== KPIs ==================== */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
      >
        <KPICard
          title="Instâncias Conectadas"
          value={kpis.instanciasConectadas}
          icon={<CheckCircle className="w-8 h-8 text-green-600" />}
          gradient="from-green-600/20 to-green-900/20"
          iconBg="bg-green-100 dark:bg-green-900"
        />

        <KPICard
          title="Mensagens Hoje"
          value={kpis.mensagensHoje.toLocaleString('pt-BR')}
          icon={<MessageCircle className="w-8 h-8 text-blue-600" />}
          gradient="from-blue-600/20 to-blue-900/20"
          iconBg="bg-blue-100 dark:bg-blue-900"
        />

        <KPICard
          title="Contatos Ativos"
          value={kpis.contatosAtivos.toLocaleString('pt-BR')}
          icon={<Users className="w-8 h-8 text-purple-600" />}
          gradient="from-purple-600/20 to-purple-900/20"
          iconBg="bg-purple-100 dark:bg-purple-900"
        />

        <KPICard
          title="Créditos Restantes"
          value={kpis.creditosRestantes.toLocaleString('pt-BR')}
          icon={<DollarSign className="w-8 h-8 text-yellow-600" />}
          gradient="from-yellow-600/20 to-yellow-900/20"
          iconBg="bg-yellow-100 dark:bg-yellow-900"
        />
      </motion.div>

      {/* ==================== CHARTS ROW ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Mensagens */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Mensagens (Últimos 7 dias)</h3>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mensagensGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="data" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="enviadas"
                stroke="#5B21B6"
                strokeWidth={3}
                dot={{ fill: '#5B21B6', r: 4 }}
                name="Enviadas"
              />
              <Line
                type="monotone"
                dataKey="recebidas"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 4 }}
                name="Recebidas"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status das Instâncias */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Status das Instâncias</h3>
            <Link
              to="/instancias"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Ver todas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {instancias.length > 0 ? (
              instancias.map((inst, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{inst.instance_name}</p>
                      <p className="text-xs text-white/60">{inst.phone_number || 'Não conectado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inst.status === 'connected' ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    {getStatusBadge(inst.status)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-center py-8">Nenhuma instância cadastrada</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ==================== ATIVIDADES RECENTES ==================== */}
      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Atividades Recentes</h3>
        </div>

        <div className="space-y-4">
          {atividades.length > 0 ? (
            atividades.map((ativ, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{ativ.descricao}</p>
                  <p className="text-xs text-white/60 mt-1">{formatTime(ativ.criado_em)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/60 text-center py-8">Nenhuma atividade recente</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
