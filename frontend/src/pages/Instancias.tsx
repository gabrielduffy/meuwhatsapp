import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Smartphone, Wifi, WifiOff, QrCode, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Instance {
  id: number;
  instance_name: string;
  status: string;
  phone_number?: string;
  qr_code?: string;
}

export default function Instancias() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const { data } = await api.get('/instance/list');
      setInstances(data);
    } catch (error) {
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    const instanceName = prompt('Nome da instância:');
    if (!instanceName) return;

    try {
      await api.post('/instance/create', { instanceName });
      toast.success('Instância criada!');
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar instância');
    }
  };

  const connectInstance = async (instanceName: string) => {
    try {
      const { data } = await api.get(`/instance/connect/${instanceName}`);
      if (data.qrCode) {
        setSelectedInstance({ ...data, instance_name: instanceName } as Instance);
        setShowQRModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao conectar');
    }
  };

  const deleteInstance = async (instanceName: string) => {
    if (!confirm('Deletar instância?')) return;

    try {
      await api.delete(`/instance/delete/${instanceName}`);
      toast.success('Instância deletada');
      loadInstances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'qr': return 'text-blue-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Instâncias WhatsApp</h1>
        <button
          onClick={createInstance}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Nova Instância
        </button>
      </div>

      {loading ? (
        <div className="text-center text-white/60">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <motion.div
              key={instance.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="font-semibold text-white">{instance.instance_name}</h3>
                    {instance.phone_number && (
                      <p className="text-sm text-white/60">{instance.phone_number}</p>
                    )}
                  </div>
                </div>
                {instance.status === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(instance.status)} animate-pulse`} />
                <span className="text-sm text-white/60 capitalize">{instance.status}</span>
              </div>

              <div className="flex gap-2">
                {instance.status !== 'connected' && (
                  <button
                    onClick={() => connectInstance(instance.instance_name)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    Conectar
                  </button>
                )}
                <button
                  onClick={() => deleteInstance(instance.instance_name)}
                  className="px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedInstance?.qr_code && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-white/10 rounded-lg p-8 max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">Escaneie o QR Code</h2>
            <div className="bg-white p-4 rounded-lg">
              <img src={selectedInstance.qr_code} alt="QR Code" className="w-full" />
            </div>
            <button
              onClick={() => setShowQRModal(false)}
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
