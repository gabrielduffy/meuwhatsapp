import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
  DollarSign,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      carregarDetalhes();
    }
  }, [isOpen, negociacaoId]);

  const carregarDetalhes = async () => {
    setLoading(true);
    try {
      const [negRes, histRes, tarefasRes] = await Promise.all([
        api.get(`/crm/negociacoes/${negociacaoId}`),
        api.get(`/crm/negociacoes/${negociacaoId}/historico`),
        api.get(`/crm/negociacoes/${negociacaoId}/tarefas`),
      ]);

      setNegociacao(negRes.data.negociacao);
      setHistorico(histRes.data.historico || []);
      setTarefas(tarefasRes.data.tarefas || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes da negociação');
    } finally {
      setLoading(false);
    }
  };

  const handleGanhar = async () => {
    if (!confirm('Tem certeza que deseja marcar como ganha?')) return;

    setActionLoading(true);
    try {
      await api.post(`/crm/negociacoes/${negociacaoId}/ganhar`);
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
      await api.post(`/crm/negociacoes/${negociacaoId}/perder`, { motivo });
      toast.success('Negociação marcada como perdida');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao marcar como perdida');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Negociação" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  if (!negociacao) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={negociacao.titulo} size="lg">
      <div className="space-y-6">
        {/* Info Principal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-green-600/20 to-green-600/10 border border-green-400/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white/60">Valor</span>
            </div>
            <p className="text-2xl font-bold text-green-300">
              R$ {negociacao.valor?.toLocaleString('pt-BR') || '0'}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/60">Etapa Atual</span>
            </div>
            <p className="text-lg font-semibold text-white">{negociacao.etapa_nome}</p>
          </div>
        </div>

        {/* Status e Prioridade */}
        <div className="flex gap-3">
          <Badge variant={negociacao.status === 'aberta' ? 'info' : 'success'}>
            {negociacao.status}
          </Badge>
          <Badge
            variant={
              negociacao.prioridade === 'alta'
                ? 'danger'
                : negociacao.prioridade === 'media'
                ? 'warning'
                : 'success'
            }
          >
            Prioridade: {negociacao.prioridade}
          </Badge>
        </div>

        {/* Contato e Responsável */}
        <div className="grid grid-cols-2 gap-4">
          {negociacao.contato_nome && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-white/60">Contato</p>
                <p className="text-white font-medium">{negociacao.contato_nome}</p>
              </div>
            </div>
          )}

          {negociacao.responsavel_nome && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs text-white/60">Responsável</p>
                <p className="text-white font-medium">{negociacao.responsavel_nome}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tarefas */}
        {tarefas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Tarefas ({tarefas.length})
            </h3>
            <div className="space-y-2">
              {tarefas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between"
                >
                  <span className={tarefa.concluida ? 'text-white/40 line-through' : 'text-white'}>
                    {tarefa.titulo}
                  </span>
                  {tarefa.concluida && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Histórico ({historico.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {historico.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 border-l-4 border-purple-400/50 rounded p-3"
                >
                  <p className="text-sm text-white/80">{item.descricao}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(item.criado_em).toLocaleString('pt-BR')}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        {negociacao.status === 'aberta' && (
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              variant="success"
              onClick={handleGanhar}
              loading={actionLoading}
              icon={<CheckCircle className="w-4 h-4" />}
              className="flex-1"
            >
              Marcar como Ganha
            </Button>
            <Button
              variant="danger"
              onClick={handlePerder}
              loading={actionLoading}
              icon={<XCircle className="w-4 h-4" />}
              className="flex-1"
            >
              Marcar como Perdida
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
