import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Smartphone, Mail, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface DealCardProps {
  negociacao: {
    id: string;
    titulo: string;
    valor: number;
    prioridade: string;
    contato_id?: string;
    contato_nome?: string;
    contato_telefone?: string;
    contato_email?: string;
    responsavel_nome?: string;
    criado_em: string;
    etiquetas?: string[];
  };
  onClick: () => void;
  onSendMessage?: (id: string) => void;
}

const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  return phone;
};

export default function DealCard({ negociacao, onClick, onSendMessage }: DealCardProps) {
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
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-300"
    >
      {/* Badges/Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {negociacao.etiquetas?.map((tag: string, idx: number) => (
          <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {tag}
          </span>
        ))}
        {negociacao.prioridade && (
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${prioridadeCor}`}>
            {negociacao.prioridade}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-3">
        <h4 className="font-bold text-gray-900 dark:text-white text-base">
          {negociacao.contato_nome || negociacao.titulo}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {negociacao.titulo !== negociacao.contato_nome ? negociacao.titulo : 'Sem qualificação'}
        </p>
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-4">
        {negociacao.contato_telefone && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-xs">{formatPhone(negociacao.contato_telefone)}</span>
          </div>
        )}
        {negociacao.contato_email && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail className="w-3.5 h-3.5" />
            <span className="text-xs truncate">{negociacao.contato_email}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSendMessage?.(negociacao.id);
        }}
        className="w-full py-2 px-3 mb-4 flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        <MessageCircle className="w-4 h-4 text-purple-500" />
        Enviar mensagem
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-green-500" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            R$ {negociacao.valor?.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="text-[10px] text-gray-400">
          {new Date(negociacao.criado_em).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </motion.div>
  );
}
