import { useCallback } from 'react';
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
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Box,
    Send,
    Clock,
    GitBranch,
    Zap,
    Save,
    ChevronLeft
} from 'lucide-react';


// --- CUSTOM NODES ---

const TriggerNode = ({ data }: any) => (
    <div className="px-4 py-3 rounded-xl bg-purple-600 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Gatilho</span>
        </div>
        <div className="text-sm font-bold">{data.label}</div>
        <Handle type="source" position={Position.Bottom} className="!bg-purple-300 !w-3 !h-3" />
    </div>
);

const ActionNode = ({ data }: any) => (
    <div className="px-4 py-3 rounded-xl bg-gray-900 border-2 border-white/10 shadow-xl text-white min-w-[200px] hover:border-purple-500/50 transition-all">
        <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">Ação: Enviar Email</span>
        </div>
        <div className="text-sm font-semibold truncate">{data.templateName || 'Selecionar Template...'}</div>
        <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
);

const DelayNode = ({ data }: any) => (
    <div className="px-4 py-3 rounded-xl bg-gray-900 border-2 border-white/10 shadow-xl text-white min-w-[150px] flex flex-col items-center">
        <Handle type="target" position={Position.Top} className="!bg-white/30 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-1 text-orange-400">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Aguardar</span>
        </div>
        <div className="text-sm font-bold">{data.duration || '2 dias'}</div>
        <Handle type="source" position={Position.Bottom} className="!bg-white/30 !w-3 !h-3" />
    </div>
);

const ConditionNode = ({ data }: any) => (
    <div className="px-4 py-3 rounded-xl bg-gray-900 border-2 border-white/10 shadow-xl text-white min-w-[220px]">
        <Handle type="target" position={Position.Top} className="!bg-white/30 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-2 text-blue-400">
            <GitBranch className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Condição</span>
        </div>
        <div className="text-sm font-semibold mb-3">{data.condition || 'O e-mail anterior foi aberto?'}</div>

        <div className="flex justify-between items-center -mx-4 border-t border-white/5 pt-2 px-4 relative">
            <div className="text-[10px] font-bold text-green-400 uppercase">Sim</div>
            <div className="text-[10px] font-bold text-red-400 uppercase">Não</div>

            <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%' }} className="!bg-green-500 !w-3 !h-3" />
            <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%' }} className="!bg-red-500 !w-3 !h-3" />
        </div>
    </div>
);

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
};

const initialNodes: Node[] = [
    {
        id: 'start',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Novo Lead Capturado' }
    },
];

const initialEdges: Edge[] = [];

export default function AutomationFlow({ onSave, initialData }: { onSave: (data: any) => void, initialData?: any }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const addNode = (type: string) => {
        const id = `${type}-${Date.now()}`;
        const newNode: Node = {
            id,
            type,
            position: { x: Math.random() * 400, y: 200 },
            data: { label: `Novo ${type}`, templateName: '', duration: '1 dia' },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col text-white">
            {/* Header */}
            <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-gray-900/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <h2 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Fluxo de Automação
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onSave({ nodes, edges })}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Fluxo
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex">
                {/* Toolbox Sidebar */}
                <aside className="w-72 border-r border-white/10 bg-gray-900 p-6 flex flex-col gap-4 shrink-0">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Adicionar Nós</h3>

                    <button onClick={() => addNode('action')} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-400/5 group transition-all text-left">
                        <div className="p-2 bg-cyan-400/10 rounded-lg group-hover:bg-cyan-400/20 transition-colors">
                            <Send className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Enviar Email</p>
                            <p className="text-[10px] text-white/40">Step de envio de template</p>
                        </div>
                    </button>

                    <button onClick={() => addNode('delay')} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-orange-400/50 hover:bg-orange-400/5 group transition-all text-left">
                        <div className="p-2 bg-orange-400/10 rounded-lg group-hover:bg-orange-400/20 transition-colors">
                            <Clock className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Aguardar</p>
                            <p className="text-[10px] text-white/40">Pausa na sequência</p>
                        </div>
                    </button>

                    <button onClick={() => addNode('condition')} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-blue-400/5 group transition-all text-left">
                        <div className="p-2 bg-blue-400/10 rounded-lg group-hover:bg-blue-400/20 transition-colors">
                            <GitBranch className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Condição</p>
                            <p className="text-[10px] text-white/40">Ramificação se/então</p>
                        </div>
                    </button>

                    <div className="mt-auto p-4 rounded-xl bg-purple-600/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2 text-purple-300">
                            <Box className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">Como funciona</span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed">
                            Plugue os nós clicando e arrastando entre as conexões. Os eventos fluem de cima para baixo seguindo as regras definidas.
                        </p>
                    </div>
                </aside>

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-950 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-dot-pattern"
                    >
                        <Background color="#1e293b" variant={BackgroundVariant.Dots} gap={20} size={1} />
                        <Controls className="!bg-gray-800 !border-white/10 !fill-white" />
                        <MiniMap
                            nodeColor={(n: any) => {
                                if (n.type === 'trigger') return '#9333ea';
                                if (n.type === 'condition') return '#2563eb';
                                return '#1f2937';
                            }}
                            maskColor="rgba(0, 0, 0, 0.5)"
                            className="!bg-gray-900/50 !rounded-xl !border !border-white/10"
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}
