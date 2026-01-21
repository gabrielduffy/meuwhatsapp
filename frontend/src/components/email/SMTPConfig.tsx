import { useState, useEffect } from 'react';
import {
    Plus,
    Loader2,
    Trash2,
    ShieldCheck,
    Server,
    Mail,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export default function SMTPConfig() {
    const [conexoes, setConexoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testando, setTestando] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        host: '',
        porta: 465,
        usuario: '',
        senha: '',
        secure: true,
        remetente_nome: '',
        remetente_email: ''
    });

    const carregarConexoes = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/email-marketing/conexoes');
            setConexoes(res.data);
        } catch (error) {
            toast.error('Erro ao carregar conexões SMTP');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarConexoes();
    }, []);

    const handleTestar = async () => {
        try {
            setTestando(true);
            await axios.post('/api/email-marketing/conexoes/testar', formData);
            toast.success('Conexão SMTP válida!');
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Falha na conexão SMTP');
        } finally {
            setTestando(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.post('/api/email-marketing/conexoes', formData);
            toast.success('Configuração SMTP salva!');
            setModalAberto(false);
            carregarConexoes();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao salvar configuração');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-400" />
                    Configurações de Servidor SMTP
                </h2>

                <button
                    onClick={() => setModalAberto(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar Servidor
                </button>
            </div>

            {loading && conexoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <p className="text-white/60">Carregando configurações...</p>
                </div>
            ) : conexoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <AlertCircle className="w-10 h-10 text-white/20 mb-4" />
                    <p className="text-white/60">Nenhum servidor SMTP configurado.</p>
                    <p className="text-white/40 text-sm">Adicione um servidor para começar a enviar emails.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conexoes.map((conn: any) => (
                        <div key={conn.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg">
                                    <Mail className="w-5 h-5 text-purple-400" />
                                </div>
                                <button className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-white font-medium mb-1">{conn.nome}</h3>
                            <p className="text-white/40 text-sm mb-4">{conn.host}:{conn.porta}</p>
                            <div className="flex items-center gap-2 text-xs text-green-400/80 bg-green-500/10 w-fit px-2 py-1 rounded-full border border-green-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                Ativo
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modalAberto && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-transparent">
                            <h3 className="text-lg font-semibold text-white">Configurar Servidor SMTP</h3>
                            <button onClick={() => setModalAberto(false)} className="text-white/40 hover:text-white">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-white/60 mb-1">Nome da Conexão</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        placeholder="Ex: Gmail Principal, SendGrid, etc"
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Host SMTP</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        placeholder="smtp.exemplo.com"
                                        value={formData.host}
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Porta</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        value={formData.porta}
                                        onChange={e => setFormData({ ...formData, porta: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Usuário</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        value={formData.usuario}
                                        onChange={e => setFormData({ ...formData, usuario: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Senha</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        value={formData.senha}
                                        onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-1">Nome do Remetente</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="Sua Empresa"
                                            value={formData.remetente_nome}
                                            onChange={e => setFormData({ ...formData, remetente_nome: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-1">Email do Remetente</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="contato@empresa.com"
                                            value={formData.remetente_email}
                                            onChange={e => setFormData({ ...formData, remetente_email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={handleTestar}
                                    disabled={testando}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    {testando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    Testar Conexão
                                </button>
                                <div className="flex gap-2">
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
                                        Salvar Configuração
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
