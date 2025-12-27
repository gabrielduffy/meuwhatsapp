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
} from 'lucide-react';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import KanbanColumn from '../components/crm/KanbanColumn';
import DealCard from '../components/crm/DealCard';
import CreateDealModal from '../components/crm/CreateDealModal';
import DealDetailsModal from '../components/crm/DealDetailsModal';

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
  contato_nome?: string;
  responsavel_nome?: string;
  criado_em: string;
  entrou_etapa_em: string;
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
  const [funis, setFunis] = useState<Funil[]>([]);
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    carregarFunis();
    carregarEstatisticas();
  }, []);

  useEffect(() => {
    if (funilSelecionado) {
      carregarFunil(funilSelecionado);
    }
  }, [funilSelecionado]);

  const carregarFunis = async () => {
    try {
      const response = await api.get('/crm/funis');
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
      const response = await api.get(`/crm/funis/${funilId}`);
      const funil = response.data.funil;
      setEtapas(funil.etapas || []);
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
      toast.error('Erro ao carregar funil');
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await api.get('/crm/estatisticas');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const negociacaoId = active.id as string;
    const novaEtapaId = over.id as string;

    // Encontrar a negociação
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
      await api.put(`/crm/negociacoes/${negociacaoId}/mover`, {
        etapa_id: novaEtapaId,
      });
      toast.success('Negociação movida com sucesso');
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

  const activeDragNegociacao = activeDragId
    ? etapas.flatMap(e => e.negociacoes).find(n => n.id === activeDragId)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            CRM Kanban
          </h1>
          <p className="text-white/60 mt-1">Gerencie suas negociações visualmente</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={funilSelecionado || ''}
            onChange={(e) => setFunilSelecionado(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
          >
            {funis.map((funil) => (
              <option key={funil.id} value={funil.id}>
                {funil.nome}
              </option>
            ))}
          </select>

          <Button variant="neon" onClick={handleCreateDeal}>
            <Plus className="w-5 h-5" />
            Nova Negociação
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  R$ {stats.valores.aberto.toLocaleString('pt-BR')}
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
                  R$ {stats.valores.ganho.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
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
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragNegociacao && (
              <div className="opacity-50">
                <DealCard negociacao={activeDragNegociacao} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateDealModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleDealCreated}
          funilId={funilSelecionado}
          etapas={etapas}
        />
      )}

      {detailsModalOpen && selectedNegociacao && (
        <DealDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          onSuccess={handleDealUpdated}
          negociacaoId={selectedNegociacao.id}
        />
      )}
    </div>
  );
}
