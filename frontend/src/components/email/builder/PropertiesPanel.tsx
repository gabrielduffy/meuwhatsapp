import React from 'react';
import {
    Settings2,
    Trash2,
    Palette,
    Layout,
    Type as TypeIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Maximize2,
    Image as ImageIcon,
    Square as ButtonIcon,
    Type,
    Youtube,
    Box,
    ChevronDown,
    Layers,
    ChevronRight
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useEmailBuilder } from './useEmailBuilder';
import { motion, AnimatePresence } from 'framer-motion';

const FONT_FAMILIES = [
    { label: 'Inter (Sans)', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Georgia (Serif)', value: 'Georgia, serif' },
    { label: 'Mono', value: 'ui-monospace, monospace' },
    { label: 'Dancing Script', value: '"Dancing Script", cursive' },
];

export default function PropertiesPanel() {
    const { blocks, selectedBlockId, updateBlock, removeBlock } = useEmailBuilder();
    const [activeTab, setActiveTab] = React.useState<'content' | 'style'>('content');
    const [showPicker, setShowPicker] = React.useState<'bg' | 'text' | 'border' | null>(null);
    const [expandedSections, setExpandedSections] = React.useState<string[]>(['basic', 'typography', 'spacing', 'border']);

    const block = blocks.find((b) => b.id === selectedBlockId);

    if (!block) {
        return (
            <aside className="w-80 border-l border-white/10 bg-gray-901 flex flex-col items-center justify-center p-8 text-center bg-gray-900/50">
                <div className="p-4 rounded-full bg-white/5 mb-4 animate-pulse">
                    <Settings2 className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 text-sm font-medium">Selecione um bloco no canvas para editar suas propriedades.</p>
            </aside>
        );
    }

    const updateContent = (updates: any) => {
        updateBlock(block.id, { content: { ...block.content, ...updates } });
    };

    const updateStyles = (updates: any) => {
        updateBlock(block.id, { styles: { ...block.styles, ...updates } });
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const CollapsibleSection = ({ id, label, icon: Icon, children }: any) => {
        const isExpanded = expandedSections.includes(id);
        return (
            <div className="border-b border-white/5">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all group"
                >
                    <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isExpanded ? 'text-purple-400' : 'text-white/20'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isExpanded ? 'text-white' : 'text-white/40'}`}>
                            {label}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronRight className="w-3 h-3 text-white/20" />}
                </button>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden px-4 pb-6 space-y-4"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <aside className="w-80 border-l border-white/10 bg-gray-900 flex flex-col overflow-hidden max-h-full shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-950/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
                        {block.type === 'text' && <TypeIcon className="w-4 h-4" />}
                        {block.type === 'image' && <ImageIcon className="w-4 h-4" />}
                        {block.type === 'button' && <ButtonIcon className="w-4 h-4" />}
                        {block.type === 'video' && <Youtube className="w-4 h-4" />}
                        {!['text', 'image', 'button', 'video'].includes(block.type) && <Layout className="w-4 h-4" />}
                    </div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-widest leading-none">Configurações</h3>
                </div>
                <button onClick={() => removeBlock(block.id)} className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex bg-gray-950 p-1 m-4 rounded-2xl border border-white/5 shadow-inner">
                <button onClick={() => setActiveTab('content')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'content' ? 'bg-purple-600 text-white' : 'text-white/30'}`}>Conteúdo</button>
                <button onClick={() => setActiveTab('style')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'style' ? 'bg-purple-600 text-white' : 'text-white/30'}`}>Design</button>
            </div>

            <div className="flex-1 overflow-y-auto pb-12 scrollbar-thin scrollbar-thumb-white/10">
                {activeTab === 'content' ? (
                    <div>
                        <CollapsibleSection id="basic" label="Propriedades" icon={Box}>
                            {block.type === 'text' && (
                                <textarea
                                    value={block.content.html}
                                    onChange={(e) => updateContent({ html: e.target.value })}
                                    rows={10}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[12px] text-white/80 font-mono"
                                />
                            )}
                            {block.type === 'image' && (
                                <div className="space-y-4">
                                    <input value={block.content.url} onChange={(e) => updateContent({ url: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" placeholder="URL da Imagem" />
                                    <input value={block.content.link} onChange={(e) => updateContent({ link: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" placeholder="Link (Opcional)" />
                                </div>
                            )}
                            {block.type === 'video' && (
                                <div className="space-y-4">
                                    <input value={block.content.url} onChange={(e) => updateContent({ url: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" placeholder="Link do Video (YT/Vimeo)" />
                                    <input value={block.content.thumbnail} onChange={(e) => updateContent({ thumbnail: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" placeholder="Thumbnail URL" />
                                </div>
                            )}
                            {block.type === 'button' && (
                                <div className="space-y-4">
                                    <input value={block.content.text} onChange={(e) => updateContent({ text: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                    <input value={block.content.url} onChange={(e) => updateContent({ url: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                </div>
                            )}
                        </CollapsibleSection>
                    </div>
                ) : (
                    <div>
                        <CollapsibleSection id="typography" label="Tipografia" icon={Type}>
                            <div className="space-y-4">
                                <select value={block.styles.fontFamily} onChange={(e) => updateStyles({ fontFamily: e.target.value })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white">
                                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" value={block.styles.fontSize} onChange={(e) => updateStyles({ fontSize: parseInt(e.target.value) })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                    <input type="number" step="0.1" value={block.styles.lineHeight} onChange={(e) => updateStyles({ lineHeight: parseFloat(e.target.value) })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border-white/10">
                                    {[{ id: 'left', icon: AlignLeft }, { id: 'center', icon: AlignCenter }, { id: 'right', icon: AlignRight }, { id: 'justify', icon: AlignJustify }].map(item => (
                                        <button key={item.id} onClick={() => updateStyles({ textAlign: item.id as any })} className={`flex-1 p-2 rounded-lg ${block.styles.textAlign === item.id ? 'bg-purple-600 text-white' : 'text-white/20'}`}>
                                            <item.icon className="w-3.5 h-3.5 mx-auto" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection id="spacing" label="Espaçamento" icon={Maximize2}>
                            <div className="grid grid-cols-2 gap-4">
                                {['paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'].map(field => (
                                    <div key={field}>
                                        <label className="text-[9px] font-bold text-white/20 uppercase block mb-1">{field}</label>
                                        <input type="number" value={(block.styles as any)[field]} onChange={(e) => updateStyles({ [field]: parseInt(e.target.value) })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                    </div>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection id="border" label="Bordas" icon={ButtonIcon}>
                            <div className="space-y-4">
                                <input type="range" min="0" max="100" value={block.styles.borderRadius || 0} onChange={(e) => updateStyles({ borderRadius: parseInt(e.target.value) })} className="w-full accent-purple-500" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" value={block.styles.borderWidth || 0} onChange={(e) => updateStyles({ borderWidth: parseInt(e.target.value) })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white" />
                                    <select value={block.styles.borderStyle} onChange={(e) => updateStyles({ borderStyle: e.target.value as any })} className="w-full bg-black/40 border-white/10 rounded-xl p-2 text-xs text-white">
                                        <option value="none">None</option>
                                        <option value="solid">Solid</option>
                                        <option value="dashed">Dashed</option>
                                        <option value="dotted">Dotted</option>
                                    </select>
                                </div>
                            </div>
                        </CollapsibleSection>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowPicker('bg')} className={`p-3 rounded-2xl border transition-all ${showPicker === 'bg' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-black/40'}`}>
                                    <div className="w-full h-8 rounded-lg" style={{ backgroundColor: block.styles.backgroundColor }} />
                                    <span className="text-[9px] font-bold text-white/40 uppercase">Fundo</span>
                                </button>
                                <button onClick={() => setShowPicker('text')} className={`p-3 rounded-2xl border transition-all ${showPicker === 'text' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-black/40'}`}>
                                    <div className="w-full h-8 rounded-lg" style={{ backgroundColor: block.styles.color }} />
                                    <span className="text-[9px] font-bold text-white/40 uppercase">Texto</span>
                                </button>
                            </div>
                            {showPicker && (
                                <div className="mt-4">
                                    <HexColorPicker
                                        color={showPicker === 'bg' ? block.styles.backgroundColor : block.styles.color}
                                        onChange={(c) => updateStyles(showPicker === 'bg' ? { backgroundColor: c } : { color: c })}
                                        className="!w-full !h-32"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
