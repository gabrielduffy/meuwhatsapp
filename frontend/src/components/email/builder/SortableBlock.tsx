import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Trash2,
    Copy,
    Youtube,
    Play,
    Mail,
    ExternalLink,
    Facebook,
    Twitter,
    Instagram,
    Linkedin
} from 'lucide-react';
import type { EmailBlock } from './useEmailBuilder';
import { useEmailBuilder } from './useEmailBuilder';
import { type CSSProperties } from 'react';

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
        addBlock(block.type, index + 1);
    };

    const renderContent = () => {
        const { styles, content } = block;

        // Build Base Styles for In-Editor Preview
        const blockStyle: CSSProperties = {
            paddingTop: `${styles.paddingTop}px`,
            paddingBottom: `${styles.paddingBottom}px`,
            paddingLeft: `${styles.paddingLeft}px`,
            paddingRight: `${styles.paddingRight}px`,
            marginTop: `${styles.marginTop}px`,
            marginBottom: `${styles.marginBottom}px`,
            backgroundColor: styles.backgroundColor,
            textAlign: styles.textAlign || 'left',
            color: styles.color,
            fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
            fontWeight: styles.fontWeight || 'normal',
            fontFamily: styles.fontFamily || 'Inter, sans-serif',
            lineHeight: styles.lineHeight || 1.5,
            letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
            borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined,
            borderWidth: styles.borderWidth ? `${styles.borderWidth}px` : undefined,
            borderColor: styles.borderColor || 'transparent',
            borderStyle: styles.borderStyle || 'none',
            width: styles.width || '100%',
            maxWidth: styles.maxWidth || '100%',
            boxSizing: 'border-box' as const,
        };

        const containerStyle: CSSProperties = {
            display: 'flex',
            justifyContent:
                styles.textAlign === 'center' ? 'center' :
                    styles.textAlign === 'right' ? 'flex-end' : 'flex-start',
            width: '100%'
        };

        switch (block.type) {
            case 'text':
                return (
                    <div style={blockStyle} className="prose max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: content.html }} />
                );
            case 'image':
                return (
                    <div style={containerStyle}>
                        <div style={blockStyle}>
                            <div className="relative group/img">
                                {content.url ? (
                                    <img
                                        src={content.url}
                                        alt={content.alt}
                                        className="w-full h-auto block"
                                        style={{ borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined }}
                                    />
                                ) : (
                                    <div className="w-full aspect-video bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                        <Mail className="w-12 h-12 text-gray-200" />
                                        <p className="text-xs text-gray-400 mt-2">Nenhuma imagem carregada</p>
                                    </div>
                                )}
                                {content.link && (
                                    <div className="absolute top-2 right-2 p-1 bg-white/80 rounded shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3 h-3 text-gray-900" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'button':
                return (
                    <div style={containerStyle}>
                        <a
                            href={content.url}
                            className="inline-block transition-all shadow-sm hover:brightness-110 active:scale-95 no-underline"
                            style={{
                                ...blockStyle,
                                display: 'inline-block',
                                width: styles.width === '100%' ? '100%' : 'auto',
                                cursor: 'default'
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
                        <hr style={{ border: 'none', borderTop: `${content.height || 1}px solid ${content.color || '#e2e8f0'}`, margin: 0 }} />
                    </div>
                );
            case 'spacer':
                return (
                    <div style={{ ...blockStyle, height: `${styles.paddingTop + styles.paddingBottom}px`, padding: 0 }} />
                );
            case 'header':
                return (
                    <div style={{ ...blockStyle, borderBottom: '1px solid #f1f5f9' }}>
                        <div className="flex items-center gap-4">
                            {content.logoUrl && <img src={content.logoUrl} alt="Logo" className="h-8" />}
                            <h1 className="text-xl font-bold" style={{ color: styles.color }}>{content.title}</h1>
                        </div>
                    </div>
                );
            case 'video':
                return (
                    <div style={containerStyle}>
                        <div style={blockStyle}>
                            <div className="relative aspect-video bg-gray-900 rounded-xl flex items-center justify-center overflow-hidden border border-gray-800 shadow-xl group/vid">
                                {content.thumbnail ? (
                                    <img src={content.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                                )}
                                <div className="relative z-10 w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover/vid:scale-110 transition-transform">
                                    <Play className="w-8 h-8 text-white fill-current" />
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/5 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                                    <p className="text-[10px] text-white/60 uppercase font-black tracking-widest leading-none mb-1">Preview de Vídeo</p>
                                    <p className="text-xs text-white truncate">{content.url || 'Nenhum link configurado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'social':
                const socialIcons = [
                    { id: 'facebook', icon: Facebook, color: '#1877F2' },
                    { id: 'twitter', icon: Twitter, color: '#1DA1F2' },
                    { id: 'instagram', icon: Instagram, color: '#E4405F' },
                    { id: 'linkedin', icon: Linkedin, color: '#0A66C2' },
                    { id: 'youtube', icon: Youtube, color: '#FF0000' },
                ];
                return (
                    <div style={containerStyle}>
                        <div style={{ ...blockStyle, display: 'flex', gap: `${content.spacing || 15}px`, justifyContent: content.align || 'center', flexWrap: 'wrap' }}>
                            {socialIcons.map(item => {
                                const url = content[item.id];
                                if (!url && isSelected) { // Mostra opaco no editor se não configurado
                                    return (
                                        <div key={item.id} style={{ opacity: 0.2, cursor: 'not-allowed' }}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                    );
                                }
                                if (!url) return null;
                                return (
                                    <a key={item.id} href={url} target="_blank" rel="noopener noreferrer" style={{ color: item.color }}>
                                        <item.icon className="w-6 h-6 hover:scale-110 transition-transform" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'html':
                return (
                    <div style={blockStyle} dangerouslySetInnerHTML={{ __html: content.code || '<div>Instância de HTML Vazia</div>' }} />
                );
            case 'footer':
                return (
                    <div style={blockStyle} className="border-t border-gray-100 mt-8 pt-8 text-center">
                        <p className="text-xs text-gray-400 mb-4">{content.companyName || 'Sua Empresa'} &copy; 2026</p>
                        <div className="flex justify-center gap-4">
                            <span className="text-[10px] text-blue-500 underline uppercase font-bold cursor-pointer">Unsubscribe</span>
                            <span className="text-[10px] text-blue-500 underline uppercase font-bold cursor-pointer">Preferências</span>
                        </div>
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
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`group relative border-2 transition-all duration-300 ${isSelected ? 'border-purple-500 ring-8 ring-purple-500/5 shadow-2xl scale-[1.01]' : 'border-transparent hover:border-purple-500/20'
                } ${isDragging ? 'opacity-50 grayscale scale-95' : ''}`}
        >
            {/* Tooltip Ações */}
            {isSelected && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900 text-white p-1.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[60] border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-2 hover:bg-white/10 rounded-xl cursor-grab active:cursor-grabbing group/btn"
                        title="Arrastar"
                    >
                        <GripVertical className="w-4 h-4 text-white/40 group-hover:text-white" />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button onClick={handleDuplicate} className="p-2 hover:bg-white/10 rounded-xl group/btn" title="Duplicar">
                        <Copy className="w-4 h-4 text-white/40 group-hover:text-white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-2 hover:bg-red-500 rounded-xl group/btn" title="Excluir">
                        <Trash2 className="w-4 h-4 text-white/40 group-hover:text-white" />
                    </button>
                </div>
            )}

            {renderContent()}
        </div>
    );
}
