import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Send,
    Eye,
    MousePointer2,
    AlertTriangle,
    Mail,
    TrendingUp,
    Inbox,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function EmailDashboard() {
    const [stats, setStats] = useState({
        enviados: 0,
        abertos: 0,
        clicados: 0,
        erros: 0,
        totalCampanhas: 0
    });

    // Dados Mockados para o Dashboard Inicial
    useEffect(() => {
        // Aqui buscaríamos do backend: /api/email-marketing/stats
        setStats({
            enviados: 1250,
            abertos: 450,
            clicados: 120,
            erros: 15,
            totalCampanhas: 8
        });
    }, []);

    const cards = [
        { label: 'E-mails Enviados', value: stats.enviados, icon: Send, color: 'purple', trend: '+12.5%' },
        { label: 'Taxa de Abertura', value: ((stats.abertos / stats.enviados) * 100).toFixed(1) + '%', icon: Eye, color: 'cyan', trend: '+5.2%' },
        { label: 'Taxa de Cliques', value: ((stats.clicados / stats.enviados) * 100).toFixed(1) + '%', icon: MousePointer2, color: 'blue', trend: '+2.1%' },
        { label: 'Erros de Entrega', value: stats.erros, icon: AlertTriangle, color: 'red', trend: '-0.5%' },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 bg-${card.color}-500/10 rounded-xl border border-${card.color}-500/20`}>
                                    <Icon className={`w-6 h-6 text-${card.color}-400`} />
                                </div>
                                {card.trend && (
                                    <span className={`flex items-center gap-1 text-xs font-medium ${card.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                        {card.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {card.trend}
                                    </span>
                                )}
                            </div>
                            <p className="text-white/40 text-sm font-medium">{card.label}</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{card.value}</h3>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico Simulado / Placeholder */}
                <div className="lg:col-span-2 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                            Desempenho Semanal
                        </h3>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-white/40">
                                <div className="w-2 h-2 rounded-full bg-purple-500" /> Enviados
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-white/40">
                                <div className="w-2 h-2 rounded-full bg-cyan-500" /> Abertos
                            </span>
                        </div>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-4 pb-4">
                        {[45, 60, 40, 75, 50, 90, 65].map((h, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-purple-500/20 group-hover:bg-purple-500/40 transition-all rounded-t-lg"
                                    style={{ height: `${h}%` }}
                                />
                                <div
                                    className="absolute bottom-0 w-full bg-cyan-500/40 rounded-t-lg"
                                    style={{ height: `${h * 0.4}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 px-4 text-xs text-white/20">
                        <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                    </div>
                </div>

                {/* Últimas Campanhas */}
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-cyan-400" />
                        Atividade Recente
                    </h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Newsletter Semanal', status: 'Enviando...', time: 'Há 5 min', color: 'yellow' },
                            { label: 'Boas-vindas Premium', status: 'Concluído', time: 'Há 2 horas', color: 'green' },
                            { label: 'Re-engajamento VIP', status: 'Agendado', time: 'Amanhã 09:00', color: 'purple' },
                        ].map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                <div className={`p-2 bg-${activity.color}-500/10 rounded-lg`}>
                                    <Mail className={`w-4 h-4 text-${activity.color}-400`} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-white text-sm font-medium truncate">{activity.label}</p>
                                    <p className="text-white/40 text-xs">{activity.status}</p>
                                </div>
                                <span className="text-[10px] text-white/20 whitespace-nowrap">{activity.time}</span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-all border border-white/10">
                        Ver todas as atividades
                    </button>
                </div>
            </div>
        </div>
    );
}
