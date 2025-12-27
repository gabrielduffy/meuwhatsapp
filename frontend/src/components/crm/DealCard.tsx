import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, User, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface DealCardProps {
  negociacao: {
    id: string;
    titulo: string;
    valor: number;
    prioridade: string;
    contato_nome?: string;
    responsavel_nome?: string;
    criado_em: string;
  };
  onClick: () => void;
}

export default function DealCard({ negociacao, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: negociacao.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const prioridadeCor = {
    alta: 'text-red-400 bg-red-500/10',
    media: 'text-yellow-400 bg-yellow-500/10',
    baixa: 'text-green-400 bg-green-500/10',
  }[negociacao.prioridade] || 'text-gray-400 bg-gray-500/10';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white text-sm flex-1 pr-2">
          {negociacao.titulo}
        </h4>
        {negociacao.prioridade && (
          <div className={`px-2 py-0.5 rounded text-xs font-semibold ${prioridadeCor}`}>
            {negociacao.prioridade}
          </div>
        )}
      </div>

      {/* Valor */}
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-green-400" />
        <span className="text-sm font-bold text-green-300">
          R$ {negociacao.valor.toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Contato */}
      {negociacao.contato_nome && (
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/60 truncate">{negociacao.contato_nome}</span>
        </div>
      )}

      {/* Responsável */}
      {negociacao.responsavel_nome && (
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-white/60 truncate">{negociacao.responsavel_nome}</span>
        </div>
      )}

      {/* Data */}
      <div className="flex items-center gap-2 text-xs text-white/40 mt-3 pt-3 border-t border-white/5">
        <Calendar className="w-3 h-3" />
        {new Date(negociacao.criado_em).toLocaleDateString('pt-BR')}
      </div>
    </motion.div>
  );
}
