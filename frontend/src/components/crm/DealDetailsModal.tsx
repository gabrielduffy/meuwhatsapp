import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  Smartphone,
  Mail,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Briefcase,
  User,
  Clock
} from 'lucide-react';

interface DealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  negociacaoId: string;
}

export default function DealDetailsModal({
  isOpen,
  onClose,
  onSuccess,
  negociacaoId,
}: DealDetailsModalProps) {
  const [negociacao, setNegociacao] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');

  useEffect(() => {
    if (isOpen && negociacaoId) {
      carregarDados();
    }
  }, [isOpen, negociacaoId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [negRes, histRes, usuariosRes] = await Promise.all([
        api.get(`/api/crm/negociacoes/${negociacaoId}`),
        api.get(`/api/crm/negociacoes/${negociacaoId}/historico`),
        api.get('/api/usuarios')
      ]);

      setNegociacao(negRes.data.negociacao);
      setHistorico(histRes.data.historico || []);
      setUsuarios(usuariosRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes da negociação');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: any) => {
    try {
      await api.put(`/api/crm/negociacoes/${negociacaoId}`, { [field]: value });
      setNegociacao((prev: any) => ({ ...prev, [field]: value }));
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoComentario.trim()) return;

    setActionLoading(true);
    try {
      await api.post(`/api/crm/negociacoes/${negociacaoId}/historico`, {
        tipo: 'comentario',
        dados: { comentario: novoComentario }
      });
      setNovoComentario('');
      const { data } = await api.get(`/api/crm/negociacoes/${negociacaoId}/historico`);
      setHistorico(data.historico || []);
      toast.success('Comentário adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGanhar = async () => {
    if (!confirm('Tem certeza que deseja marcar como ganha?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/crm/negociacoes/${negociacaoId}/ganhar`);
      toast.success('Negociação marcada como ganha!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao marcar como ganha');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePerder = async () => {
    const motivo = prompt('Qual o motivo da perda?');
    if (!motivo) return;
    setActionLoading(true);
    try {
      await api.post(`/api/crm/negociacoes/${negociacaoId}/perder`, { motivo });
      toast.success('Negociação marcada como perdida');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao marcar como perdida');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Esta ação não pode ser desfeita. Excluir negociação?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/crm/negociacoes/${negociacaoId}`);
      toast.success('Negociação excluída');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao excluir');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !negociacao) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Card" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Card"
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="danger" onClick={handleDelete} loading={actionLoading}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Card
          </Button>
          <div className="flex gap-2">
            <Button variant="glass" onClick={onClose}>Cancelar</Button>
            <Button variant="neon" onClick={onClose}>Salvar</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome do Lead *"
            value={negociacao.contato_nome || negociacao.titulo}
            onChange={(e: any) => handleUpdate('titulo', e.target.value)}
            placeholder="Ex: Paulo Sérgio"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Closer Responsável
            </label>
            <select
              value={negociacao.responsavel_id || ''}
              onChange={(e) => handleUpdate('responsavel_id', e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="">Selecione um closer</option>
              {usuarios.map((u: any) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="WhatsApp"
              value={negociacao.contato_telefone || ''}
              readOnly
              icon={<Smartphone className="w-4 h-4" />}
            />
            <button className="absolute right-3 top-9 p-1.5 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
          <Input
            label="Email"
            value={negociacao.contato_email || ''}
            readOnly
            icon={<Mail className="w-4 h-4" />}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Observações
          </label>
          <textarea
            value={negociacao.descricao || ''}
            onChange={(e) => handleUpdate('descricao', e.target.value)}
            className="w-full h-32 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none"
            placeholder="Adicione observações sobre o lead..."
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-500" />
            Comentários ({historico.filter(h => h.tipo === 'comentario').length})
          </h3>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <Input
              value={novoComentario}
              onChange={(e: any) => setNovoComentario(e.target.value)}
              placeholder="Adicionar comentário..."
              className="flex-1"
            />
            <Button
              type="submit"
              variant="neon"
              loading={actionLoading}
              icon={<Send className="w-4 h-4" />}
            />
          </form>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {historico
              .filter(h => h.tipo === 'comentario' || h.tipo === 'criada' || h.tipo === 'movida')
              .map((item, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-purple-600 dark:text-purple-400">
                      {item.atribuido_nome || item.usuario_nome || 'Sistema'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(item.criado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item.tipo === 'comentario' ? item.dados?.comentario : (item.descricao || `Evento: ${item.tipo}`)}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="success"
            onClick={handleGanhar}
            loading={actionLoading}
            className="flex-1 py-3"
            icon={<CheckCircle className="w-5 h-5" />}
          >
            Vendido / Ganho
          </Button>
          <Button
            variant="danger"
            onClick={handlePerder}
            loading={actionLoading}
            className="flex-1 py-3"
            icon={<XCircle className="w-5 h-5" />}
          >
            Perdido
          </Button>
        </div>
      </div>
    </Modal>
  );
}
