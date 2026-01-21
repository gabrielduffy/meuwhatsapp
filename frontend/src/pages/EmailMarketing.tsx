import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Settings,
    Layout,
    BarChart3,
    Send
} from 'lucide-react';

// Componentes internos (sub-páginas)
import SMTPConfig from '../components/email/SMTPConfig';
import TemplateManager from '../components/email/TemplateManager';
import CampaignManager from '../components/email/CampaignManager';
import EmailDashboard from '../components/email/EmailDashboard';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campanhas', label: 'Campanhas', icon: Send },
    { id: 'templates', label: 'Templates', icon: Layout },
    { id: 'smtp', label: 'Configurações SMTP', icon: Settings },
];

export default function EmailMarketing() {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Email Marketing
                    </h1>
                    <p className="text-white/60">
                        Gerencie suas campanhas de email, templates e automações.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setActiveTab('campanhas')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Campanha
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 gap-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 w-fit">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30 text-white border border-purple-400/30 shadow-neon-purple'
                                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-300' : 'text-white/40'}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="mt-6 min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'dashboard' && <EmailDashboard />}
                        {activeTab === 'campanhas' && <CampaignManager />}
                        {activeTab === 'templates' && <TemplateManager />}
                        {activeTab === 'smtp' && <SMTPConfig />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
