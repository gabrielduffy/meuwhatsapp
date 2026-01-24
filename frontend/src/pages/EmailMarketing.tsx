import { useState } from 'react';
import {
    Mail,
    Zap,
    Layout,
    Settings,
    Plus,
    BarChart3,
    Send,
    History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes do módulo (serão criados ou já existem)
// import EmailCampaignList from '../components/email/EmailCampaignList';
import EmailAutomationList from '../components/email/EmailAutomationList';
import EmailTemplateList from '../components/email/EmailTemplateList';
import SMTPConfig from '../components/email/SMTPConfig';

export default function EmailMarketing() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'automations' | 'templates' | 'smtp'>('campaigns');

    const TABS = [
        { id: 'campaigns', label: 'Campanhas', icon: Mail, color: 'text-blue-400' },
        { id: 'automations', label: 'Automações', icon: Zap, color: 'text-purple-400' },
        { id: 'templates', label: 'Templates', icon: Layout, color: 'text-green-400' },
        { id: 'smtp', label: 'SMTP / Envio', icon: Settings, color: 'text-amber-400' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Email Marketing</h1>
                    <p className="text-white/40 mt-1">Gerencie suas campanhas e automações de e-mail com rastreamento em tempo real.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                        <BarChart3 className="w-4 h-4" />
                        <span>Métricas</span>
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20">
                        <Plus className="w-4 h-4" />
                        <span>Nova Campanha</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative ${isActive ? 'text-white' : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/10 rounded-xl"
                                />
                            )}
                            <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[600px] rounded-3xl bg-gray-900/50 border border-white/5 p-8 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'campaigns' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatCard label="Emails Enviados" value="12,450" change="+12%" icon={Send} />
                                    <StatCard label="Taxa de Abertura" value="24.8%" change="+5%" icon={Mail} />
                                    <StatCard label="Cliques Únicos" value="1.2k" change="+8%" icon={Zap} />
                                </div>

                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white">Campanhas Recentes</h3>
                                        <button className="text-sm text-purple-400 font-bold hover:underline">Ver todas</button>
                                    </div>
                                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                        {/* Tabela de Campanhas - Placeholder */}
                                        <div className="p-12 text-center">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <History className="w-10 h-10 text-white/20" />
                                            </div>
                                            <h4 className="text-white font-bold">Nenhuma campanha enviada hoje</h4>
                                            <p className="text-white/40 text-sm mt-2">Suas campanhas recentes aparecerão aqui.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'automations' && <EmailAutomationList />}

                        {/* Implementar SMTP e Templates posteriormente */}
                        {activeTab === 'templates' && <EmailTemplateList />}
                        {activeTab === 'smtp' && <SMTPConfig />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function StatCard({ label, value, change, icon: Icon }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-md">{change}</span>
            </div>
            <h4 className="text-white/40 text-xs font-black uppercase tracking-widest">{label}</h4>
            <p className="text-2xl font-black text-white mt-1">{value}</p>
        </div>
    );
}

function AutomationCard({ name, trigger, status, stats }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 hover:border-purple-500/50 transition-all group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold group-hover:text-purple-400 transition-all">{name}</h4>
                        <p className="text-[10px] text-white/20 uppercase font-black">{trigger}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase">{status}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div>
                    <p className="text-[9px] text-white/20 uppercase font-black">Disparos</p>
                    <p className="text-lg font-black text-white">{stats.sent}</p>
                </div>
                <div>
                    <p className="text-[9px] text-white/20 uppercase font-black">Abertura</p>
                    <p className="text-lg font-black text-white">{stats.open}</p>
                </div>
            </div>

            <button className="w-full py-2.5 rounded-xl bg-white/5 text-white/40 text-xs font-bold hover:bg-white/10 hover:text-white transition-all">
                Abrir WorkFlow
            </button>
        </div>
    );
}
