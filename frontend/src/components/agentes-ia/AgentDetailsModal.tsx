import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Bot, Zap, Settings, TrendingUp } from 'lucide-react';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agenteId: string;
}

export default function AgentDetailsModal({
  isOpen,
  onClose,
  onSuccess,
  agenteId,
}: AgentDetailsModalProps) {
  const [agente, setAgente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    temperatura: '',
    max_tokens: '',
    personalidade: '',
    instrucoes: '',
  });

  useEffect(() => {
    if (isOpen) {
      carregarDetalhes();
    }
  }, [isOpen, agenteId]);

  const carregarDetalhes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/agentes-ia/${agenteId}`);
      const agenteData = response.data.agente;
      setAgente(agenteData);
      setFormData({
        nome: agenteData.nome || '',
        descricao: agenteData.descricao || '',
        temperatura: agenteData.temperatura?.toString() || '0.7',
        max_tokens: agenteData.max_tokens?.toString() || '1024',
        personalidade: agenteData.personalidade || '',
        instrucoes: agenteData.instrucoes || '',
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes do agente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/agentes-ia/${agenteId}`, {
        ...formData,
        temperatura: parseFloat(formData.temperatura),
        max_tokens: parseInt(formData.max_tokens),
      });

      toast.success('Agente atualizado com sucesso!');
      setEditing(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar agente:', error);
      toast.error(error.response?.data?.erro || 'Erro ao atualizar agente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Agente" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  if (!agente) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar Agente' : 'Detalhes do Agente'}
      size="lg"
    >
      {!editing ? (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-600/30 to-cyan-600/30">
              <Bot className="w-8 h-8 text-purple-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">{agente.nome}</h3>
              {agente.descricao && (
                <p className="text-white/70">{agente.descricao}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant={agente.ativo ? 'success' : 'danger'}>
                  {agente.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant="purple">{agente.tipo}</Badge>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/60">Modelo</span>
              </div>
              <p className="text-white font-semibold">{agente.modelo}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-white/60">Temperatura</span>
              </div>
              <p className="text-white font-semibold">{agente.temperatura}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/60">Interações</span>
              </div>
              <p className="text-white font-semibold">{agente.total_interacoes || 0}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {agente.personalidade && (
              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-2">Personalidade</h4>
                <p className="text-white/70 bg-white/5 rounded-lg p-3 text-sm">
                  {agente.personalidade}
                </p>
              </div>
            )}

            {agente.instrucoes && (
              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-2">Instruções</h4>
                <p className="text-white/70 bg-white/5 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {agente.instrucoes}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              variant="neon"
              onClick={() => setEditing(true)}
              className="flex-1"
            >
              Editar Agente
            </Button>
            <Button
              variant="glass"
              onClick={onClose}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome do Agente"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temperatura (0-2)"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={formData.temperatura}
              onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
            />

            <Input
              label="Max Tokens"
              type="number"
              min="256"
              max="4096"
              value={formData.max_tokens}
              onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Personalidade
            </label>
            <textarea
              value={formData.personalidade}
              onChange={(e) => setFormData({ ...formData, personalidade: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Instruções
            </label>
            <textarea
              value={formData.instrucoes}
              onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => setEditing(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="neon"
              loading={saving}
              className="flex-1"
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
