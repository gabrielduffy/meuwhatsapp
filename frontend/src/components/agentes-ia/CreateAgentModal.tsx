import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAgentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'atendimento',
    modelo: 'llama-3.1-70b-versatile',
    instancia_id: '',
    temperatura: '0.7',
    max_tokens: '1024',
    personalidade: '',
    instrucoes: '',
  });

  useEffect(() => {
    if (isOpen) {
      carregarInstancias();
    }
  }, [isOpen]);

  const carregarInstancias = async () => {
    try {
      const response = await api.get('/instance');
      setInstancias(response.data.instances || []);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/agentes-ia', {
        ...formData,
        temperatura: parseFloat(formData.temperatura),
        max_tokens: parseInt(formData.max_tokens),
      });

      toast.success('Agente criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar agente:', error);
      toast.error(error.response?.data?.erro || 'Erro ao criar agente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Agente de IA"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome do Agente"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Ex: Assistente de Vendas"
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
            placeholder="Descrição do agente..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Tipo de Agente
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            required
          >
            <option value="atendimento">Atendimento ao Cliente</option>
            <option value="vendas">Vendas</option>
            <option value="suporte">Suporte Técnico</option>
            <option value="qualificacao">Qualificação de Leads</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Modelo de IA
          </label>
          <select
            value={formData.modelo}
            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            required
          >
            <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Recomendado)</option>
            <option value="llama-3.1-8b-instant">Llama 3.1 8B (Rápido)</option>
            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            <option value="gemma2-9b-it">Gemma 2 9B</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Instância do WhatsApp
          </label>
          <select
            value={formData.instancia_id}
            onChange={(e) => setFormData({ ...formData, instancia_id: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            required
          >
            <option value="">Selecione uma instância</option>
            {instancias.map((inst: any) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.status})
              </option>
            ))}
          </select>
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
            Personalidade do Agente
          </label>
          <textarea
            value={formData.personalidade}
            onChange={(e) => setFormData({ ...formData, personalidade: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            placeholder="Ex: Você é um assistente amigável e prestativo..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Instruções Especiais
          </label>
          <textarea
            value={formData.instrucoes}
            onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
            placeholder="Ex: Sempre pergunte o nome do cliente antes de continuar..."
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
            Criar Agente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
