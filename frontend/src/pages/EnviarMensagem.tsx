import { useState, useEffect } from 'react';
import { Send, Smartphone, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface Instance {
    instanceName: string;
    isConnected: boolean;
    user?: {
        id: string;
        name: string;
    };
}

export default function EnviarMensagem() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [formData, setFormData] = useState({
        instanceName: '',
        to: '',
        text: ''
    });

    useEffect(() => {
        loadInstances();
    }, []);

    const loadInstances = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/instance/list');
            // Convert object to array if needed (backend returns object with keys as instance names)
            const instanceList = Object.entries(data).map(([name, info]: [string, any]) => ({
                instanceName: name,
                ...info
            }));
            setInstances(instanceList.filter(i => i.isConnected));

            // Auto-select first connected instance
            const connected = instanceList.find(i => i.isConnected);
            if (connected) {
                setFormData(prev => ({ ...prev, instanceName: connected.instanceName }));
            }
        } catch (error) {
            console.error('Erro ao carregar instâncias:', error);
            toast.error('Erro ao listar instâncias disponíveis');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.instanceName) {
            toast.error('Selecione uma instância conectada');
            return;
        }

        // Basic phone validation (removes non-digits)
        const cleanPhone = formData.to.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            toast.error('Número de telefone inválido');
            return;
        }

        // Add 55 if missing (assuming BR for now, logic can be improved)
        const finalPhone = cleanPhone.startsWith('55') || cleanPhone.length > 11
            ? cleanPhone
            : `55${cleanPhone}`;

        try {
            setSending(true);
            await api.post('/message/send-text', {
                instanceName: formData.instanceName,
                to: finalPhone,
                text: formData.text
            });

            toast.success('Mensagem enviada com sucesso!');
            setFormData(prev => ({ ...prev, text: '' })); // Clear text but keep instance/number
        } catch (error: any) {
            console.error('Erro ao enviar:', error);
            toast.error(error.response?.data?.error || 'Falha ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Enviar Mensagem</h1>
                <p className="text-white/60">Dispare mensagens de texto para testar suas instâncias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Instance Selector */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Instância Conectada
                                </label>
                                {loading ? (
                                    <div className="w-full h-12 bg-white/5 animate-pulse rounded-lg" />
                                ) : (
                                    <div className="relative">
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                        <select
                                            value={formData.instanceName}
                                            onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                            disabled={instances.length === 0}
                                        >
                                            <option value="">Selecione uma instância...</option>
                                            {instances.map(inst => (
                                                <option key={inst.instanceName} value={inst.instanceName}>
                                                    {inst.instanceName} ({inst.user?.name || 'Conectado'})
                                                </option>
                                            ))}
                                        </select>
                                        {instances.length === 0 && !loading && (
                                            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Nenhuma instância conectada encontrada. Vá em "Instâncias" para conectar.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Phone Input */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Número do Destinatário
                                </label>
                                <input
                                    type="text"
                                    value={formData.to}
                                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                                    placeholder="ex: 11999999999"
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                    required
                                />
                                <p className="text-xs text-white/40 mt-1">
                                    Digite com DDD (ex: 11999999999). O código do país (55) será adicionado automaticamente se omitido.
                                </p>
                            </div>

                            {/* Message Input */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Mensagem
                                </label>
                                <textarea
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    placeholder="Digite sua mensagem aqui..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={sending || !formData.instanceName || !formData.to || !formData.text}
                                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${sending
                                        ? 'bg-purple-600/50 cursor-not-allowed text-white/50'
                                        : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 hover:shadow-purple-500/25 text-white'
                                    }`}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Enviar Mensagem
                                    </>
                                )}
                            </button>

                        </form>
                    </div>
                </div>

                {/* Info/Help Section */}
                <div className="space-y-6">
                    <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400" />
                            Dicas de Envio
                        </h3>
                        <ul className="space-y-3 text-sm text-white/70">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                                Certifique-se que o número existe e tem WhatsApp ativo.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                                Para números internacionais, inclua o código do país completo.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                                Evite spam massivo para não ter o número banido.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
