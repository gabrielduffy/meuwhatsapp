import {
    BarChart3,
    Users,
    MousePointer2,
    Mail,
    AlertCircle,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    PieChart as PieIcon,
    Globe
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const DATA = [
    { name: 'Seg', disparos: 4000, aberturas: 2400, cliques: 1200 },
    { name: 'Ter', disparos: 3000, aberturas: 1398, cliques: 800 },
    { name: 'Qua', disparos: 2000, aberturas: 9800, cliques: 2290 },
    { name: 'Qui', disparos: 2780, aberturas: 3908, cliques: 2000 },
    { name: 'Sex', disparos: 1890, aberturas: 4800, cliques: 1181 },
    { name: 'Sáb', disparos: 2390, aberturas: 3800, cliques: 1500 },
    { name: 'Dom', disparos: 3490, aberturas: 4300, cliques: 1100 },
];

const PIE_DATA = [
    { name: 'Gmail', value: 400, color: '#FF5722' },
    { name: 'Outlook', value: 300, color: '#03A9F4' },
    { name: 'Yahoo', value: 300, color: '#673AB7' },
    { name: 'Outros', value: 200, color: '#9E9E9E' },
];

export default function EmailDashboard() {
    return (
        <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Emails Enviados', value: '45,850', trend: '+12%', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Taxa de Abertura', value: '24.5%', trend: '+4%', icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { label: 'Taxa de Cliques', value: '8.2%', trend: '-1%', icon: MousePointer2, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                    { label: 'Conversão', value: '3.4%', trend: '+2%', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 bg-gray-900 rounded-3xl border border-white/5 shadow-xl hover:border-white/10 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-white/40 text-sm font-medium">{stat.label}</p>
                        <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 p-6 bg-gray-900 rounded-3xl border border-white/5 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white">Engajamento Semanal</h3>
                            <p className="text-xs text-white/40">Desempenho de todas as campanhas e fluxos.</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 bg-white/5 text-white/60 rounded-lg text-xs hover:text-white transition-all">7 Dias</button>
                            <button className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs">30 Dias</button>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={DATA}>
                                <defs>
                                    <linearGradient id="colorAbr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCli" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="aberturas" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorAbr)" />
                                <Area type="monotone" dataKey="cliques" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorCli)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Deliverability / Mail Providers */}
                <div className="p-6 bg-gray-900 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-1">Entregabilidade</h3>
                    <p className="text-xs text-white/40 mb-8">Principais provedores de destino.</p>

                    <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={PIE_DATA}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {PIE_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <p className="text-2xl font-black text-white">98%</p>
                            <p className="text-[10px] text-green-400 font-bold">INBOX</p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {PIE_DATA.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-white/60 font-medium">{item.name}</span>
                                </div>
                                <span className="text-white font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Heatmap Concept / Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-900 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-cyan-400" />
                        Origem Geográfica
                    </h3>
                    <div className="space-y-4">
                        {[
                            { country: 'Brasil', percentage: '82%', users: '12,450' },
                            { country: 'Portugal', percentage: '12%', users: '1,820' },
                            { country: 'Estados Unidos', percentage: '4%', users: '610' },
                            { country: 'Outros', percentage: '2%', users: '300' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-white/60">{item.country}</span>
                                    <span className="text-white">{item.percentage}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-400" style={{ width: item.percentage }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-gray-900 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        Atividade em Tempo Real
                    </h3>
                    <div className="space-y-4">
                        {[
                            { event: 'Email aberto', user: 'joao@email.com', time: '2 min atrás', icon: Mail },
                            { event: 'Clique registrado', user: 'ana.silva@gmail.com', time: '5 min atrás', icon: MousePointer2 },
                            { event: 'Novo lead capturado', user: 'contato@instadeal.pt', time: '12 min atrás', icon: Users },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/5 rounded-lg">
                                        <item.icon className="w-4 h-4 text-white/40" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">{item.event}</p>
                                        <p className="text-[10px] text-white/30">{item.user}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-white/20 font-bold">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
