import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Webhook,
  Power,
  Trash2,
  TestTube,
  Link as LinkIcon,
} from 'lucide-react';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  url?: string;
  metodo?: string;
  headers?: any;
  criado_em: string;
}

export default function Integracoes() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'webhook',
    url: '',
    metodo: 'POST',
    headers: '{}',
  });

  useEffect(() => {
    carregarIntegracoes();
  }, []);

  const carregarIntegracoes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/integracoes');
      setIntegracoes(response.data.integracoes || []);
    } catch (error: any) {
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/integracoes', {
        ...formData,
        headers: JSON.parse(formData.headers),
      });
      toast.success('Integração criada com sucesso!');
      setCreateModalOpen(false);
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao criar integração');
    }
  };

  const handleToggle = async (integracao: Integracao) => {
    try {
      const endpoint = integracao.ativo ? 'desativar' : 'ativar';
      await api.post(`/integracoes/${integracao.id}/${endpoint}`);
      toast.success(`Integração ${integracao.ativo ? 'desativada' : 'ativada'}!`);
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleTest = async (integracao: Integracao) => {
    try {
      await api.post(`/integracoes/${integracao.id}/testar`);
      toast.success('Teste realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao testar integração');
    }
  };

  const handleDelete = async (integracao: Integracao) => {
    if (!confirm(`Deletar integração "${integracao.nome}"?`)) return;

    try {
      await api.delete(`/integracoes/${integracao.id}`);
      toast.success('Integração deletada!');
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error('Erro ao deletar integração');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Integrações
          </h1>
          <p className="text-white/60 mt-1">
            Conecte seu WhatsApp com outras plataformas
          </p>
        </div>

        <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Nova Integração
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : integracoes.length === 0 ? (
        <Card variant="glass" className="text-center py-12">
          <Webhook className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Nenhuma integração configurada</p>
          <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Criar Primeira Integração
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integracoes.map((integracao, index) => (
            <motion.div
              key={integracao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="gradient">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      integracao.ativo
                        ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30'
                        : 'bg-white/5'
                    }`}>
                      <Webhook className={`w-6 h-6 ${
                        integracao.ativo ? 'text-purple-300' : 'text-white/40'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{integracao.nome}</h3>
                      <p className="text-xs text-white/60">{integracao.tipo}</p>
                    </div>
                  </div>

                  <Badge variant={integracao.ativo ? 'success' : 'danger'}>
                    {integracao.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                {integracao.url && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <LinkIcon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-white/60">URL</span>
                    </div>
                    <p className="text-sm text-white/80 truncate">{integracao.url}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleTest(integracao)}
                    icon={<TestTube className="w-4 h-4" />}
                  >
                    Testar
                  </Button>

                  <Button
                    variant={integracao.ativo ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggle(integracao)}
                    icon={<Power className="w-4 h-4" />}
                  />

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(integracao)}
                    icon={<Trash2 className="w-4 h-4" />}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova Integração"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="webhook">Webhook</option>
              <option value="api">API REST</option>
              <option value="zapier">Zapier</option>
              <option value="make">Make (Integromat)</option>
            </select>
          </div>

          <Input
            label="URL"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Método HTTP</label>
            <select
              value={formData.metodo}
              onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => setCreateModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="neon" className="flex-1">
              Criar Integração
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
