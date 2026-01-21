import React, { useState, useEffect } from 'react';
import {
    Plus,
    Send,
    Loader2,
    Trash2,
    Play,
    Pause,
    History,
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function CampaignManager() {
    const [campanhas, setCampanhas] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [conexoes, setConexoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        template_id: '',
        conexao_smtp_id: '',
        assunto: '',
        agendamento: ''
    });

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [campRes, tempRes, connRes] = await Promise.all([
                axios.get('/api/email-marketing/campanhas'),
                axios.get('/api/email-marketing/templates'),
                axios.get('/api/email-marketing/conexoes')
            ]);
            setCampanhas(campRes.data);
            setTemplates(tempRes.data);
            setConexoes(connRes.data);
        } catch (error) {
            toast.error('Erro ao carregar dados das campanhas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.template_id || !formData.conexao_smtp_id) {
            return toast.error('Selecione um template e um servidor SMTP');
        }

        try {
            setLoading(true);
            await axios.post('/api/email-marketing/campanhas', formData);
            toast.success('Campanha criada com sucesso!');
            setModalAberto(false);
            carregarDados();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao criar campanha');
        } finally {
            setLoading(false);
        }
    };

    const dispararCampanha = async (id: string) => {
        try {
            toast.loading('Iniciando disparo...', { id: 'disparo' });
            await axios.post(`/api/email-marketing/campanhas/${id}/disparar`);
            toast.success('Disparo em andamento!', { id: 'disparo' });
            carregarDados();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao disparar', { id: 'disparo' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-purple-400" />
                    Campanhas de Email
                </h2>

                <button
                    onClick={() => setModalAberto(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    Nova Campanha
                </button>
            </div>

            {loading && campanhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <p className="text-white/60">Carregando campanhas...</p>
                </div>
            ) : campanhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <History className="w-10 h-10 text-white/20 mb-4" />
                    <p className="text-white/60">Nenhuma campanha criada.</p>
                    <p className="text-white/40 text-sm">Crie sua primeira campanha para alcançar seus leads.</p>
                </div>
            ) : (
                <div className="overflow-hidden bg-white/5 rounded-2xl border border-white/10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase">Nome / Assunto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase">Template</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {campanhas.map((camp: any) => (
                                <tr key={camp.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{camp.nome}</span>
                                            <span className="text-white/40 text-xs">{camp.assunto}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-lg border border-cyan-500/20">
                                            {templates.find(t => t.id === camp.template_id)?.nome || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs ${camp.status === 'enviado' ? 'text-green-400' :
                                                camp.status === 'em_andamento' ? 'text-yellow-400' : 'text-white/40'
                                            }`}>
                                            {camp.status === 'enviado' ? <CheckCircle2 className="w-3 h-3" /> :
                                                camp.status === 'em_andamento' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                                    <Clock className="w-3 h-3" />}
                                            {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => dispararCampanha(camp.id)}
                                                disabled={camp.status === 'em_andamento'}
                                                className="p-2 text-white/40 hover:text-green-400 transition-colors disabled:opacity-30" title="Disparar agora">
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Criar Campanha */}
            {modalAberto && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-transparent">
                            <h3 className="text-lg font-semibold text-white">Nova Campanha de Email</h3>
                            <button onClick={() => setModalAberto(false)} className="text-white/40 hover:text-white">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1">Nome da Campanha</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Ex: Oferta de Natal 2024"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1">Servidor SMTP</label>
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={formData.conexao_smtp_id}
                                    onChange={e => setFormData({ ...formData, conexao_smtp_id: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900">Selecione um servidor...</option>
                                    {conexoes.map(conn => (
                                        <option key={conn.id} value={conn.id} className="bg-gray-900">{conn.nome} ({conn.remetente_email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1">Template</label>
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={formData.template_id}
                                    onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900">Selecione um template...</option>
                                    {templates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id} className="bg-gray-900">{tpl.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1">Assunto Personalizado (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    placeholder="Se vazio, usará o assunto do template"
                                    value={formData.assunto}
                                    onChange={e => setFormData({ ...formData, assunto: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalAberto(false)}
                                    className="px-6 py-2 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Criar Campanha
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
