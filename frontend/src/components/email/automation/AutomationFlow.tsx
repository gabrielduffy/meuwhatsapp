import { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    Handle,
    Position,
    BackgroundVariant,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Box,
    Send,
    Clock,
    GitBranch,
    Zap,
    Save,
    ChevronLeft,
    Trash2,
    Settings2,
    Mail
} from 'lucide-react';
import axios from 'axios';

// --- CUSTOM NODES ---

const NodeWrapper = ({ children, selected, label, icon: Icon, colorClass, typeLabel }: any) => (
    <div className={`px-4 py-3 rounded-2xl bg-gray-900 border-2 transition-all min-w-[220px] shadow-2xl ${selected ? 'border-purple-500 ring-4 ring-purple-500/20 scale-105' : 'border-white/10 hover:border-white/20'}`}>
        <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 ${colorClass}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{typeLabel}</span>
            </div>
            {selected && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
        </div>
        <div className="text-sm font-bold text-white mb-1">{label}</div>
        {children}
    </div>
);

const TriggerNode = ({ data, selected }: any) => (
    <NodeWrapper selected={selected} label={data.label} icon={Zap} colorClass="text-purple-400" typeLabel="Gatilho">
        <p className="text-[10px] text-white/40 leading-tight">Inicia o fluxo quando o evento ocorre.</p>
        <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </NodeWrapper>
);

const ActionNode = ({ data, selected }: any) => {
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        axios.get('/api/email-marketing/templates').then(r => setTemplates(r.data)).catch(() => { });
    }, []);

    const selectedTemplate = templates.find(t => t.id === data.templateId);

    return (
        <NodeWrapper selected={selected} label="Enviar E-mail" icon={Send} colorClass="text-cyan-400" typeLabel="Ação">
            <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3" />
            <div className="mt-3 space-y-2">
                <label className="text-[9px] font-bold text-white/30 uppercase">Template Selecionado</label>
                <select
                    value={data.templateId || ''}
                    onChange={(e) => data.onChange?.({ templateId: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
                >
                    <option value="">Selecione um template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {selectedTemplate && (
                    <div className="flex items-center gap-2 text-[10px] text-cyan-400/60 italic">
                        <Mail className="w-3 h-3" /> {selectedTemplate.assunto}
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3" />
        </NodeWrapper>
    );
};

const DelayNode = ({ data, selected }: any) => (
    <NodeWrapper selected={selected} label="Aguardar Tempo" icon={Clock} colorClass="text-orange-400" typeLabel="Delay">
        <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
        <div className="mt-3 flex gap-2">
            <input
                type="number"
                value={data.value || 1}
                onChange={(e) => data.onChange?.({ value: parseInt(e.target.value) })}
                className="w-16 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
            />
            <select
                value={data.unit || 'days'}
                onChange={(e) => data.onChange?.({ unit: e.target.value })}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
            >
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
            </select>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3" />
    </NodeWrapper>
);

const ConditionNode = ({ data, selected }: any) => (
    <NodeWrapper selected={selected} label="Ramificação" icon={GitBranch} colorClass="text-blue-400" typeLabel="Condição">
        <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
        <div className="mt-2 mb-4">
            <select
                value={data.conditionType || 'opened'}
                onChange={(e) => data.onChange?.({ conditionType: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
            >
                <option value="opened">Abriu o e-mail anterior</option>
                <option value="clicked">Clicou em algum link</option>
                <option value="replied">Respondeu o e-mail</option>
            </select>
        </div>
        <div className="flex justify-between items-center -mx-4 border-t border-white/5 pt-3 px-4 relative bg-black/20 rounded-b-2xl">
            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-green-500 uppercase">Sim</span>
                <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%' }} className="!bg-green-500 !w-3 !h-3" />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-red-500 uppercase">Não</span>
                <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%' }} className="!bg-red-500 !w-3 !h-3" />
            </div>
        </div>
    </NodeWrapper>
);

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
};

const initialNodes: Node[] = [
    {
        id: 'node-start',
        type: 'trigger',
        position: { x: 400, y: 100 },
        data: { label: 'Novo Lead na Lista', triggerType: 'new_lead' }
    },
];

export default function AutomationFlow({ onSave, initialData }: { onSave: (data: any) => void, initialData?: any }) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (initialData?.nodes) {
            const enrichedNodes = initialData.nodes.map((n: any) => ({
                ...n,
                data: {
                    ...n.data,
                    onChange: (updates: any) => handleNodeUpdate(n.id, updates)
                }
            }));
            setNodes(enrichedNodes);
            setEdges(initialData.edges || []);
        } else {
            const starter = {
                ...initialNodes[0],
                data: { ...initialNodes[0].data, onChange: (updates: any) => handleNodeUpdate(initialNodes[0].id, updates) }
            };
            setNodes([starter]);
        }
    }, [initialData, setNodes, setEdges]);

    const handleNodeUpdate = useCallback((id: string, updates: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...updates } };
            }
            return node;
        }));
    }, [setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2, stroke: '#8B5CF6' } }, eds)),
        [setEdges]
    );

    const addNode = (type: string) => {
        const id = `node-${Date.now()}`;
        const newNode: Node = {
            id,
            type,
            position: { x: 400, y: nodes[nodes.length - 1]?.position?.y + 250 || 350 },
            data: {
                label: type === 'action' ? 'Enviar E-mail' : type === 'delay' ? 'Aguardar' : 'Ramificar',
                onChange: (updates: any) => handleNodeUpdate(id, updates)
            },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const deleteSelected = useCallback(() => {
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => !edge.selected));
    }, [setNodes, setEdges]);

    return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col text-white font-sans overflow-hidden">
            <header className="h-20 px-8 border-b border-white/10 flex items-center justify-between bg-gray-901 backdrop-blur-2xl shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={() => window.history.back()} className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-white/5 group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <h2 className="font-black text-xl bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent italic tracking-tight">
                            Smart Automation Engine
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onSave({ nodes, edges })}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-black text-sm hover:scale-105 transition-all shadow-2xl shadow-purple-500/30"
                    >
                        <Save className="w-4 h-4" />
                        Salvar e Ativar
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex">
                <aside className="w-80 border-r border-white/10 bg-gray-900/50 p-6 flex flex-col gap-6 shrink-0 shadow-2xl z-10">
                    <div>
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Ações</h3>
                        <div className="space-y-3">
                            <button onClick={() => addNode('action')} className="w-full text-left p-4 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                                <div className="flex items-center gap-3">
                                    <Send className="w-4 h-4 text-cyan-400" />
                                    <span className="font-bold text-sm text-white">Enviar Email</span>
                                </div>
                            </button>
                            <button onClick={() => addNode('delay')} className="w-full text-left p-4 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-orange-400" />
                                    <span className="font-bold text-sm text-white">Atraso</span>
                                </div>
                            </button>
                            <button onClick={() => addNode('condition')} className="w-full text-left p-4 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                                <div className="flex items-center gap-3">
                                    <GitBranch className="w-4 h-4 text-blue-400" />
                                    <span className="font-bold text-sm text-white">Condição</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto p-5 rounded-3xl bg-gray-800 border border-white/5 space-y-4">
                        <button
                            onClick={deleteSelected}
                            className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all border border-red-500/10 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Deletar
                        </button>
                    </div>
                </aside>

                <div className="flex-1 bg-gray-950 relative overflow-hidden">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background color="#1e293b" variant={BackgroundVariant.Dots} gap={30} size={1} />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}
