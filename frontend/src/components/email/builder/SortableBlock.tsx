import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Trash2,
    Copy,
    Youtube
} from 'lucide-react';
import type { EmailBlock } from './useEmailBuilder';
import { useEmailBuilder } from './useEmailBuilder';
import type { CSSProperties } from 'react';


interface Props {
    block: EmailBlock;
    isSelected: boolean;
    onSelect: () => void;
}

export default function SortableBlock({ block, isSelected, onSelect }: Props) {
    const { removeBlock, addBlock, blocks } = useEmailBuilder();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const index = blocks.findIndex(b => b.id === block.id);
        // addBlock internally handles new ID and state
        // For simplicity here, we just call addBlock with the same type at index+1
        addBlock(block.type, index + 1);
    };

    const renderContent = () => {
        const { styles, content } = block;
        const blockStyle: React.CSSProperties = {
            paddingTop: `${styles.paddingTop}px`,
            paddingBottom: `${styles.paddingBottom}px`,
            paddingLeft: `${styles.paddingLeft}px`,
            paddingRight: `${styles.paddingRight}px`,
            backgroundColor: styles.backgroundColor,
            textAlign: styles.textAlign || 'left',
            color: styles.color,
            fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
        };

        switch (block.type) {
            case 'text':
                return (
                    <div style={blockStyle} dangerouslySetInnerHTML={{ __html: content.html }} />
                );
            case 'image':
                return (
                    <div style={blockStyle}>
                        <img
                            src={content.url}
                            alt={content.alt}
                            className="w-full h-auto rounded-lg"
                            style={{ borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined }}
                        />
                    </div>
                );
            case 'button':
                return (
                    <div style={blockStyle}>
                        <a
                            href={content.url}
                            className="inline-block px-8 py-3 font-bold transition-all"
                            style={{
                                backgroundColor: styles.backgroundColor,
                                color: styles.color,
                                borderRadius: `${styles.borderRadius || 4}px`,
                            }}
                            onClick={(e) => e.preventDefault()}
                        >
                            {content.text}
                        </a>
                    </div>
                );
            case 'divider':
                return (
                    <div style={blockStyle}>
                        <hr border-top="1px solid #e2e8f0" />
                    </div>
                );
            case 'spacer':
                return (
                    <div style={{ ...blockStyle, height: `${styles.paddingTop + styles.paddingBottom}px` }} />
                );
            case 'header':
                return (
                    <div style={{ ...blockStyle, borderBottom: '1px solid #f1f5f9' }}>
                        {content.logoUrl ? <img src={content.logoUrl} alt="Logo" className="h-8 mx-auto" /> : <h1 className="text-xl font-bold">{content.title}</h1>}
                    </div>
                );
            case 'video':
                return (
                    <div style={blockStyle}>
                        <div className="relative aspect-video bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-black/20" />
                            <Youtube className="w-12 h-12 text-red-600 relative z-10" />
                            {content.thumbnail && <img src={content.thumbnail} className="absolute inset-0 w-full h-full object-cover" />}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-center">Preview de Vídeo</p>
                    </div>
                );
            default:
                return <div style={blockStyle}>Tipo de bloco não suportado</div>;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={`group relative border-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-transparent hover:border-purple-500/30'
                } ${isDragging ? 'opacity-50 grayscale' : ''}`}
        >
            {/* Tooltip Ações */}
            {isSelected && (
                <div className="absolute -top-10 right-0 flex items-center gap-1 bg-purple-600 text-white p-1 rounded-lg shadow-xl z-[60]">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-white/20 rounded cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button onClick={handleDuplicate} className="p-1 hover:bg-white/20 rounded">
                        <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 hover:bg-red-500 rounded">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            {renderContent()}
        </div>
    );
}
