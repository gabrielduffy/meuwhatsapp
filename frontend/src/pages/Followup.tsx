import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Clock,
  Power,
  Trash2,
  Send,
  Users,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

interface Sequencia {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  gatilho_tipo: string;
  total_etapas: number;
  total_inscritos?: number;
  total_concluidos?: number;
  usar_agente_ia: boolean;
  criado_em: string;
}

export default function Followup() {
  const [sequencias, setSequencias] = useState<Sequencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    gatilho_tipo: 'manual',
    usar_agente_ia: false,
    instancia_id: '',
    etapas: [
      { ordem: 0, intervalo_horas: 24, mensagem: '' },
      { ordem: 1, intervalo_horas: 48, mensagem: '' },
    ],
  });

  useEffect(() => {
    carregarSequencias();
  }, []);

  const carregarSequencias = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/followup/sequencias');
      setSequencias(response.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar sequências');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/followup/sequencias', formData);
      toast.success('Sequência criada com sucesso!');
      setCreateModalOpen(false);
      await carregarSequencias();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao criar sequência');
    }
  };

  const handleToggle = async (sequencia: Sequencia) => {
    try {
      await api.patch(`/api/followup/sequencias/${sequencia.id}/status`, {
        ativo: !sequencia.ativo,
      });
      toast.success(`Sequência ${sequencia.ativo ? 'desativada' : 'ativada'}!`);
      await carregarSequencias();
    } catch (error: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (sequencia: Sequencia) => {
    if (!confirm(`Deletar sequência "${sequencia.nome}"?`)) return;

    try {
      await api.delete(`/api/followup/sequencias/${sequencia.id}`);
      toast.success('Sequência deletada!');
      await carregarSequencias();
    } catch (error: any) {
      toast.error('Erro ao deletar sequência');
    }
  };

  const addEtapa = () => {
    setFormData({
      ...formData,
      etapas: [
        ...formData.etapas,
        {
          ordem: formData.etapas.length,
          intervalo_horas: 24,
          mensagem: '',
        },
      ],
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Follow-up Inteligente
          </h1>
          <p className="text-white/60 mt-1">
            Sequências automáticas de mensagens
          </p>
        </div>

        <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Nova Sequência
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-purple-600/10">
              <Clock className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Sequências</p>
              <p className="text-2xl font-bold text-white">{sequencias.length}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/30 to-green-600/10">
              <Power className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Ativas</p>
              <p className="text-2xl font-bold text-white">
                {sequencias.filter(s => s.ativo).length}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-cyan-600/10">
              <Users className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Inscritos</p>
              <p className="text-2xl font-bold text-white">
                {sequencias.reduce((sum, s) => sum + (s.total_inscritos || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-600/30 to-yellow-600/10">
              <CheckCircle className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Concluídos</p>
              <p className="text-2xl font-bold text-white">
                {sequencias.reduce((sum, s) => sum + (s.total_concluidos || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : sequencias.length === 0 ? (
        <Card variant="glass" className="text-center py-12">
          <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Nenhuma sequência configurada</p>
          <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Criar Primeira Sequência
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequencias.map((sequencia, index) => (
            <motion.div
              key={sequencia.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="gradient">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${sequencia.ativo
                        ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30'
                        : 'bg-white/5'
                      }`}>
                      <Clock className={`w-6 h-6 ${sequencia.ativo ? 'text-purple-300' : 'text-white/40'
                        }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{sequencia.nome}</h3>
                      <p className="text-xs text-white/60">{sequencia.gatilho_tipo}</p>
                    </div>
                  </div>

                  <Badge variant={sequencia.ativo ? 'success' : 'danger'}>
                    {sequencia.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                {sequencia.descricao && (
                  <p className="text-sm text-white/70 mb-4">{sequencia.descricao}</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-white/60">Etapas</span>
                    </div>
                    <p className="text-lg font-bold text-white">{sequencia.total_etapas}</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-white/60">Inscritos</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {sequencia.total_inscritos || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant={sequencia.ativo ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggle(sequencia)}
                    icon={<Power className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {sequencia.ativo ? 'Desativar' : 'Ativar'}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(sequencia)}
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
        title="Nova Sequência de Follow-up"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome da Sequência"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Gatilho</label>
            <select
              value={formData.gatilho_tipo}
              onChange={(e) => setFormData({ ...formData, gatilho_tipo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="manual">Manual</option>
              <option value="novo_contato">Novo Contato</option>
              <option value="mensagem_recebida">Mensagem Recebida</option>
              <option value="tag_adicionada">Tag Adicionada</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white/80">
                Etapas ({formData.etapas.length})
              </label>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={addEtapa}
              >
                <Plus className="w-4 h-4" />
                Adicionar Etapa
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {formData.etapas.map((etapa, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Etapa {index + 1}
                    </span>
                    <Input
                      type="number"
                      placeholder="Horas"
                      value={etapa.intervalo_horas}
                      onChange={(e) => {
                        const newEtapas = [...formData.etapas];
                        newEtapas[index].intervalo_horas = parseInt(e.target.value);
                        setFormData({ ...formData, etapas: newEtapas });
                      }}
                      className="w-24"
                      required
                    />
                    <span className="text-sm text-white/60">horas após anterior</span>
                  </div>
                  <textarea
                    value={etapa.mensagem}
                    onChange={(e) => {
                      const newEtapas = [...formData.etapas];
                      newEtapas[index].mensagem = e.target.value;
                      setFormData({ ...formData, etapas: newEtapas });
                    }}
                    rows={2}
                    placeholder="Mensagem da etapa..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-purple-400/50"
                    required
                  />
                </div>
              ))}
            </div>
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
              Criar Sequência
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
