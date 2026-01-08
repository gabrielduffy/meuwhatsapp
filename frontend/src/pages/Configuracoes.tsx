import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Lock,
  Database,
  Palette,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import api from '../services/api';



export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('notificacoes');
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: false,
    sms: false,
  });

  const [senhas, setSenhas] = useState({
    atual: '',
    nova: '',
    confirmacao: ''
  });
  const [loadingSenha, setLoadingSenha] = useState(false);

  const [apiToken, setApiToken] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);

  useEffect(() => {
    loadApiToken();
  }, []);

  const loadApiToken = async () => {
    try {
      const response = await api.get('/api/usuarios/me/token');
      setApiToken(response.data.token);
    } catch (error) {
      console.error('Erro ao carregar token:', error);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Tem certeza? O token antigo parará de funcionar imediatamente.')) return;

    setLoadingToken(true);
    try {
      const response = await api.post('/api/usuarios/me/token');
      setApiToken(response.data.token);
      toast.success('Token regenerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao regenerar token');
    } finally {
      setLoadingToken(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    toast.success('Token copiado!');
  };

  const handleSaveNotifications = () => {
    toast.success('Configurações de notificações salvas!');
  };

  const handleSaveSecurity = async () => {
    if (!senhas.atual || !senhas.nova) {
      toast.error('Preencha os campos de senha');
      return;
    }

    if (senhas.nova !== senhas.confirmacao) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoadingSenha(true);
    try {
      await api.post('/api/autenticacao/alterar-senha', {
        senhaAtual: senhas.atual,
        novaSenha: senhas.nova
      });
      toast.success('Senha alterada com sucesso!');
      setSenhas({ atual: '', nova: '', confirmacao: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao alterar senha');
    } finally {
      setLoadingSenha(false);
    }
  };

  const tabs = [
    { id: 'notificacoes', label: 'Notificações', icon: Bell, color: 'from-purple-600/30 to-cyan-600/30', textColor: 'text-purple-300' },
    { id: 'seguranca', label: 'Segurança', icon: Lock, color: 'from-red-600/30 to-orange-600/30', textColor: 'text-red-300' },
    { id: 'aparencia', label: 'Aparência', icon: Palette, color: 'from-cyan-600/30 to-blue-600/30', textColor: 'text-cyan-300' },
    { id: 'sistema', label: 'Sistema', icon: Database, color: 'from-green-600/30 to-emerald-600/30', textColor: 'text-green-300' },
    { id: 'perigo', label: 'Perigo', icon: Shield, color: 'from-gray-600/30 to-red-600/30', textColor: 'text-red-400' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-white/60 mt-1">
          Gerencie as configurações da plataforma
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
              ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-white border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.textColor : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-[400px]"
      >
        {activeTab === 'notificacoes' && (
          <Card variant="gradient">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-cyan-600/30">
                <Bell className="w-6 h-6 text-purple-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Notificações</h2>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">Email</p>
                  <p className="text-sm text-white/60">Receber notificações por email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.email}
                    onChange={(e) => setNotificacoes({ ...notificacoes, email: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">Push</p>
                  <p className="text-sm text-white/60">Notificações push no navegador</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.push}
                    onChange={(e) => setNotificacoes({ ...notificacoes, push: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">SMS</p>
                  <p className="text-sm text-white/60">Alertas via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.sms}
                    onChange={(e) => setNotificacoes({ ...notificacoes, sms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <Button variant="neon" onClick={handleSaveNotifications} className="w-full md:w-auto mt-4 px-8">
                Salvar Notificações
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'seguranca' && (
          <Card variant="gradient">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-600/30 to-orange-600/30">
                <Lock className="w-6 h-6 text-red-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Segurança da Conta</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-white font-medium mb-2">Alterar Senha</h3>
                <Input
                  label="Senha Atual"
                  type="password"
                  value={senhas.atual}
                  onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
                  placeholder="Digite sua senha atual"
                />
                <Input
                  label="Nova Senha"
                  type="password"
                  value={senhas.nova}
                  onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                  placeholder="Digite a nova senha"
                />
                <Input
                  label="Confirmar Senha"
                  type="password"
                  value={senhas.confirmacao}
                  onChange={(e) => setSenhas({ ...senhas, confirmacao: e.target.value })}
                  placeholder="Confirme a nova senha"
                />
                <Button
                  variant="danger"
                  onClick={handleSaveSecurity}
                  className="w-full mt-4"
                  loading={loadingSenha}
                >
                  Alterar Senha
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-medium mb-2">Proteção Adicional</h3>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-300">Autenticação de 2 Fatores</p>
                      <p className="text-xs text-yellow-400/70 mt-1">
                        Adicione uma camada extra de segurança à sua conta exigindo um código do seu celular.
                      </p>
                      <Badge variant="warning" className="mt-2">Em breve</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      Meu Token de API
                    </p>
                    <button
                      onClick={handleRegenerateToken}
                      disabled={loadingToken}
                      className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold tracking-wider"
                    >
                      Regenerar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 rounded-lg px-3 py-2 font-mono text-xs text-purple-300 break-all border border-white/5">
                      {apiToken || 'Carregando...'}
                    </div>
                    <Button variant="glass" size="sm" onClick={handleCopyToken}>
                      Copiar
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2">
                    Use este token para autenticar suas requisições via <code className="text-purple-400">X-API-Key</code>.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white font-medium">Sessões Ativas</p>
                  <p className="text-xs text-white/50 mt-1">Você está conectado em 2 dispositivos.</p>
                  <button className="text-xs text-red-400 hover:text-red-300 mt-2 font-medium">
                    Encerrar todas as outras sessões
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'aparencia' && (
          <Card variant="gradient">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30">
                <Palette className="w-6 h-6 text-cyan-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Personalização</h2>
            </div>

            <div className="space-y-8 max-w-2xl">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="font-medium text-white mb-4">Tema do Sistema</p>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white font-medium flex flex-col items-center gap-2 border border-white/20">
                    <div className="w-full h-12 bg-gray-900 rounded border border-white/10"></div>
                    Escuro (Default)
                  </button>
                  <button className="p-4 bg-white/10 rounded-xl text-white/60 font-medium flex flex-col items-center gap-2 hover:bg-white/20 transition-all">
                    <div className="w-full h-12 bg-white rounded border border-gray-200"></div>
                    Claro
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="font-medium text-white mb-4">Esquema de Cores</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { name: 'Purple', color: 'bg-purple-600', active: true },
                    { name: 'Cyan', color: 'bg-cyan-600', active: false },
                    { name: 'Blue', color: 'bg-blue-600', active: false },
                    { name: 'Green', color: 'bg-green-600', active: false },
                    { name: 'Red', color: 'bg-red-600', active: false },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className={`w-12 h-12 rounded-full ${c.color} cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${c.active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1014]' : ''}`}
                    >
                      {c.active && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'sistema' && (
          <Card variant="gradient">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/30 to-emerald-600/30">
                <Database className="w-6 h-6 text-green-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Informações do Sistema</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-white">Status Geral</p>
                  <Badge variant="success">Versão 2.1.0 (Stable)</Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Servidor API</span>
                    <span className="text-green-400 font-medium">Online (99.9% uptime)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Banco de Dados</span>
                    <span className="text-green-400 font-medium">Conectado</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Servidor de Mídia</span>
                    <span className="text-green-400 font-medium">Conectado</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs text-white/40">Última atualização: 27/12/2025 às 14:30</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button variant="glass" className="w-full justify-start gap-3" icon={<Globe className="w-4 h-4" />}>
                  Ver Logs de Acesso
                </Button>
                <Button variant="glass" className="w-full justify-start gap-3" icon={<Zap className="w-4 h-4" />}>
                  Limpar Cache Local
                </Button>
                <Button variant="glass" className="w-full justify-start gap-3" icon={<Globe className="w-4 h-4" />}>
                  Documentação API
                </Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'perigo' && (
          <Card variant="glass" className="border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-white text-red-400">Zona de Perigo</h2>
            </div>

            <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20 mb-8">
              <p className="text-white/70 text-sm leading-relaxed">
                As ações abaixo são <strong className="text-red-400">destrutivas</strong> e não podem ser desfeitas.
                Tenha certeza do que está fazendo antes de prosseguir.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-white/5 rounded-lg">
                <div>
                  <p className="font-semibold text-white">Resetar conta e dados</p>
                  <p className="text-sm text-white/50">Todos os contatos, conversas e configurações serão removidos.</p>
                </div>
                <Button variant="danger" size="sm" className="whitespace-nowrap">
                  Resetar Dados
                </Button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-white/5 rounded-lg">
                <div>
                  <p className="font-semibold text-white">Encerrar Instâncias</p>
                  <p className="text-sm text-white/50">Força o logout de todos os números conectados simultaneamente.</p>
                </div>
                <Button variant="danger" size="sm" className="whitespace-nowrap">
                  Encerrar Tudo
                </Button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-red-500/20 bg-red-950/20 rounded-lg">
                <div>
                  <p className="font-semibold text-red-300">Excluir Minha Empresa</p>
                  <p className="text-sm text-red-400/60">Remove permanentemente sua empresa da plataforma.</p>
                </div>
                <Button variant="danger" size="sm" className="whitespace-nowrap font-bold">
                  EXCLUIR EMPRESA
                </Button>
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
