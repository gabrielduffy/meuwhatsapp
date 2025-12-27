import { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  funilId: string | null;
  etapas: any[];
}

export default function CreateDealModal({
  isOpen,
  onClose,
  onSuccess,
  funilId,
  etapas,
}: CreateDealModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    valor: '',
    etapa_id: etapas[0]?.id || '',
    prioridade: 'media',
    contato_telefone: '',
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/crm/negociacoes', {
        funil_id: funilId,
        ...formData,
        valor: parseFloat(formData.valor) || 0,
      });

      toast.success('Negociação criada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar negociação:', error);
      toast.error(error.response?.data?.erro || 'Erro ao criar negociação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Negociação"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título da Negociação"
          value={formData.titulo}
          onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          placeholder="Ex: Venda de Produto X"
          required
        />

        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          value={formData.valor}
          onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
          placeholder="0.00"
        />

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Etapa Inicial
          </label>
          <select
            value={formData.etapa_id}
            onChange={(e) => setFormData({ ...formData, etapa_id: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            required
          >
            {etapas.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Prioridade
          </label>
          <select
            value={formData.prioridade}
            onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <Input
          label="Telefone do Contato (opcional)"
          value={formData.contato_telefone}
          onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
          placeholder="5511999999999"
        />

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            placeholder="Informações adicionais..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="glass"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="neon"
            loading={loading}
            className="flex-1"
          >
            Criar Negociação
          </Button>
        </div>
      </form>
    </Modal>
  );
}
