import { useState, useEffect } from 'react';
import {
    Settings,
    Shield,
    Mail,
    Lock,
    Server,
    ArrowRight,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SmtpConfig() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState<string | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/email-marketing/smtp');
            setConfigs(response.data);
        } catch (error) {
            toast.error('Erro ao carregar configurações SMTP');
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async (id: string) => {
        try {
            setTesting(id);
            await axios.post(`/api/email-marketing/smtp/${id}/test`);
            toast.success('Conexão SMTP funcionando perfeitamente!');
        } catch (error) {
            toast.error('Falha na conexão SMTP. Verifique as credenciais.');
        } finally {
            setTesting(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Segurança e Entrega</h3>
                    <p className="text-white/40 text-sm mt-1">
                        Configure seus servidores SMTP para garantir que seus e-mails cheguem na caixa de entrada.
                        Recomendamos o uso de serviços como Amazon SES, SendGrid ou Mailgun.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {configs.length === 0 && !loading ? (
                    <div className="border-2 border-dashed border-white/5 rounded-3xl p-12 text-center">
                        <Server className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <h4 className="text-white font-bold">Nenhuma conexão configurada</h4>
                        <p className="text-white/40 text-sm mt-2 mb-6">Adicione seu servidor de envio para disparar campanhas.</p>
                        <button className="px-8 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10">
                            Configurar Novo Servidor
                        </button>
                    </div>
                ) : (
                    configs.map(config => (
                        <div key={config.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between hover:border-purple-500/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.ativo ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/20'}`}>
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-white font-bold">{config.nome}</h4>
                                        {config.ativo && <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase">Ativo</span>}
                                    </div>
                                    <p className="text-xs text-white/30">{config.host}:{config.porta} • {config.usuario}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleTest(config.id)}
                                    disabled={testing === config.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {testing === config.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    Testar Conexão
                                </button>
                                <button className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}

                <div className="bg-gray-900 border border-white/5 rounded-3xl p-8 space-y-6 shadow-inner">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        Novo Servidor SMTP
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Nome da Conexão" placeholder="Ex: Amazon SES Principal" />
                        <InputField label="Host SMTP" placeholder="smtp.provider.com" />
                        <InputField label="Porta" placeholder="587" />
                        <InputField label="Usuário" placeholder="Seu usuário/key" />
                        <div className="md:col-span-2">
                            <InputField label="Senha / API Key" type="password" placeholder="••••••••••••" />
                        </div>
                        <InputField label="Remetente (E-mail)" placeholder="contato@suaempresa.com" />
                        <InputField label="Nome do Remetente" placeholder="Marketing" />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-purple-600 text-white font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20">
                            Salvar Configurações
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, type = "text" }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-purple-500/50 outline-none transition-all placeholder:text-white/10"
            />
        </div>
    );
}
