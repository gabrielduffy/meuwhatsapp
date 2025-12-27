import { motion } from 'framer-motion';
import {
  MessageCircle,
  Users,
  Building2,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Clock,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data
const messageData = [
  { name: 'Seg', enviadas: 120, recebidas: 80 },
  { name: 'Ter', enviadas: 150, recebidas: 100 },
  { name: 'Qua', enviadas: 180, recebidas: 120 },
  { name: 'Qui', enviadas: 200, recebidas: 140 },
  { name: 'Sex', enviadas: 170, recebidas: 110 },
  { name: 'Sáb', enviadas: 90, recebidas: 60 },
  { name: 'Dom', enviadas: 70, recebidas: 50 },
];

const instanceData = [
  { name: 'Ativas', value: 45 },
  { name: 'Inativas', value: 12 },
  { name: 'Conectando', value: 3 },
];

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

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  gradient: string;
}

function StatCard({ title, value, change, icon, gradient }: StatCardProps) {
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
        hover:shadow-neon-purple
        transition-all duration-300
      `}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            {icon}
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            change.startsWith('+') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {change}
          </span>
        </div>

        <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
        <p className="text-sm text-white/60">{title}</p>
      </div>

      {/* Neon border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl border-2 border-purple-500 blur-sm" />
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-white/60">Bem-vindo ao WhatsBenemax Admin</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Mensagens Enviadas"
            value="12.5K"
            change="+23.5%"
            gradient="from-purple-600/20 to-purple-900/20"
            icon={<MessageCircle className="w-6 h-6 text-purple-300" />}
          />
          <StatCard
            title="Usuários Ativos"
            value="847"
            change="+12.3%"
            gradient="from-cyan-600/20 to-cyan-900/20"
            icon={<Users className="w-6 h-6 text-cyan-300" />}
          />
          <StatCard
            title="Empresas"
            value="156"
            change="+8.1%"
            gradient="from-blue-600/20 to-blue-900/20"
            icon={<Building2 className="w-6 h-6 text-blue-300" />}
          />
          <StatCard
            title="Taxa de Resposta"
            value="94.2%"
            change="+5.7%"
            gradient="from-green-600/20 to-green-900/20"
            icon={<TrendingUp className="w-6 h-6 text-green-300" />}
          />
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Messages Chart */}
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="
              glass rounded-2xl p-6
              border border-white/10
              shadow-xl hover:shadow-neon-cyan
              transition-all duration-300
            "
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Mensagens (7 dias)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={messageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="enviadas"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: '#a855f7', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="recebidas"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Instances Chart */}
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            className="
              glass rounded-2xl p-6
              border border-white/10
              shadow-xl hover:shadow-neon-purple
              transition-all duration-300
            "
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Status Instâncias
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={instanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: Target, title: 'Nova Campanha', desc: 'Criar campanha de prospecção', color: 'purple' },
            { icon: MessageCircle, title: 'Enviar Mensagem', desc: 'Broadcast para contatos', color: 'cyan' },
            { icon: Clock, title: 'Agendar Envio', desc: 'Agendar mensagem futura', color: 'blue' },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              variants={item}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={`
                glass rounded-2xl p-6
                border border-white/10
                text-left
                shadow-xl hover:shadow-neon-${action.color}
                transition-all duration-300
                group
              `}
            >
              <div className={`
                p-3 rounded-xl w-fit mb-4
                bg-${action.color}-500/20
                group-hover:bg-${action.color}-500/30
                transition-colors duration-300
              `}>
                <action.icon className={`w-6 h-6 text-${action.color}-400`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{action.title}</h3>
              <p className="text-sm text-white/60">{action.desc}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
