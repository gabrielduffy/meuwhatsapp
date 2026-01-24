import {
    Type,
    Image as ImageIcon,
    Square,
    Minus,
    Youtube,
    Layout,
    Columns,
    Share2,
    Code,
    Share
} from 'lucide-react';
import type { BlockType } from './useEmailBuilder';


const BLOCK_TYPES = [
    { type: 'header', label: 'Cabeçalho', icon: Layout, color: 'text-purple-400' },
    { type: 'text', label: 'Texto', icon: Type, color: 'text-blue-400' },
    { type: 'image', label: 'Imagem', icon: ImageIcon, color: 'text-green-400' },
    { type: 'button', label: 'Botão', icon: Square, color: 'text-orange-400' },
    { type: 'video', label: 'Vídeo', icon: Youtube, color: 'text-red-400' },
    { type: 'divider', label: 'Divisor', icon: Minus, color: 'text-gray-400' },
    { type: 'social', label: 'Redes Sociais', icon: Share2, color: 'text-blue-500' },
    { type: 'html', label: 'Código HTML', icon: Code, color: 'text-amber-500' },
    { type: 'spacer', label: 'Espaçador', icon: Columns, color: 'text-cyan-400' },
    { type: 'footer', label: 'Rodapé', icon: Share, color: 'text-pink-400' },
];

export default function Sidebar({ onAdd }: { onAdd: (type: BlockType) => void }) {
    return (
        <aside className="w-80 border-r border-white/10 bg-gray-900 overflow-y-auto hidden lg:flex flex-col">
            <div className="p-6 border-b border-white/10 bg-gray-950/50">
                <h3 className="font-semibold text-white/90">Blocos de Conteúdo</h3>
                <p className="text-xs text-white/40 mt-1">Clique para adicionar ao canvas</p>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
                {BLOCK_TYPES.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.type}
                            onClick={() => onAdd(item.type as BlockType)}
                            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                        >
                            <div className={`p-2 rounded-lg bg-gray-950/80 mb-2 group-hover:scale-110 transition-transform ${item.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-medium text-white/60 group-hover:text-white transition-colors">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto p-6 border-t border-white/10">
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-transparent border border-purple-500/10">
                    <p className="text-xs text-purple-200/60 leading-relaxed">
                        Dica: Você pode reordenar os blocos arrastando-os no editor central.
                    </p>
                </div>
            </div>
        </aside>
    );
}
