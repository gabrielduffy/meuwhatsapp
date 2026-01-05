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
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ========================================
// INTERFACES
// ========================================

interface Instance {
  id?: number;
  instanceName: string;
  isConnected: boolean;
  user?: {
    id: string;
    name: string;
  };
  status?: string;
  phone_number?: string;
  qr_code?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pairingCode?: string;
  createdAt?: string;
  lastActivity?: string;
  proxy?: string;
  webhookUrl?: string;
  rejectCalls?: boolean;
}

interface CreateInstanceData {
  instanceName: string;
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function Instancias() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    pairingCode?: string;
    status?: string;
  } | null>(null);

  // Estado do formulário de criação
  const [createForm, setCreateForm] = useState<CreateInstanceData>({
    instanceName: '',
  });

  // Estado de configuração de instância
  const [configForm, setConfigForm] = useState({
    rejectCalls: false,
    profileName: '',
    profileStatus: '',
    webhookUrl: '',
  });

  // ========================================
  // CARREGAMENTO DE INSTÂNCIAS
  // ========================================

  const loadInstances = useCallback(async () => {
    try {
      const { data } = await api.get('/instance/list');
      setInstances(data);
    } catch (error: any) {
      toast.error('Erro ao carregar instâncias');
      console.error('Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();

    // Atualizar lista a cada 10 segundos
    const interval = setInterval(loadInstances, 10000);

    return () => clearInterval(interval);
  }, [loadInstances]);

  // ========================================
  // CRIAR INSTÂNCIA
  // ========================================

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.instanceName.trim()) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    try {
      const payload = {
        instanceName: createForm.instanceName.trim(),
      };

      await api.post('/instance/create', payload);

      toast.success('Instância criada! Clique em Conectar para escanear o QR Code.');
      setShowCreateModal(false);
      setCreateForm({
        instanceName: '',
      });

      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar instância');
      console.error('Erro ao criar instância:', error);
    }
  };

  // ========================================
  // OBTER QR CODE
  // ========================================

  const fetchQRCode = async (instanceName: string) => {
    try {
      const { data } = await api.get(`/instance/${instanceName}/qrcode`);

      if (data.status === 'connected') {
        toast.success('Instância já está conectada!');
        setShowQRModal(false);
        loadInstances();
        return;
      }

      if (data.status === 'waiting') {
        toast('Aguardando geração do QR Code...', { icon: '⏳' });
        return;
      }

      setQrCodeData({
        qrCode: data.qrcode,
        qrCodeBase64: data.qrcodeBase64,
        pairingCode: data.pairingCode,
        status: data.status,
      });
    } catch (error: any) {
      console.error('Erro ao buscar QR Code:', error);
    }
  };

  const openQRModal = async (instance: Instance) => {
    setSelectedInstance(instance);
    setShowQRModal(true);
    setQrCodeData(null);

    // Buscar QR Code imediatamente
    await fetchQRCode(instance.instanceName);

    // Atualizar QR Code a cada 5 segundos
    const interval = setInterval(() => {
      fetchQRCode(instance.instanceName);
    }, 5000);

    // Limpar intervalo quando fechar o modal
    return () => clearInterval(interval);
  };

  // ========================================
  // DELETAR INSTÂNCIA
  // ========================================

  const handleDeleteInstance = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a instância "${instanceName}"?`)) {
      return;
    }

    try {
      await api.delete(`/instance/${instanceName}`);
      toast.success('Instância deletada com sucesso!');
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar instância');
      console.error('Erro ao deletar instância:', error);
    }
  };

  // ========================================
  // DESCONECTAR INSTÂNCIA
  // ========================================

  const handleLogoutInstance = async (instanceName: string) => {
    if (!confirm(`Desconectar a instância "${instanceName}"?`)) {
      return;
    }

    try {
      await api.post(`/instance/${instanceName}/logout`);
      toast.success('Instância desconectada!');
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao desconectar');
      console.error('Erro ao desconectar instância:', error);
    }
  };

  // ========================================
  // REINICIAR INSTÂNCIA
  // ========================================

  const handleRestartInstance = async (instanceName: string) => {
    try {
      toast('Reiniciando instância...', { icon: '🔄' });
      await api.post(`/instance/${instanceName}/restart`);
      toast.success('Instância reiniciada!');
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao reiniciar');
      console.error('Erro ao reiniciar instância:', error);
    }
  };

  // ========================================
  // CONFIGURAR INSTÂNCIA
  // ========================================

  const openConfigModal = async (instance: Instance) => {
    setSelectedInstance(instance);

    // Buscar informações detalhadas
    try {
      const { data } = await api.get(`/instance/${instance.instanceName}/info`);

      // Buscar webhook
      let currentWebhook = '';
      try {
        const webhookRes = await api.get(`/webhook/${instance.instanceName}`);
        if (webhookRes.data?.webhook) {
          currentWebhook = webhookRes.data.webhook;
        }
      } catch (e) { /* ignore webhook error */ }

      setConfigForm({
        rejectCalls: data.rejectCalls || false,
        profileName: data.user?.name || '',
        profileStatus: '',
        webhookUrl: currentWebhook,
      });
    } catch (error) {
      setConfigForm({
        rejectCalls: false,
        profileName: '',
        profileStatus: '',
        webhookUrl: '',
      });
    }

    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedInstance) return;

    try {
      // Atualizar rejeição de chamadas
      if (configForm.rejectCalls !== undefined) {
        await api.post(`/instance/${selectedInstance.instanceName}/reject-calls`, {
          reject: configForm.rejectCalls,
        });
      }

      // Atualizar nome do perfil
      if (configForm.profileName.trim()) {
        await api.post(`/instance/${selectedInstance.instanceName}/profile/name`, {
          name: configForm.profileName.trim(),
        });
      }

      // Atualizar status do perfil
      if (configForm.profileStatus.trim()) {
        await api.post(`/instance/${selectedInstance.instanceName}/profile/status`, {
          status: configForm.profileStatus.trim(),
        });
      }

      // Atualizar Webhook
      if (configForm.webhookUrl !== undefined) {
        await api.post('/webhook/set', {
          instanceName: selectedInstance.instanceName,
          webhookUrl: configForm.webhookUrl,
          events: ['all']
        });
      }

      toast.success('Configurações salvas!');
      setShowConfigModal(false);
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
      console.error('Erro ao salvar configurações:', error);
    }
  };

  // ========================================
  // COPIAR PAIRING CODE
  // ========================================

  const copyPairingCode = () => {
    if (qrCodeData?.pairingCode) {
      navigator.clipboard.writeText(qrCodeData.pairingCode);
      toast.success('Código de pareamento copiado!');
    }
  };

  // ========================================
  // HELPERS
  // ========================================

  const getStatusInfo = (instance: Instance) => {
    if (instance.isConnected || instance.status === 'connected') {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-400/20',
        icon: Wifi,
        label: 'Conectado',
      };
    }

    if (instance.status === 'connecting' || instance.status === 'qr') {
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/20',
        icon: Clock,
        label: 'Conectando',
      };
    }

    return {
      color: 'text-red-400',
      bgColor: 'bg-red-400/20',
      icon: WifiOff,
      label: 'Desconectado',
    };
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Instâncias WhatsApp</h1>
          <p className="text-white/60 mt-1">Gerencie suas conexões WhatsApp</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-5 h-5" />
          Nova Instância
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : instances.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <Smartphone className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white/60 mb-2">
            Nenhuma instância criada
          </h3>
          <p className="text-white/40 mb-6">
            Crie sua primeira instância para começar a usar o WhatsApp
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Criar Primeira Instância
          </button>
        </div>
      ) : (
        /* Grid de Instâncias */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.map((instance, index) => {
            const statusInfo = getStatusInfo(instance);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={instance.instanceName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/30 transition-all"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 ${statusInfo.bgColor} rounded-lg`}>
                      <Smartphone className={`w-5 h-5 ${statusInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {instance.instanceName}
                      </h3>
                      {instance.user?.name && (
                        <p className="text-sm text-white/60 truncate">
                          {instance.user.name}
                        </p>
                      )}
                      {instance.phone_number && (
                        <p className="text-xs text-white/40 truncate">
                          {instance.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-2 h-2 rounded-full ${statusInfo.color} ${statusInfo.label === 'Conectado' ? 'animate-pulse' : ''
                      }`}
                  />
                  <span className={`text-sm font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Ações */}
                <div className="grid grid-cols-2 gap-2">
                  {!instance.isConnected && instance.status !== 'connected' ? (
                    <button
                      onClick={() => openQRModal(instance)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors text-sm font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      Conectar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLogoutInstance(instance.instanceName)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors text-sm font-medium"
                    >
                      <Power className="w-4 h-4" />
                      Desconectar
                    </button>
                  )}

                  <button
                    onClick={() => openConfigModal(instance)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm font-medium"
                    disabled={!instance.isConnected && instance.status !== 'connected'}
                  >
                    <Settings className="w-4 h-4" />
                    Configurar
                  </button>

                  <button
                    onClick={() => handleRestartInstance(instance.instanceName)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar
                  </button>

                  <button
                    onClick={() => handleDeleteInstance(instance.instanceName)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================
          MODAL: CRIAR INSTÂNCIA
      ======================================== */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Plus className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Nova Instância</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateInstance} className="space-y-4">
                {/* Nome da Instância */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Nome da Instância <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.instanceName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, instanceName: e.target.value })
                    }
                    placeholder="ex: minha-instancia"
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Use apenas letras minúsculas, números e hífens
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg shadow-purple-500/20"
                  >
                    Criar Instância
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================
          MODAL: QR CODE
      ======================================== */}
      <AnimatePresence>
        {showQRModal && selectedInstance && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <QrCode className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Conectar WhatsApp</h2>
                    <p className="text-sm text-white/60">{selectedInstance.instanceName}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setQrCodeData(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* QR Code Display */}
              <div className="space-y-4">
                {!qrCodeData ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                    <p className="text-white/60">Gerando QR Code...</p>
                  </div>
                ) : qrCodeData.status === 'connected' ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                    <p className="text-white font-medium">Conectado com sucesso!</p>
                  </div>
                ) : (
                  <>
                    {/* QR Code Image */}
                    {qrCodeData.qrCodeBase64 && (
                      <div className="bg-white p-4 rounded-lg">
                        <img
                          src={qrCodeData.qrCodeBase64}
                          alt="QR Code"
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Instruções */}
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white/80 space-y-1">
                          <p className="font-medium text-white">Como conectar:</p>
                          <ol className="list-decimal list-inside space-y-1 text-white/60">
                            <li>Abra o WhatsApp no seu celular</li>
                            <li>Toque em Menu ou Configurações</li>
                            <li>Toque em Aparelhos conectados</li>
                            <li>Toque em Conectar aparelho</li>
                            <li>Aponte seu celular para esta tela</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Pairing Code */}
                    {qrCodeData.pairingCode && (
                      <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                        <p className="text-sm text-white/80 mb-2">
                          Ou use o código de pareamento:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded text-white font-mono text-lg tracking-wider">
                            {qrCodeData.pairingCode}
                          </code>
                          <button
                            onClick={copyPairingCode}
                            className="p-2 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setQrCodeData(null);
                  }}
                  className="flex-1 px-6 py-3 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 transition-colors font-medium"
                >
                  Fechar
                </button>
                <button
                  onClick={() => fetchQRCode(selectedInstance.instanceName)}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar QR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================
          MODAL: CONFIGURAÇÕES
      ======================================== */}
      <AnimatePresence>
        {showConfigModal && selectedInstance && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Settings className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Configurações</h2>
                    <p className="text-sm text-white/60">{selectedInstance.instanceName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Rejeitar Chamadas */}
                <div className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Rejeitar Chamadas</p>
                    <p className="text-sm text-white/60">
                      Rejeitar chamadas automaticamente
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.rejectCalls}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, rejectCalls: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-white/10 bg-black/20 text-purple-600 focus:ring-purple-500"
                  />
                </div>

                {/* Nome do Perfil */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Nome do Perfil
                  </label>
                  <input
                    type="text"
                    value={configForm.profileName}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, profileName: e.target.value })
                    }
                    placeholder="Seu nome no WhatsApp"
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Status do Perfil */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Recado (Status)
                  </label>
                  <input
                    type="text"
                    value={configForm.profileStatus}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, profileStatus: e.target.value })
                    }
                    placeholder="Seu recado no WhatsApp"
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Webhook URL (NOVO) */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-400" />
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={configForm.webhookUrl}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, webhookUrl: e.target.value })
                    }
                    placeholder="https://seu-sistema.com/webhook"
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    URL para receber eventos de mensagens e status.
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-6 py-3 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
