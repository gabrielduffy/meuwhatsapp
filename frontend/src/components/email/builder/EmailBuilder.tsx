import { useState } from 'react';
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
    Code
} from 'lucide-react';
import { useEmailBuilder } from './useEmailBuilder';
import SortableBlock from './SortableBlock';
import PropertiesPanel from './PropertiesPanel';
import Sidebar from './Sidebar';

export default function EmailBuilder({ onSave, initialData }: { onSave: (data: any) => void, initialData?: any }) {
    const { blocks, setBlocks, moveBlock, selectedBlockId, setSelectedBlockId, addBlock } = useEmailBuilder();
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'code'>('edit');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Inicializar dados se existirem
    useState(() => {
        if (initialData && initialData.length > 0) {
            setBlocks(initialData);
        }
    });

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
                        Construtor Visual de E-mail
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${viewMode === 'edit' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-white/40 hover:text-white'}`}
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${viewMode === 'preview' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-white/40 hover:text-white'}`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-all ${viewMode === 'code' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-white/40 hover:text-white'}`}
                        >
                            <Code className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => onSave(blocks)}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Template
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Blocos */}
                <Sidebar onAdd={addBlock} />

                {/* Main Canvas */}
                <main className="flex-1 overflow-auto bg-gray-950 p-12 flex justify-center">
                    <div
                        className="w-full max-w-[600px] min-h-[800px] bg-white rounded-xl shadow-2xl relative overflow-hidden"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={blocks.map(b => b.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="p-0">
                                    <AnimatePresence>
                                        {blocks.length === 0 ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <Layout className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-gray-400 font-medium">Seu template está vazio</p>
                                                <p className="text-gray-300 text-sm">Arraste ou clique em blocos da barra lateral para começar a construir seu e-mail.</p>
                                            </div>
                                        ) : (
                                            blocks.map((block) => (
                                                <SortableBlock
                                                    key={block.id}
                                                    block={block}
                                                    isSelected={selectedBlockId === block.id}
                                                    onSelect={() => setSelectedBlockId(block.id)}
                                                />
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </main>

                {/* Properties Panel */}
                <PropertiesPanel />
            </div>
        </div>
    );
}
