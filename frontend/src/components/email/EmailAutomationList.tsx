import { useState, useEffect } from 'react';
import {
    Plus,
    Edit2,
    Zap,
    Search,
    Play,
    Pause,
    Trash2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AutomationFlow from './automation/AutomationFlow';

export default function EmailAutomationList() {
    const [automations, setAutomations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showFlow, setShowFlow] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState<any>(null);

    useEffect(() => {
        fetchAutomations();
    }, []);

    const fetchAutomations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/email-marketing/automations');
            setAutomations(response.data);
        } catch (error) {
            toast.error('Erro ao carregar automações');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingAutomation(null);
        setShowFlow(true);
    };

    const handleEdit = (auto: any) => {
        setEditingAutomation(auto);
        setShowFlow(true);
    };

    const handleSaveFlow = async (flowData: any) => {
        try {
            const payload = {
                nome: editingAutomation?.nome || `Automação ${new Date().toLocaleDateString()}`,
                gatilho: flowData.nodes.find((n: any) => n.type === 'trigger')?.data || {},
                fluxo_json: flowData,
                ativa: true
            };

            if (editingAutomation) {
                await axios.put(`/api/email-marketing/automations/${editingAutomation.id}`, payload);
                toast.success('Automação atualizada!');
            } else {
                await axios.post('/api/email-marketing/automations', payload);
                toast.success('Automação criada!');
            }

            setShowFlow(false);
            fetchAutomations();
        } catch (error) {
            toast.error('Erro ao salvar automação');
        }
    };

    const toggleStatus = async (auto: any) => {
        try {
            await axios.patch(`/api/email-marketing/automations/${auto.id}`, { ativa: !auto.ativa });
            toast.success(`Automação ${auto.ativa ? 'pausada' : 'ativada'}!`);
            fetchAutomations();
        } catch (error) {
            toast.error('Erro ao alterar status');
        }
    };

    const filtered = automations.filter(a => a.nome.toLowerCase().includes(search.toLowerCase()));

    if (showFlow) {
        return <AutomationFlow onSave={handleSaveFlow} initialData={editingAutomation?.fluxo_json || null} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                        type="text"
                        placeholder="Pesquisar automações..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-purple-500 transition-all outline-none"
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nova Automação</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-white font-bold text-xl">Nenhuma automação ativa</h3>
                    <p className="text-white/40 mt-2">Crie fluxos de mensagens automáticas para seus leads.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((auto) => (
                        <div key={auto.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-purple-500/30 transition-all flex flex-col gap-4 group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${auto.ativa ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-white/20'}`}>
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold group-hover:text-purple-400 transition-all">{auto.nome}</h4>
                                        <p className="text-[10px] text-white/20 uppercase font-black truncate max-w-[150px]">
                                            {auto.gatilho?.tipo === 'new_lead' ? 'Novo Lead' : 'Evento Customizado'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleStatus(auto)}
                                    className={`p-2 rounded-xl transition-all ${auto.ativa ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                                >
                                    {auto.ativa ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                <div>
                                    <p className="text-[9px] text-white/20 uppercase font-black">Progresso</p>
                                    <p className="text-lg font-black text-white">{auto.estatisticas?.iniciados || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/20 uppercase font-black">Sucesso</p>
                                    <p className="text-lg font-black text-white">{auto.estatisticas?.concluidos || 0}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(auto)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Edit2 className="w-3 h-3" /> Editar Flow
                                </button>
                                <button className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
