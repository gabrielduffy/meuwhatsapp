import { useState, useEffect } from 'react';
import {
    Plus,
    Zap,
    Loader2,
    Trash2,
    Play,
    History,
    GitBranch,
    PlayCircle,
    PauseCircle,
    MoreVertical,
    Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutomationManager({ onEdit }: { onEdit: (flow: any) => void }) {
    const [automacoes, setAutomacoes] = useState([]);
    const [loading, setLoading] = useState(true);

    const carregarAutomacoes = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/email-marketing/automacoes');
            setAutomacoes(res.data);
        } catch (error) {
            toast.error('Erro ao carregar automações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarAutomacoes();
    }, []);

    const toggleStatus = async (id: string, atual: boolean) => {
        try {
            // logic to toggle active status
            toast.success(`Automação ${atual ? 'pausada' : 'ativada'}!`);
            carregarAutomacoes();
        } catch (err) { }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Fluxos de Automação
                </h2>

                <button
                    onClick={() => onEdit(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Fluxo
                </button>
            </div>

            {loading && automacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <p className="text-white/60">Carregando automações...</p>
                </div>
            ) : automacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                    <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                        <GitBranch className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-white font-medium">Nenhum fluxo de automação</p>
                    <p className="text-white/40 text-sm max-w-xs mx-auto mt-2">
                        Crie jornadas inteligentes para seus leads com gatilhos, condições e atrasos.
                    </p>
                    <button
                        onClick={() => onEdit(null)}
                        className="mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all text-sm border border-white/10"
                    >
                        Começar do Zero
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {automacoes.map((flow: any) => (
                        <motion.div
                            key={flow.id}
                            layout
                            className="bg-gray-900 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all group"
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${flow.ativa ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => toggleStatus(flow.id, flow.ativa)}
                                            className={`p-1.5 rounded-lg transition-all ${flow.ativa ? 'text-green-400 hover:bg-green-400/10' : 'text-white/40 hover:bg-white/10'}`}
                                        >
                                            {flow.ativa ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                                        </button>
                                        <button className="p-1.5 text-white/20 hover:text-white transition-all"><MoreVertical className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                <h3 className="text-white font-bold text-lg mb-1">{flow.nome}</h3>
                                <p className="text-white/40 text-xs mb-4 flex items-center gap-1">
                                    <History className="w-3 h-3" />
                                    Atualizado em: {new Date(flow.updated_at || flow.criado_em).toLocaleDateString()}
                                </p>

                                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-4">
                                    <div className="text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-bold">Iniciados</p>
                                        <p className="text-white font-bold">{flow.estatisticas?.iniciados || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-bold">Concluídos</p>
                                        <p className="text-white font-bold text-green-400">{flow.estatisticas?.concluidos || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-bold">Conversão</p>
                                        <p className="text-white font-bold text-cyan-400">0%</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEdit(flow)}
                                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
                                    >
                                        Editar Fluxo
                                    </button>
                                    <button className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/10">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
