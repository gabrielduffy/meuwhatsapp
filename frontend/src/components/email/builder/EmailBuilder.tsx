import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import {
    Layout,
    ChevronLeft,
    Save,
    Code,
    Box,
    Smartphone,
    Monitor
} from 'lucide-react';
import { useEmailBuilder } from './useEmailBuilder';
import SortableBlock from './SortableBlock';
import PropertiesPanel from './PropertiesPanel';
import Sidebar from './Sidebar';

export default function EmailBuilder({ onSave, initialData }: { onSave: (data: any) => void, initialData?: any }) {
    const { blocks, setBlocks, moveBlock, selectedBlockId, setSelectedBlockId, addBlock } = useEmailBuilder();
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'code'>('edit');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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

    // Inicializar dados se existirem (Sync com o Banco)
    useEffect(() => {
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
            setBlocks(initialData);
        } else if (!initialData) {
            setBlocks([]);
        }
        setSelectedBlockId(null);
    }, [initialData, setBlocks, setSelectedBlockId]);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = blocks.findIndex((b) => b.id === active.id);
            const newIndex = blocks.findIndex((b) => b.id === over.id);
            moveBlock(oldIndex, newIndex);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col text-white font-sans">
            {/* Header */}
            <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-gray-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <h2 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Visual Builder
                    </h2>
                </div>

                {/* Device Selector (Solo em Preview) */}
                {viewMode === 'preview' && (
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setPreviewDevice('desktop')}
                            className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPreviewDevice('mobile')}
                            className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-4 py-1.5 rounded-md text-sm transition-all font-bold ${viewMode === 'edit' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-4 py-1.5 rounded-md text-sm transition-all font-bold ${viewMode === 'preview' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`px-4 py-1.5 rounded-md text-sm transition-all font-bold ${viewMode === 'code' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <Code className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => onSave(blocks)}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Save className="w-4 h-4" />
                        Salvar
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Blocos (Esconder se não for Edit) */}
                {viewMode === 'edit' && <Sidebar onAdd={addBlock} />}

                {/* Main Canvas */}
                <main className={`flex-1 overflow-auto bg-gray-950 transition-all duration-500 flex justify-center ${viewMode === 'preview' ? 'p-4 md:p-12' : 'p-12'}`}>
                    {viewMode === 'code' ? (
                        <div className="w-full h-full p-8 max-w-4xl mx-auto">
                            <div className="bg-gray-900 rounded-3xl border border-white/10 p-6 h-full font-mono text-sm overflow-auto text-cyan-400">
                                <pre>{JSON.stringify(blocks, null, 2)}</pre>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-500 ${previewDevice === 'mobile' && viewMode === 'preview' ? 'w-[375px]' : 'w-full max-w-[650px]'
                                }`}
                            style={{ backgroundColor: '#ffffff', minHeight: '850px' }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-blue-500 opacity-50" />

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={blocks.map(b => b.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="p-0 transition-all duration-500">
                                        <AnimatePresence initial={false}>
                                            {blocks.length === 0 ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center select-none">
                                                    <Layout className="w-12 h-12 text-gray-200 mb-4" />
                                                    <h3 className="text-gray-900 font-black text-xl mb-2">Canvas Vazio</h3>
                                                    <p className="text-gray-400 text-sm max-w-[250px]">Adicione blocos da sidebar para começar.</p>
                                                </div>
                                            ) : (
                                                blocks.map((block) => (
                                                    <SortableBlock
                                                        key={block.id}
                                                        block={block}
                                                        isSelected={selectedBlockId === block.id && viewMode === 'edit'}
                                                        onSelect={() => viewMode === 'edit' && setSelectedBlockId(block.id)}
                                                    />
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </main>

                {/* Properties Panel (Esconder se não for Edit) */}
                {viewMode === 'edit' && <PropertiesPanel />}
            </div>
        </div>
    );
}
