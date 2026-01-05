import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  Plus,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from '../components/crm/KanbanColumn';
import DealCard from '../components/crm/DealCard';
import CreateDealModal from '../components/crm/CreateDealModal';
import DealDetailsModal from '../components/crm/DealDetailsModal';

// Interfaces
interface Funil {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  limite_dias?: number;
  negociacoes: Negociacao[];
}

interface Negociacao {
  id: string;
  titulo: string;
  valor: number;
  status: string;
  prioridade: string;
  etapa_id: string;
  contato_id?: string;
  contato_nome?: string;
  contato_telefone?: string;
  contato_email?: string;
  responsavel_nome?: string;
  criado_em: string;
  entrou_etapa_em: string;
  etiquetas?: string[];
}

interface Stats {
  resumo: {
    total_abertas: number;
    total_ganhas: number;
    total_perdidas: number;
  };
  valores: {
    aberto: number;
    ganho: number;
    total: number;
  };
  taxas: {
    conversao: string;
  };
}

export default function CRM() {
  const navigate = useNavigate();
  // Estados principais
  const [funis, setFunis] = useState<Funil[]>([]);
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de drag and drop
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Estados de modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [manageFunnelsModalOpen, setManageFunnelsModalOpen] = useState(false);
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null);

  // Estados do modal de gerenciar funis
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelDescription, setNewFunnelDescription] = useState('');
  const [creatingFunnel, setCreatingFunnel] = useState(false);

  // Configuração de sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Efeitos
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (funilSelecionado) {
      carregarFunil(funilSelecionado);
    }
  }, [funilSelecionado]);

  // Funções de carregamento
  const carregarDadosIniciais = async () => {
    await Promise.all([
      carregarFunis(),
      carregarEstatisticas(),
    ]);
  };

  const carregarFunis = async () => {
    try {
      const response = await api.get('/api/crm/funis');
      const funisAtivos = response.data.funis.filter((f: Funil) => f.ativo);
      setFunis(funisAtivos);

      if (funisAtivos.length > 0 && !funilSelecionado) {
        setFunilSelecionado(funisAtivos[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast.error('Erro ao carregar funis');
    }
  };

  const carregarFunil = async (funilId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/crm/funis/${funilId}`);
      const funil = response.data.funil;
      if (funil && Array.isArray(funil.etapas)) {
        setEtapas(funil.etapas);
      } else {
        setEtapas([]);
      }
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
      toast.error('Erro ao carregar funil');
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await api.get('/api/crm/estatisticas');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Handlers de drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const negociacaoId = active.id as string;
    const novaEtapaId = over.id as string;

    // Encontrar a negociação e etapa antiga
    let negociacao: Negociacao | undefined;
    let etapaAntigaId: string | undefined;

    for (const etapa of etapas) {
      const found = etapa.negociacoes.find(n => n.id === negociacaoId);
      if (found) {
        negociacao = found;
        etapaAntigaId = etapa.id;
        break;
      }
    }

    if (!negociacao || etapaAntigaId === novaEtapaId) return;

    // Atualizar UI otimisticamente
    const novasEtapas = etapas.map(etapa => {
      if (etapa.id === etapaAntigaId) {
        return {
          ...etapa,
          negociacoes: etapa.negociacoes.filter(n => n.id !== negociacaoId),
        };
      }
      if (etapa.id === novaEtapaId) {
        return {
          ...etapa,
          negociacoes: [...etapa.negociacoes, { ...negociacao!, etapa_id: novaEtapaId }],
        };
      }
      return etapa;
    });

    setEtapas(novasEtapas);

    // Chamar API
    try {
      await api.put(`/api/crm/negociacoes/${negociacaoId}/mover`, {
        etapa_id: novaEtapaId,
      });
      toast.success('Negociação movida com sucesso!');
      await carregarEstatisticas();
    } catch (error: any) {
      console.error('Erro ao mover negociação:', error);
      toast.error(error.response?.data?.erro || 'Erro ao mover negociação');
      // Reverter em caso de erro
      if (funilSelecionado) {
        await carregarFunil(funilSelecionado);
      }
    }
  };

  // Handlers de modais
  const handleCreateDeal = () => {
    setSelectedNegociacao(null);
    setCreateModalOpen(true);
  };

  const handleDealClick = (negociacao: Negociacao) => {
    setSelectedNegociacao(negociacao);
    setDetailsModalOpen(true);
  };

  const handleDealCreated = async () => {
    if (funilSelecionado) {
      await carregarFunil(funilSelecionado);
      await carregarEstatisticas();
    }
    setCreateModalOpen(false);
  };

  const handleDealUpdated = async () => {
    if (funilSelecionado) {
      await carregarFunil(funilSelecionado);
      await carregarEstatisticas();
    }
    setDetailsModalOpen(false);
  };

  const handleCreateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFunnel(true);

    try {
      await api.post('/api/crm/funis', {
        nome: newFunnelName,
        descricao: newFunnelDescription,
      });

      toast.success('Funil criado com sucesso!');
      setNewFunnelName('');
      setNewFunnelDescription('');
      setManageFunnelsModalOpen(false);
      await carregarFunis();
    } catch (error: any) {
      console.error('Erro ao criar funil:', error);
      toast.error(error.response?.data?.erro || 'Erro ao criar funil');
    } finally {
      setCreatingFunnel(false);
    }
  };

  const handleToggleFunnelStatus = async (funilId: string, ativo: boolean) => {
    try {
      await api.put(`/api/crm/funis/${funilId}`, { ativo: !ativo });
      toast.success(`Funil ${!ativo ? 'ativado' : 'desativado'} com sucesso!`);
      await carregarFunis();
    } catch (error: any) {
      console.error('Erro ao atualizar funil:', error);
      toast.error(error.response?.data?.erro || 'Erro ao atualizar funil');
    }
  };

  // Negociação ativa sendo arrastada
  const activeDragNegociacao = activeDragId && Array.isArray(etapas)
    ? etapas.flatMap(e => Array.isArray(e.negociacoes) ? e.negociacoes : []).find(n => n.id === activeDragId)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            CRM Kanban
          </h1>
          <p className="text-white/60 mt-1">Gerencie suas negociações visualmente</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Funil */}
          {funis.length > 0 && (
            <select
              value={funilSelecionado || ''}
              onChange={(e) => setFunilSelecionado(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
            >
              <option value="">Selecione um funil...</option>
              {funis.map((funil) => (
                <option key={funil.id} value={funil.id}>
                  {funil.nome}
                </option>
              ))}
            </select>
          )}

          {/* Botão Gerenciar Funis */}
          <Button
            variant="glass"
            onClick={() => setManageFunnelsModalOpen(true)}
          >
            <Settings className="w-5 h-5" />
            Gerenciar Funis
          </Button>

          {/* Botão Nova Negociação */}
          <Button
            variant="neon"
            onClick={handleCreateDeal}
            disabled={!funilSelecionado || etapas.length === 0}
          >
            <Plus className="w-5 h-5" />
            Nova Negociação
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glass" hover={false}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-purple-600/10">
                <Users className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Negociações Abertas</p>
                <p className="text-2xl font-bold text-white">{stats.resumo.total_abertas}</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" hover={false}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/30 to-green-600/10">
                <DollarSign className="w-6 h-6 text-green-300" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Valor em Aberto</p>
                <p className="text-2xl font-bold text-white">
                  R$ {stats.valores.aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="glass" hover={false}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-cyan-600/10">
                <TrendingUp className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-white">{stats.taxas.conversao}</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" hover={false}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-600/30 to-yellow-600/10">
                <BarChart3 className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Ganho</p>
                <p className="text-2xl font-bold text-white">
                  R$ {stats.valores.ganho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Mensagem de seleção de funil */}
      {!funilSelecionado && funis.length > 0 && (
        <Card variant="glass" hover={false}>
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Selecione um funil para começar
            </h3>
            <p className="text-white/60">
              Escolha um funil no menu acima para visualizar as negociações
            </p>
          </div>
        </Card>
      )}

      {/* Mensagem de nenhum funil */}
      {funis.length === 0 && !loading && (
        <Card variant="glass" hover={false}>
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum funil encontrado
            </h3>
            <p className="text-white/60 mb-4">
              Crie seu primeiro funil de vendas para começar
            </p>
            <Button
              variant="neon"
              onClick={() => setManageFunnelsModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Criar Funil
            </Button>
          </div>
        </Card>
      )}

      {/* Kanban Board */}
      {loading && funilSelecionado ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : funilSelecionado && etapas.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {etapas.map((etapa) => (
              <KanbanColumn
                key={etapa.id}
                etapa={etapa}
                onDealClick={handleDealClick}
                onSendMessage={(id) => {
                  const deal = etapas.flatMap(e => e.negociacoes).find(n => n.id === id);
                  if (deal?.contato_id) {
                    navigate(`/conversas?contatoId=${deal.contato_id}`);
                  } else {
                    navigate('/conversas');
                  }
                }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragNegociacao && (
              <div className="opacity-50 cursor-grabbing">
                <DealCard negociacao={activeDragNegociacao} onClick={() => { }} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : funilSelecionado && etapas.length === 0 ? (
        <Card variant="glass" hover={false}>
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Este funil ainda não tem etapas
            </h3>
            <p className="text-white/60">
              Configure as etapas do funil para começar a gerenciar negociações
            </p>
          </div>
        </Card>
      ) : null}

      {/* Modal: Nova Negociação */}
      {createModalOpen && (
        <CreateDealModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleDealCreated}
          funilId={funilSelecionado}
          etapas={etapas}
        />
      )}

      {/* Modal: Detalhes da Negociação */}
      {detailsModalOpen && selectedNegociacao && (
        <DealDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          onSuccess={handleDealUpdated}
          negociacaoId={selectedNegociacao.id}
        />
      )}

      {/* Modal: Gerenciar Funis */}
      <Modal
        isOpen={manageFunnelsModalOpen}
        onClose={() => setManageFunnelsModalOpen(false)}
        title="Gerenciar Funis"
        size="lg"
      >
        <div className="space-y-6">
          {/* Formulário de novo funil */}
          <form onSubmit={handleCreateFunnel} className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white">Criar Novo Funil</h4>

            <Input
              label="Nome do Funil"
              value={newFunnelName}
              onChange={(e) => setNewFunnelName(e.target.value)}
              placeholder="Ex: Vendas B2B"
              required
            />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Descrição
              </label>
              <textarea
                value={newFunnelDescription}
                onChange={(e) => setNewFunnelDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50 transition-colors"
                placeholder="Descreva o propósito deste funil..."
              />
            </div>

            <Button
              type="submit"
              variant="neon"
              loading={creatingFunnel}
              className="w-full"
            >
              <Plus className="w-5 h-5" />
              Criar Funil
            </Button>
          </form>

          {/* Lista de funis existentes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Funis Existentes</h4>

            {funis.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-8">
                Nenhum funil criado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {funis.map((funil) => (
                  <Card key={funil.id} variant="glass" hover={false}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-white">{funil.nome}</h5>
                        {funil.descricao && (
                          <p className="text-sm text-white/60 mt-1">{funil.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${funil.ativo
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-gray-500/20 text-gray-300'
                          }`}>
                          {funil.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => handleToggleFunnelStatus(funil.id, funil.ativo)}
                        >
                          {funil.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
