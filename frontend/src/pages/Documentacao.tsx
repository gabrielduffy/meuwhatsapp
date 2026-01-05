import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Copy,
    Check,
    MessageSquare,
    Smartphone,
    Globe,
    Shield,
    ChevronRight,
    Code
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

// Categorias da API
const CATEGORIES = [
    { id: 'auth', label: 'Autenticação & Segurança', icon: Shield },
    { id: 'instances', label: 'Gestão de Instâncias', icon: Smartphone },
    { id: 'messages', label: 'Mensagens Avançadas', icon: MessageSquare },
    { id: 'webhooks', label: 'Webhooks & Eventos', icon: Globe },
];

// Dados da Documentação
const ENDPOINTS = {
    auth: [
        {
            method: 'GET',
            path: '/instance/list',
            title: 'Listar Instâncias',
            description: 'Retorna todas as suas conexões ativas, status e tokens de segurança.',
            params: [],
            response: `{
  "status": "success",
  "data": [
    {
      "instanceName": "Comercial_01",
      "status": "connected",
      "token": "inst_7f...8a"
    }
  ]
}`
        },
        {
            method: 'POST',
            path: '/instance/create',
            title: 'Criar Nova Conexão',
            description: 'Inicializa uma nova instância do WhatsApp. Você pode definir um token customizado ou deixar que o sistema gere um seguro para você.',
            body: `{
  "instanceName": "Suporte_Vendas",
  "token": "seu_token_customizado_opcional"
}`,
            response: `{
  "status": "success",
  "message": "Instância criada com sucesso",
  "token": "token_gerado_ou_enviado"
}`
        }
    ],
    instances: [
        {
            method: 'GET',
            path: '/instance/qr/{instanceName}',
            title: 'Obter QR Code',
            description: 'Retorna o QR Code atual da instância em base64 para conexão.',
            params: [{ name: 'instanceName', type: 'string', desc: 'Nome único da sua conexão' }],
            response: `{ "qrcode": "data:image/png;base64,iVBORw..." }`
        },
        {
            method: 'POST',
            path: '/instance/logout/{instanceName}',
            title: 'Desconectar WhatsApp',
            description: 'Realiza o logout da conta do WhatsApp, mas mantém a instância configurada.',
            params: [{ name: 'instanceName', type: 'string', desc: 'Nome único da sua conexão' }],
            response: `{ "status": "success" }`
        }
    ],
    messages: [
        {
            method: 'POST',
            path: '/message/send-text',
            title: 'Texto com Preview',
            description: 'Envia mensagens de texto com suporte a preview de links e formatação WhatsApp.',
            body: `{
  "instanceName": "Comercial",
  "to": "5511999999999",
  "text": "Olá! Conheça nosso site: https://whatsbenemax.com"
}`,
            response: `{ "messageId": "BAE5..." }`
        },
        {
            method: 'POST',
            path: '/message/send-buttons',
            title: 'Mensagem com Botões (Exclusivo)',
            description: 'Envia uma mensagem interativa com botões de clique rápido.',
            body: `{
  "instanceName": "Vendas",
  "to": "5511999999999",
  "text": "Como podemos ajudar hoje?",
  "buttons": [
    {"id": "1", "text": "Planos"},
    {"id": "2", "text": "Suporte"}
  ]
}`,
            response: `{ "status": "success" }`
        },
        {
            method: 'POST',
            path: '/message/send-poll',
            title: 'Criar Enquete',
            description: 'Envia uma enquete interativa diretamente no chat do cliente.',
            body: `{
  "instanceName": "Feedback",
  "to": "5511999999999",
  "poll": {
    "name": "Qual sua nota para nosso sistema?",
    "values": ["10 - Excelente", "8 - Bom", "5 - Médio"],
    "selectableCount": 1
  }
}`,
            response: `{ "status": "sent" }`
        },
        {
            method: 'POST',
            path: '/message/send-reaction',
            title: 'Enviar Reação',
            description: 'Adiciona uma reação de emoji a uma mensagem específica.',
            body: `{
  "instanceName": "Suporte",
  "to": "5511999999999",
  "reaction": "🚀",
  "messageId": "ID_DA_MENSAGEM_ALVO"
}`,
            response: `{ "success": true }`
        }
    ],
    webhooks: [
        {
            method: 'POST',
            path: '/webhook/set',
            title: 'Receber Mensagens em Tempo Real',
            description: 'Configure sua URL para receber mensagens de texto, imagens e status de leitura.',
            body: `{
  "instanceName": "Producao",
  "url": "https://api.seu-sistema.com/whats-webhook",
  "events": ["messages.upsert", "messages.update", "connection.update"]
}`,
            response: `{ "success": true }`
        }
    ]
};

export default function Documentacao() {
    const [activeCategory, setActiveCategory] = useState('messages');
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
    const [userToken, setUserToken] = useState<string>('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) setUserToken(token);
    }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMap({ ...copiedMap, [id]: true });
        setTimeout(() => {
            setCopiedMap(prev => ({ ...prev, [id]: false }));
        }, 2000);
    };

    const handleCopyToken = () => {
        if (userToken) {
            navigator.clipboard.writeText(userToken);
            toast.success('Token copiado!');
        }
    };

    return (
        <div className="flex h-full bg-[#0f1014] overflow-hidden">
            {/* Sidebar de Navegação */}
            <div className="w-64 border-r border-gray-800 bg-[#16181d] flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Code className="w-6 h-6 text-purple-400" />
                        API Docs
                    </h2>
                    <p className="text-xs text-gray-500 mt-2">v2.1.0 • Base URL: /</p>
                </div>

                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.id
                                ? 'bg-purple-900/30 text-purple-300 border border-purple-500/30'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                            {activeCategory === cat.id && (
                                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <div className="bg-gray-800/50 p-3 rounded text-xs text-gray-400">
                        <p className="font-semibold text-gray-300 mb-1">Seu Token de Acesso</p>
                        {userToken ? (
                            <div className="relative group cursor-pointer" onClick={handleCopyToken}>
                                <code className="block mt-1 bg-black/30 p-2 rounded text-cyan-400 truncate text-[10px] break-all">
                                    {userToken.substring(0, 15)}...
                                </code>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                    <Copy className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-red-400">Faça login para ver o token</p>
                        )}
                        <p className="mt-2 text-[10px] text-gray-500">Header: <span className="font-mono text-purple-300">Authorization: Bearer [TOKEN]</span></p>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{CATEGORIES.find(c => c.id === activeCategory)?.label}</h1>
                            <p className="text-gray-400">Explore os endpoints disponíveis para integração.</p>
                        </div>
                        <a
                            href="https://meuwhatsapp-meuwhatsapp.ax5glv.easypanel.host/api-docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                        >
                            <Globe className="w-4 h-4" />
                            Ver Swagger Completo
                        </a>
                    </div>

                    {/* Listagem de Endpoints */}
                    {ENDPOINTS[activeCategory as keyof typeof ENDPOINTS]?.map((endpoint: any, index: number) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card variant="glass" className="overflow-hidden border border-gray-800">
                                {/* Cabeçalho do Endpoint */}
                                <div className="flex items-center gap-4 mb-4 border-b border-gray-700/50 pb-4">
                                    <Badge variant={
                                        endpoint.method === 'GET' ? 'info' :
                                            endpoint.method === 'POST' ? 'success' :
                                                endpoint.method === 'DELETE' ? 'danger' : 'warning'
                                    }>
                                        {endpoint.method}
                                    </Badge>
                                    <code className="text-lg text-white font-mono">{endpoint.path}</code>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{endpoint.title}</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">{endpoint.description}</p>
                                    </div>

                                    {/* Parâmetros */}
                                    {endpoint.params && endpoint.params.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Parâmetros de URL</h4>
                                            <div className="bg-[#0f1014] rounded-lg p-3">
                                                {endpoint.params.map((param: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm py-1">
                                                        <span className="font-mono text-purple-300">{param.name}</span>
                                                        <span className="text-gray-500">{param.type}</span>
                                                        <span className="text-gray-400">{param.desc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Body Request */}
                                    {endpoint.body && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Corpo da Requisição (JSON)</h4>
                                                <button
                                                    onClick={() => handleCopy(endpoint.body, `req-${index}`)}
                                                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    {copiedMap[`req-${index}`] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                    {copiedMap[`req-${index}`] ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                            <div className="bg-[#0f1014] rounded-lg p-4 border border-gray-800 font-mono text-sm overflow-x-auto relative group">
                                                <pre className="text-cyan-300">
                                                    {endpoint.body}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Response */}
                                    {endpoint.response && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exemplo de Resposta</h4>
                                            </div>
                                            <div className="bg-[#0f1014] rounded-lg p-4 border-l-4 border-green-500/50 font-mono text-sm overflow-x-auto text-gray-300">
                                                <pre>
                                                    {endpoint.response}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
