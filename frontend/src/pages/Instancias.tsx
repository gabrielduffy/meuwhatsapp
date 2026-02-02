import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  Trash2,
  RefreshCw,
  Settings,
  Power,
  X,
  Loader2,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  User,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

interface Instance {
  id?: string;
  instanceName: string;
  isConnected: boolean;
  user?: {
    id: string;
    name: string;
  };
  status?: string;
  phone_number?: string;
  qrCodeBase64?: string;
  pairingCode?: string;
}

export default function Instancias() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('geral');

  const [createForm, setCreateForm] = useState({
    instanceName: '',
    provider: 'baileys',
    accessToken: '',
    phoneNumberId: '',
    wabaId: '',
    verifyToken: ''
  });
  const [configForm, setConfigForm] = useState({
    rejectCalls: false,
    profileName: '',
    profileStatus: '',
    webhookUrl: '',
  });

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const CONFIG_TABS = [
    { id: 'geral', label: 'Geral', icon: Settings },
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'webhook', label: 'Webhook', icon: Globe },
  ];

  const loadInstances = useCallback(async () => {
    try {
      const { data } = await api.get('/instance/list');
      setInstances(data);
    } catch (error) {
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
    const interval = setInterval(loadInstances, 10000);
    return () => clearInterval(interval);
  }, [loadInstances]);

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.instanceName.trim()) return toast.error('Nome obrigatório');

    if (createForm.provider === 'official') {
      if (!createForm.accessToken || !createForm.phoneNumberId) {
        return toast.error('Token e ID do Telefone são obrigatórios para Oficial');
      }
    }

    try {
      await api.post('/instance/create', {
        instanceName: createForm.instanceName.trim(),
        provider: createForm.provider,
        accessToken: createForm.accessToken,
        phoneNumberId: createForm.phoneNumberId,
        wabaId: createForm.wabaId,
        verifyToken: createForm.verifyToken
      });
      toast.success('Instância criada!');
      setShowCreateModal(false);
      setCreateForm({
        instanceName: '',
        provider: 'baileys',
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        verifyToken: ''
      });
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar');
    }
  };

  const fetchQRCode = useCallback(async (instanceName: string) => {
    try {
      const { data } = await api.get(`/instance/${instanceName}/qrcode`);
      if (data.status === 'connected') {
        toast.success('Conectado!');
        setShowQRModal(false);
        loadInstances();
        return;
      }
      setQrCodeData(data);
    } catch (error) {
      console.error('Erro QR:', error);
    }
  }, [loadInstances]);

  useEffect(() => {
    let interval: any;
    if (showQRModal && selectedInstance) {
      fetchQRCode(selectedInstance.instanceName);
      interval = setInterval(() => fetchQRCode(selectedInstance.instanceName), 5000);
    }
    return () => clearInterval(interval);
  }, [showQRModal, selectedInstance, fetchQRCode]);

  const confirmAction = (config: any) => {
    setConfirmConfig(config);
    setShowConfirmModal(true);
  };

  const handleDeleteInstance = (instanceName: string) => {
    confirmAction({
      title: 'Deletar Instância',
      message: `Tem certeza que deseja deletar "${instanceName}"?`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/instance/${instanceName}`);
          toast.success('Deletada!');
          loadInstances();
        } catch (error) {
          toast.error('Erro ao deletar');
        }
      }
    });
  };

  const handleLogoutInstance = (instanceName: string) => {
    confirmAction({
      title: 'Desconectar',
      message: `Deseja desconectar a instância "${instanceName}"?`,
      onConfirm: async () => {
        try {
          await api.post(`/instance/${instanceName}/logout`);
          toast.success('Desconectado!');
          loadInstances();
        } catch (error) {
          toast.error('Erro ao desconectar');
        }
      }
    });
  };

  const getStatusInfo = (instance: Instance) => {
    if (instance.isConnected || instance.status === 'connected') {
      return { color: 'text-green-400', bgColor: 'bg-green-400/20', icon: Wifi, label: 'Conectado' };
    }
    if (instance.status === 'connecting' || instance.status === 'qr') {
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', icon: Clock, label: 'Conectando' };
    }
    return { color: 'text-red-400', bgColor: 'bg-red-400/20', icon: WifiOff, label: 'Desconectado' };
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Instâncias WhatsApp
          </h1>
          <p className="text-white/60 mt-1">Gerencie suas conexões e dispositivos</p>
        </div>
        <Button variant="neon" onClick={() => setShowCreateModal(true)} icon={<Plus className="w-5 h-5" />}>
          Nova Instância
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20">
          <Smartphone className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white/60 mb-2">Nenhuma instância</h3>
          <Button variant="glass" onClick={() => setShowCreateModal(true)}>Criar Primeira</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance) => {
            const statusInfo = getStatusInfo(instance);
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={instance.instanceName} variant="glass" className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${statusInfo.bgColor} rounded-lg`}><Smartphone className={`w-5 h-5 ${statusInfo.color}`} /></div>
                    <div>
                      <h3 className="font-semibold text-white">{instance.instanceName}</h3>
                      <p className="text-xs text-white/40">{statusInfo.label}</p>
                    </div>
                  </div>
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {!instance.isConnected ? (
                    <Button size="sm" variant="neon" onClick={() => { setSelectedInstance(instance); setShowQRModal(true); }} icon={<QrCode className="w-4 h-4" />}>Conectar</Button>
                  ) : (
                    <Button size="sm" variant="glass" onClick={() => handleLogoutInstance(instance.instanceName)} icon={<Power className="w-4 h-4" />}>Sair</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => handleDeleteInstance(instance.instanceName)} icon={<Trash2 className="w-4 h-4" />}>Deletar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nova Instância">
        <form onSubmit={handleCreateInstance} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Nome da Instância</label>
            <input
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
              placeholder="Ex: comercial-01"
              value={createForm.instanceName}
              onChange={e => setCreateForm({ ...createForm, instanceName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Tipo de Provedor</label>
            <select
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white appearance-none"
              value={createForm.provider}
              onChange={e => setCreateForm({ ...createForm, provider: e.target.value })}
            >
              <option value="baileys" className="bg-slate-900">Não-Oficial (Baileys)</option>
              <option value="official" className="bg-slate-900">Oficial (Meta Cloud API)</option>
            </select>
          </div>

          <AnimatePresence>
            {createForm.provider === 'official' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 border-l-2 border-purple-500/30 pl-4 py-2 mt-4"
              >
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Access Token (Meta Cloud)</label>
                  <input
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    placeholder="EAAG..."
                    value={createForm.accessToken}
                    onChange={e => setCreateForm({ ...createForm, accessToken: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm text-white/60">Phone Number ID</label>
                    <input
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                      placeholder="1234567890"
                      value={createForm.phoneNumberId}
                      onChange={e => setCreateForm({ ...createForm, phoneNumberId: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm text-white/60">WABA ID</label>
                    <input
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                      placeholder="0987654321"
                      value={createForm.wabaId}
                      onChange={e => setCreateForm({ ...createForm, wabaId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Verify Token (Para Webhook)</label>
                  <input
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    placeholder="Token escolhido no painel da Meta"
                    value={createForm.verifyToken}
                    onChange={e => setCreateForm({ ...createForm, verifyToken: e.target.value })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="neon" className="w-full text-center flex justify-center py-3 mt-6" type="submit">
            Criar Instância
          </Button>
        </form>
      </Modal>

      {/* MODAL QR */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Conectar WhatsApp">
        <div className="flex flex-col items-center py-6">
          {!qrCodeData ? <Loader2 className="animate-spin text-purple-500 w-10 h-10" /> : (
            <>
              {qrCodeData.qrcodeBase64 && <img src={qrCodeData.qrcodeBase64} className="bg-white p-2 rounded-lg mb-4" />}
              {qrCodeData.pairingCode && <div className="p-3 bg-white/5 rounded-lg font-mono text-xl tracking-widest text-purple-400">{qrCodeData.pairingCode}</div>}
              <p className="text-white/60 text-sm mt-4 text-center">Escaneie o QR Code no seu WhatsApp</p>
            </>
          )}
        </div>
      </Modal>

      {/* MODAL CONFIRMAÇÃO */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmConfig?.title || 'Confirmação'}
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="glass" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
            <Button variant={confirmConfig?.danger ? 'danger' : 'neon'} className="flex-1" onClick={() => { confirmConfig?.onConfirm(); setShowConfirmModal(false); }}>Confirmar</Button>
          </div>
        }
      >
        <p className="text-white/80 py-4">{confirmConfig?.message}</p>
      </Modal>
    </div>
  );
}
