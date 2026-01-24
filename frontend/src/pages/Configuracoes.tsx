import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Lock,
  Database,
  Palette,
  Globe,
  Shield,
  Zap,
  Loader2,
  Copy,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Card, Button, Input, Badge, Tabs, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('notificacoes');
  const [loading, setLoading] = useState(false);
  const [apiToken, setApiToken] = useState('');

  // Modais de Confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  const [notificacoes, setNotificacoes] = useState({ email: true, push: false, sms: false });
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmacao: '' });

  const loadApiToken = useCallback(async () => {
    try {
      const { data } = await api.get('/api/usuarios/me/token');
      setApiToken(data.token);
    } catch (error) {
      console.error('Erro ao carregar token:', error);
    }
  }, []);

  useEffect(() => {
    loadApiToken();
  }, [loadApiToken]);

  const confirmAction = (config: any) => {
    setConfirmConfig(config);
    setShowConfirmModal(true);
  };

  const handleRegenerateToken = () => {
    confirmAction({
      title: 'Regenerar Token API',
      message: 'O token antigo parará de funcionar imediatamente em todos os seus sistemas externos. Deseja continuar?',
      danger: true,
      onConfirm: async () => {
        try {
          const { data } = await api.post('/api/usuarios/me/token');
          setApiToken(data.token);
          toast.success('Novo token gerado!');
        } catch (error) {
          toast.error('Erro ao gerar token');
        }
      }
    });
  };

  const handleResetData = () => {
    confirmAction({
      title: 'Resetar Todos os Dados',
      message: 'Esta ação apagará permanentemente todos os seus contatos, mensagens e configurações. NÃO HÁ VOLTA!',
      danger: true,
      onConfirm: async () => {
        toast.error('Funcionalidade bloqueada por segurança');
      }
    });
  };

  const handleSaveSecurity = async () => {
    if (!senhas.atual || !senhas.nova) return toast.error('Preencha as senhas');
    if (senhas.nova !== senhas.confirmacao) return toast.error('Senhas não coincidem');

    setLoading(true);
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
      setLoading(false);
    }
  };

  const tabsList = [
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Lock },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'sistema', label: 'Sistema', icon: Database },
    { id: 'perigo', label: 'Perigo', icon: Shield },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-white/60 mt-1">Gerencie as preferências da sua conta e plataforma</p>
      </div>

      <div className="mb-8">
        <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} className="bg-white/5 p-1" />
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'notificacoes' && (
            <motion.div key="notificacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card variant="glass" className="p-6 max-w-3xl">
                <h3 className="text-xl font-bold text-white mb-6">Preferências de Notificação</h3>
                <div className="space-y-4">
                  {['Email', 'Push (Navegador)', 'SMS'].map((tipo) => (
                    <div key={tipo} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-white font-medium">{tipo}</span>
                      <div className="w-12 h-6 bg-purple-600/20 rounded-full relative cursor-pointer border border-purple-500/30">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-purple-400 rounded-full" />
                      </div>
                    </div>
                  ))}
                  <Button variant="neon" className="w-full mt-6" onClick={() => toast.success('Preferências salvas!')}>Salvar Notificações</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'seguranca' && (
            <motion.div key="seguranca" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="glass" className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Alterar Senha</h3>
                <div className="space-y-4">
                  <Input label="Senha Atual" type="password" value={senhas.atual} onChange={e => setSenhas({ ...senhas, atual: e.target.value })} />
                  <Input label="Nova Senha" type="password" value={senhas.nova} onChange={e => setSenhas({ ...senhas, nova: e.target.value })} />
                  <Input label="Confirmar Nova Senha" type="password" value={senhas.confirmacao} onChange={e => setSenhas({ ...senhas, confirmacao: e.target.value })} />
                  <Button variant="neon" className="w-full mt-4" loading={loading} onClick={handleSaveSecurity}>Atualizar Senha</Button>
                </div>
              </Card>

              <Card variant="glass" className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Acesso à API</h3>
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-4">
                  <p className="text-xs text-purple-300 font-bold uppercase mb-2">Seu Token de API</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 p-3 rounded font-mono text-sm text-purple-400 break-all border border-white/10 italic">
                      {apiToken || '••••••••••••••••'}
                    </div>
                    <Button variant="glass" size="sm" onClick={() => { navigator.clipboard.writeText(apiToken); toast.success('Copiado!'); }}><Copy size={16} /></Button>
                  </div>
                </div>
                <Button variant="glass" className="w-full border-purple-500/20 text-purple-400" onClick={handleRegenerateToken} icon={<RefreshCw size={16} />}>Regenerar Token</Button>
              </Card>
            </motion.div>
          )}

          {activeTab === 'perigo' && (
            <motion.div key="perigo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card variant="glass" className="p-6 border-red-500/30 max-w-3xl">
                <div className="flex items-center gap-3 text-red-500 mb-6 font-bold text-xl">
                  <AlertTriangle />
                  Zona Crítica
                </div>
                <div className="space-y-4">
                  <Card className="bg-red-500/5 border-red-500/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">Resetar Dados</p>
                      <p className="text-xs text-white/50">Apaga contatos, mensagens e fluxos.</p>
                    </div>
                    <Button variant="danger" size="sm" onClick={handleResetData}>Executar</Button>
                  </Card>
                  <Card className="bg-red-950/20 border-red-500/30 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-bold">Excluir Empresa</p>
                      <p className="text-xs text-red-400/50">Cancela sua assinatura e remove tudo permanentemente.</p>
                    </div>
                    <Button variant="danger" size="sm">EXCLUIR</Button>
                  </Card>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'sistema' && (
            <motion.div key="sistema" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card variant="glass" className="p-6 max-w-3xl text-center py-16">
                <Database size={48} className="mx-auto text-purple-500 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Recurso em Sincronização</h3>
                <p className="text-white/40">As configurações de sistema estão sendo migradas para o novo painel.</p>
              </Card>
            </motion.div>
          )}

          {activeTab === 'aparencia' && (
            <motion.div key="aparencia" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card variant="glass" className="p-6 max-w-3xl text-center py-16">
                <Palette size={48} className="mx-auto text-cyan-500 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Modo Dark Default</h3>
                <p className="text-white/40">O sistema está travado em Dark Mode Luxury. Personalizações de cores estão no menu Whitelabel.</p>
                <Button variant="glass" className="mt-6" onClick={() => setActiveTab('notificacoes')}>Voltar</Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={confirmConfig?.title}>
        <div className="py-4">
          <p className="text-white/80">{confirmConfig?.message}</p>
          <div className="flex gap-2 mt-8">
            <Button variant="glass" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
            <Button variant={confirmConfig?.danger ? 'danger' : 'neon'} className="flex-1" onClick={() => { confirmConfig?.onConfirm(); setShowConfirmModal(false); }}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
