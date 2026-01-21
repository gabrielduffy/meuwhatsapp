import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    Layout,
    BarChart3,
    Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Componentes internos (Vistas de Lista)
import EmailDashboard from '../components/email/EmailDashboard';
import TemplateManager from '../components/email/TemplateManager';
import SMTPConfig from '../components/email/SMTPConfig';
import AutomationManager from '../components/email/automation/AutomationManager';

// Builders (Vistas de Tela Cheia)
import EmailBuilder from '../components/email/builder/EmailBuilder';
import AutomationFlow from '../components/email/automation/AutomationFlow';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-blue-400' },
    { id: 'automacoes', label: 'Automações', icon: Zap, color: 'text-purple-400' },
    { id: 'templates', label: 'Templates', icon: Layout, color: 'text-cyan-400' },
    { id: 'smtp', label: 'Conexão SMTP', icon: Settings, color: 'text-gray-400' },
];

export default function EmailMarketing() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [editingFlow, setEditingFlow] = useState<any>(null);
    const [isBuildingEmail, setIsBuildingEmail] = useState(false);
    const [isBuildingFlow, setIsBuildingFlow] = useState(false);

    // --- HANDLERS TEMPLATES ---
    const handleEditTemplate = (template: any) => {
        setEditingTemplate(template);
        setIsBuildingEmail(true);
    };

    const saveTemplate = async (blocks: any) => {
        try {
            const payload = {
                nome: editingTemplate?.nome || 'Novo Template Visual',
                assunto: editingTemplate?.assunto || 'Sem Assunto',
                corpoHtml: '<!-- Gerado pelo Builder -->',
                corpoTexto: 'Texto alternativo...',
                dadosJson: blocks
            };

            if (editingTemplate?.id) {
                await axios.put(`/api/email-marketing/templates/${editingTemplate.id}`, payload);
            } else {
                await axios.post('/api/email-marketing/templates', payload);
            }

            toast.success('Template salvo com sucesso!');
            setIsBuildingEmail(false);
            setEditingTemplate(null);
        } catch (error) {
            toast.error('Erro ao salvar template');
        }
    };

    // --- HANDLERS AUTOMAÇÕES ---
    const handleEditFlow = (flow: any) => {
        setEditingFlow(flow);
        setIsBuildingFlow(true);
    };

    const saveFlow = async (flowData: any) => {
        try {
            const payload = {
                nome: editingFlow?.nome || 'Nova Automação Inteligente',
                gatilho: { tipo: 'manual' },
                acoes: [],
                fluxoJson: flowData
            };

            if (editingFlow?.id) {
                await axios.put(`/api/email-marketing/automacoes/${editingFlow.id}`, payload);
            } else {
                await axios.post('/api/email-marketing/automacoes', payload);
            }

            toast.success('Fluxo de automação salvo!');
            setIsBuildingFlow(false);
            setEditingFlow(null);
        } catch (error) {
            toast.error('Erro ao salvar fluxo');
        }
    };

    // Se estiver no builder, renderiza tela cheia
    if (isBuildingEmail) {
        return <EmailBuilder onSave={saveTemplate} initialData={editingTemplate?.dados_json} />;
    }

    if (isBuildingFlow) {
        return <AutomationFlow onSave={saveFlow} initialData={editingFlow?.fluxo_json} />;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight leading-none h-[1.2em] flex items-center">
                        Email Marketing
                    </h1>
                    <p className="text-white/40 mt-1 font-medium">
                        Plataforma de automação e designer visual de alta conversão.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-white/40 uppercase font-bold">Créditos</p>
                            <p className="text-white font-bold">Ilimitado</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-right">
                            <p className="text-[10px] text-white/40 uppercase font-bold">Status</p>
                            <p className="text-green-400 font-bold flex items-center gap-1 justify-end">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Ativo
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex p-1.5 gap-1.5 bg-gray-900 border border-white/10 rounded-2xl w-fit">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl scale-105'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="min-h-[600px] relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    >
                        {activeTab === 'dashboard' && <EmailDashboard />}
                        {activeTab === 'automacoes' && <AutomationManager onEdit={handleEditFlow} />}
                        {activeTab === 'templates' && <TemplateManager onEdit={handleEditTemplate} />}
                        {activeTab === 'smtp' && <SMTPConfig />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
