import { useState, useEffect } from 'react';
import {
    Plus,
    Layout,
    Loader2,
    Trash2,
    Edit3,
    Eye,
    Mail,
    AlertCircle,
    FileCode,
    Smartphone,
    Monitor
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function TemplateManager({ onEdit }: { onEdit: (template: any) => void }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const handleExcluir = async (id: string) => {
        if (!window.confirm('Excluir este template permanentemente?')) return;
        try {
            await axios.delete(`/api/email-marketing/templates/${id}`);
            toast.success('Template excluído!');
            carregarTemplates();
        } catch (err) { }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-cyan-400" />
                    Biblioteca de Templates
                </h2>

                <button
                    onClick={() => onEdit(null)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Criar Template Visual
                </button>
            </div>

            {loading && templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                    <p className="text-white/60">Abrindo sua biblioteca...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                    <div className="p-4 rounded-full bg-cyan-500/10 mb-4">
                        <FileCode className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-white font-medium">Sua biblioteca está vazia</p>
                    <p className="text-white/40 text-sm max-w-xs mx-auto mt-2">
                        Crie designs profissionais e responsivos usando nosso construtor arraste-e-solte.
                    </p>
                    <button
                        onClick={() => onEdit(null)}
                        className="mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all text-sm border border-white/10"
                    >
                        Novo Design
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.map((tpl: any) => (
                        <motion.div
                            key={tpl.id}
                            layout
                            className="bg-gray-900 rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all group relative flex flex-col"
                        >
                            {/* Thumbnail Placeholder com Ícones de Preview */}
                            <div className="aspect-[4/5] bg-gray-950 flex items-center justify-center border-b border-white/10 relative overflow-hidden group">
                                <Mail className="w-16 h-16 text-white/5 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-60" />

                                {/* Overlay de Ações Rápidas */}
                                <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                    <button
                                        onClick={() => onEdit(tpl)}
                                        className="p-3 bg-white text-gray-900 rounded-full hover:scale-110 transition-all"
                                    >
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                    <button className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="absolute top-3 right-3 flex gap-2">
                                    <div className="p-1.5 bg-black/40 backdrop-blur-md rounded border border-white/10 text-white/40">
                                        <Monitor className="w-3 h-3" />
                                    </div>
                                    <div className="p-1.5 bg-black/40 backdrop-blur-md rounded border border-white/10 text-white/40">
                                        <Smartphone className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="text-white font-bold truncate mb-1">{tpl.nome}</h3>
                                <p className="text-white/40 text-xs truncate mb-4">{tpl.assunto}</p>

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
                                        Visual Builder
                                    </span>
                                    <button
                                        onClick={() => handleExcluir(tpl.id)}
                                        className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                                    >
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
