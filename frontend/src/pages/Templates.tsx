import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Plus,
    Trash2,
    RefreshCw,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Smartphone,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

interface Template {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: any[];
}

interface Instance {
    instanceName: string;
    provider?: string;
    isConnected: boolean;
}

export default function Templates() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [selectedInstance, setSelectedInstance] = useState('');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [newTemplate, setNewTemplate] = useState({
        name: '',
        category: 'UTILITY',
        language: 'pt_BR',
        bodyText: '',
    });

    const loadInstances = useCallback(async () => {
        try {
            const { data } = await api.get('/instance/list');
            // Apenas instâncias oficiais
            const officialInstances = data.filter((inst: any) => inst.type === 'official' || inst.provider === 'official');
            setInstances(officialInstances);
            if (officialInstances.length > 0 && !selectedInstance) {
                setSelectedInstance(officialInstances[0].instanceName);
            }
        } catch (error) {
            toast.error('Erro ao carregar instâncias');
        }
    }, [selectedInstance]);

    const loadTemplates = useCallback(async () => {
        if (!selectedInstance) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/template/list?instanceName=${selectedInstance}`);
            setTemplates(data);
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao carregar templates');
        } finally {
            setLoading(false);
        }
    }, [selectedInstance]);

    useEffect(() => {
        loadInstances();
    }, [loadInstances]);

    useEffect(() => {
        if (selectedInstance) {
            loadTemplates();
        }
    }, [selectedInstance, loadTemplates]);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplate.name || !newTemplate.bodyText) {
            return toast.error('Preencha os campos obrigatórios');
        }

        try {
            await api.post('/template/create', {
                instanceName: selectedInstance,
                name: newTemplate.name.toLowerCase().replace(/\s+/g, '_'),
                category: newTemplate.category,
                language: newTemplate.language,
                components: [
                    {
                        type: 'BODY',
                        text: newTemplate.bodyText,
                    }
                ]
            });
            toast.success('Template criado! Aguarde a aprovação da Meta.');
            setShowCreateModal(false);
            setNewTemplate({ name: '', category: 'UTILITY', language: 'pt_BR', bodyText: '' });
            loadTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao criar template');
        }
    };

    const handleDeleteTemplate = async (name: string) => {
        if (!window.confirm(`Tem certeza que deseja deletar o template "${name}"?`)) return;

        try {
            await api.delete(`/template/delete?instanceName=${selectedInstance}&name=${name}`);
            toast.success('Template deletado!');
            loadTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.erro || 'Erro ao deletar');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'REJECTED': return <XCircle className="w-4 h-4 text-red-400" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-yellow-400" />;
            default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-purple-400" />
                        Templates Meta
                    </h1>
                    <p className="text-gray-400 mt-1">Gerencie seus modelos de mensagem oficiais da Cloud API</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <select
                            value={selectedInstance}
                            onChange={(e) => setSelectedInstance(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-900/50 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer min-w-[200px]"
                        >
                            {instances.length === 0 && <option value="">Nenhuma instância oficial</option>}
                            {instances.map(inst => (
                                <option key={inst.instanceName} value={inst.instanceName}>
                                    {inst.instanceName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        onClick={() => setShowCreateModal(true)}
                        disabled={!selectedInstance}
                        className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-neon-purple"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Template
                    </Button>
                </div>
            </div>

            {/* Stats/Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-purple-900/10 to-transparent border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Total de Templates</span>
                        <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{templates.length}</div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-green-900/10 to-transparent border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Aprovados</span>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {templates.filter(t => t.status === 'APPROVED').length}
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-yellow-900/10 to-transparent border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Em Análise</span>
                        <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {templates.filter(t => t.status === 'PENDING').length}
                    </div>
                </Card>
            </div>

            {/* Main Table/List */}
            <Card className="overflow-hidden bg-gray-900/30 border-white/5">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={loadTemplates}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-white"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs uppercase text-gray-400 bg-black/20">
                            <tr>
                                <th className="px-6 py-4">Template</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Idioma</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence>
                                {filteredTemplates.map((template) => (
                                    <motion.tr
                                        key={template.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{template.name}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs cursor-help" title={JSON.stringify(template.components)}>
                                                {template.components.find(c => c.type === 'BODY')?.text || 'Sem prévia'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 text-xs font-semibold">
                                                {template.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {template.language}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(template.status)}
                                                <span className="text-xs font-medium uppercase tracking-wider">
                                                    {template.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteTemplate(template.name)}
                                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {filteredTemplates.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                        Nenhum template encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Criar Template */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Criar Novo Template"
            >
                <form onSubmit={handleCreateTemplate} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nome do Template</label>
                        <input
                            type="text"
                            placeholder="ex: boas_vindas_usuario"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all"
                            required
                        />
                        <p className="text-[10px] text-gray-500 uppercase">Apenas letras minúsculas e sublinhados</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Categoria</label>
                            <select
                                value={newTemplate.category}
                                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all"
                            >
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utilidade</option>
                                <option value="AUTHENTICATION">Autenticação</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Idioma</label>
                            <select
                                value={newTemplate.language}
                                onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all"
                            >
                                <option value="pt_BR">Português (BR)</option>
                                <option value="en_US">Inglês (US)</option>
                                <option value="es_ES">Espanhol</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Conteúdo da Mensagem
                            <span className="text-xs text-purple-400">Use {"{{1}}"} para variáveis</span>
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Olá {{1}}, bem-vindo à {{2}}!"
                            value={newTemplate.bodyText}
                            onChange={(e) => setNewTemplate({ ...newTemplate, bodyText: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-all resize-none"
                            required
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="glass"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600"
                        >
                            Enviar para Aprovação
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
