import React, { useState, useEffect } from 'react';
import {
    Plus,
    Layout,
    Loader2,
    Trash2,
    Edit3,
    Eye,
    Mail,
    AlertCircle,
    FileCode
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        assunto: '',
        corpo_html: '',
        corpo_texto: ''
    });

    const carregarTemplates = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/email-marketing/templates');
            setTemplates(res.data);
        } catch (error) {
            toast.error('Erro ao carregar templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarTemplates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.post('/api/email-marketing/templates', formData);
            toast.success('Template criado com sucesso!');
            setModalAberto(false);
            carregarTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao criar template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-cyan-400" />
                    Templates de Email
                </h2>

                <button
                    onClick={() => setModalAberto(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    Novo Template
                </button>
            </div>

            {loading && templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                    <p className="text-white/60">Carregando templates...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <FileCode className="w-10 h-10 text-white/20 mb-4" />
                    <p className="text-white/60">Nenhum template encontrado.</p>
                    <p className="text-white/40 text-sm">Crie templates reutilizáveis para suas campanhas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((tpl: any) => (
                        <div key={tpl.id} className="bg-gray-900 rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all group relative">
                            <div className="aspect-video bg-white/5 flex items-center justify-center border-b border-white/10">
                                <Mail className="w-12 h-12 text-white/10" />
                            </div>
                            <div className="p-4">
                                <h3 className="text-white font-medium mb-1 truncate">{tpl.nome}</h3>
                                <p className="text-white/40 text-sm truncate">{tpl.assunto}</p>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                    <button className="p-2 text-white/40 hover:text-white transition-colors" title="Visualizar">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-white/40 hover:text-cyan-400 transition-colors" title="Editar">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1" />
                                    <button className="p-2 text-white/40 hover:text-red-400 transition-colors" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal CRUD Templates */}
            {modalAberto && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-cyan-600/10 to-transparent">
                            <h3 className="text-lg font-semibold text-white">Criar Novo Template</h3>
                            <button onClick={() => setModalAberto(false)} className="text-white/40 hover:text-white">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Nome Interno</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Ex: Boas-vindas, Recuperação de Carrinho"
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-1">Assunto do Email</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Olá {{nome}}, seja bem-vindo!"
                                        value={formData.assunto}
                                        onChange={e => setFormData({ ...formData, assunto: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-white/60 mb-1">Conteúdo HTML</label>
                                    <textarea
                                        required
                                        rows={12}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                                        placeholder="<html>..."
                                        value={formData.corpo_html}
                                        onChange={e => setFormData({ ...formData, corpo_html: e.target.value })}
                                    />
                                    <p className="text-xs text-white/30 mt-1">Use {"{{nome}}"} para personalizar com o nome do cliente.</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
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
                                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Salvar Template
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
