import React from 'react';
import {
    Settings2,
    Trash2,
    Palette,
    Layout,
    Type,
    Link as LinkIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Smartphone,
    Monitor,
    Type as TypeIcon,
    ImageIcon,
    Square as ButtonIcon
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useEmailBuilder } from './useEmailBuilder';
import { motion, AnimatePresence } from 'framer-motion';

export default function PropertiesPanel() {
    const { blocks, selectedBlockId, updateBlock, removeBlock } = useEmailBuilder();
    const [activeTab, setActiveTab] = React.useState<'content' | 'style'>('content');
    const [showPicker, setShowPicker] = React.useState<'bg' | 'text' | null>(null);

    const block = blocks.find((b) => b.id === selectedBlockId);

    if (!block) {
        return (
            <aside className="w-80 border-l border-white/10 bg-gray-901 flex flex-col items-center justify-center p-8 text-center bg-gray-900/50">
                <div className="p-4 rounded-full bg-white/5 mb-4 animate-pulse">
                    <Settings2 className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm font-medium">Selecione um bloco no canvas para editar suas propriedades.</p>
                <div className="mt-8 p-4 rounded-xl bg-purple-600/5 border border-purple-500/10 text-[11px] text-white/30 leading-relaxed">
                    Dica: Você pode alterar cores, fontes, espaçamentos e links de cada elemento do seu email.
                </div>
            </aside>
        );
    }

    const updateContent = (updates: any) => {
        updateBlock(block.id, { content: { ...block.content, ...updates } });
    };

    const updateStyles = (updates: any) => {
        updateBlock(block.id, { styles: { ...block.styles, ...updates } });
    };

    return (
        <aside className="w-80 border-l border-white/10 bg-gray-900 flex flex-col overflow-hidden max-h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-950/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
                        {block.type === 'text' && <TypeIcon className="w-4 h-4" />}
                        {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                        {block.type === 'button' && <ButtonIcon className="w-4 h-4" />}
                        {!['text', 'image', 'button'].includes(block.type) && <Layout className="w-4 h-4" />}
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                        {block.type}
                    </h3>
                </div>
                <button onClick={() => removeBlock(block.id)} className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-950 p-1 m-4 rounded-xl border border-white/5 shadow-inner">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'content' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    Conteúdo
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'style' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    Estilo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                {activeTab === 'content' ? (
                    <div className="space-y-6">
                        {/* Campos Dinâmicos baseado no tipo */}
                        {block.type === 'text' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Texto HTML</label>
                                    <span className="text-[10px] text-purple-400 font-bold uppercase ring-1 ring-purple-400/20 px-1.5 rounded">Editor Ativo</span>
                                </div>
                                <textarea
                                    value={block.content.html}
                                    onChange={(e) => updateContent({ html: e.target.value })}
                                    rows={12}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[13px] text-white/80 font-mono focus:border-purple-500 outline-none leading-relaxed shadow-inner"
                                    placeholder="Escreva seu conteúdo aqui..."
                                />
                            </div>
                        )}

                        {block.type === 'image' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">URL da Imagem</label>
                                    <input
                                        type="text"
                                        value={block.content.url}
                                        onChange={(e) => updateContent({ url: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Texto Alternativo (Alt)</label>
                                    <input
                                        type="text"
                                        value={block.content.alt}
                                        onChange={(e) => updateContent({ alt: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                        placeholder="Descrição para leitores de tela"
                                    />
                                </div>
                            </div>
                        )}

                        {(block.type === 'button' || block.type === 'image') && (
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                    <LinkIcon className="w-3 h-3" /> Link de Destino
                                </label>
                                <input
                                    type="text"
                                    value={block.content.url}
                                    onChange={(e) => updateContent({ url: e.target.value })}
                                    placeholder="https://sua-pagina.com"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        )}

                        {block.type === 'button' && (
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Texto do Botão</label>
                                <input
                                    type="text"
                                    value={block.content.text}
                                    onChange={(e) => updateContent({ text: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                    placeholder="Ex: Baixar agora"
                                />
                            </div>
                        )}

                        {block.type === 'header' && (
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Nome da Marca</label>
                                <input
                                    type="text"
                                    value={block.content.title}
                                    onChange={(e) => updateContent({ title: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Alinhamento */}
                        {(block.type === 'text' || block.type === 'button' || block.type === 'header') && (
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Alinhamento Horizontal</label>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                    <button onClick={() => updateStyles({ textAlign: 'left' })} className={`flex-1 p-2 rounded-lg transition-all ${block.styles.textAlign === 'left' ? 'bg-purple-600 shadow-lg text-white' : 'text-white/20'}`}><AlignLeft className="w-4 h-4 mx-auto" /></button>
                                    <button onClick={() => updateStyles({ textAlign: 'center' })} className={`flex-1 p-2 rounded-lg transition-all ${block.styles.textAlign === 'center' ? 'bg-purple-600 shadow-lg text-white' : 'text-white/20'}`}><AlignCenter className="w-4 h-4 mx-auto" /></button>
                                    <button onClick={() => updateStyles({ textAlign: 'right' })} className={`flex-1 p-2 rounded-lg transition-all ${block.styles.textAlign === 'right' ? 'bg-purple-600 shadow-lg text-white' : 'text-white/20'}`}><AlignRight className="w-4 h-4 mx-auto" /></button>
                                </div>
                            </div>
                        )}

                        {/* Espaçamento */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Padding Vertical</label>
                                    <span className="text-[10px] text-white font-bold">{block.styles.paddingTop}px</span>
                                </div>
                                <input
                                    type="range" min="0" max="120"
                                    value={block.styles.paddingTop}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateStyles({ paddingTop: val, paddingBottom: val });
                                    }}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            {block.styles.borderRadius !== undefined && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Arredondamento</label>
                                        <span className="text-[10px] text-white font-bold">{block.styles.borderRadius}px</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100"
                                        value={block.styles.borderRadius}
                                        onChange={(e) => updateStyles({ borderRadius: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Cores */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Cores do Elemento</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowPicker(showPicker === 'bg' ? null : 'bg')}
                                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${showPicker === 'bg' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                                >
                                    <div className="w-full aspect-video rounded-lg border border-white/10 mb-2 shadow-lg" style={{ backgroundColor: block.styles.backgroundColor }} />
                                    <span className="text-[10px] text-white/40 font-bold uppercase">Cor de Fundo</span>
                                </button>

                                {block.styles.color !== undefined && (
                                    <button
                                        onClick={() => setShowPicker(showPicker === 'text' ? null : 'text')}
                                        className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${showPicker === 'text' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                                    >
                                        <div className="w-full aspect-video rounded-lg border border-white/10 mb-2 shadow-lg" style={{ backgroundColor: block.styles.color }} />
                                        <span className="text-[10px] text-white/40 font-bold uppercase">Cor do Texto</span>
                                    </button>
                                )}
                            </div>

                            <AnimatePresence>
                                {showPicker && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-black/60 rounded-2xl border border-white/10 p-4"
                                    >
                                        <HexColorPicker
                                            color={showPicker === 'bg' ? block.styles.backgroundColor : (block.styles.color || '#ffffff')}
                                            onChange={(c) => updateStyles(showPicker === 'bg' ? { backgroundColor: c } : { color: c })}
                                            className="!w-full !h-32"
                                        />
                                        <div className="mt-4 flex gap-2">
                                            {['#ffffff', '#000000', '#8B5CF6', '#06B6D4', '#EF4444', '#10B981'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => updateStyles(showPicker === 'bg' ? { backgroundColor: c } : { color: c })}
                                                    className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Typography Preview */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-3 text-white/40">
                                <Palette className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Preview de Tipografia</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-white/30 block mb-2">Tamanho da Fonte ({block.styles.fontSize || 16}px)</label>
                                    <input
                                        type="range" min="8" max="72"
                                        value={block.styles.fontSize || 16}
                                        onChange={(e) => updateStyles({ fontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
