import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DealCard from './DealCard';

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  negociacoes: any[];
}

interface KanbanColumnProps {
  etapa: Etapa;
  onDealClick: (negociacao: any) => void;
}

export default function KanbanColumn({ etapa, onDealClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: etapa.id,
  });

  const totalValor = etapa.negociacoes.reduce((sum, n) => sum + (n.valor || 0), 0);

  return (
    <div className="flex-shrink-0 w-80">
      {/* Column Header */}
      <div
        className="p-4 rounded-t-xl border-t-4"
        style={{
          borderColor: etapa.cor,
          backgroundColor: `${etapa.cor}15`,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white">{etapa.nome}</h3>
          <div className="px-2 py-1 rounded-full bg-white/10 text-xs font-semibold text-white">
            {etapa.negociacoes.length}
          </div>
        </div>
        <p className="text-sm text-white/60">
          R$ {totalValor.toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className="bg-white/5 backdrop-blur-sm border border-white/10 border-t-0 rounded-b-xl p-3 min-h-[500px] space-y-3"
      >
        <SortableContext
          items={etapa.negociacoes.map(n => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {etapa.negociacoes.map((negociacao) => (
            <DealCard
              key={negociacao.id}
              negociacao={negociacao}
              onClick={() => onDealClick(negociacao)}
            />
          ))}
        </SortableContext>

        {etapa.negociacoes.length === 0 && (
          <p className="text-center text-white/40 text-sm py-8">
            Nenhuma negociação nesta etapa
          </p>
        )}
      </div>
    </div>
  );
}
