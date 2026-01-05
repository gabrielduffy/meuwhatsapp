import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Copy,
    Check,
    Server,
    MessageSquare,
    Smartphone,
    Globe,
    Shield,
    ChevronRight,
    Code
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

// Categorias da API
const CATEGORIES = [
    { id: 'auth', label: 'Autenticação', icon: Shield },
    { id: 'instances', label: 'Instâncias', icon: Smartphone },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'webhooks', label: 'Webhooks', icon: Globe },
];

// Dados da Documentação
const ENDPOINTS = {
    auth: [
        {
            method: 'GET',
            path: '/instance/list',
            title: 'Listar Instâncias',
            description: 'Retorna todas as instâncias criadas e seus status.',
            params: [],
            response: `{
  "status": "success",
  "data": [
    {
      "name": "instancia_1",
      "status": "connected"
    }
  ]
}`
        }
    ],
    instances: [
        {
            method: 'POST',
            path: '/instance/create',
            title: 'Criar Instância',
            description: 'Cria uma nova instância do WhatsApp.',
            body: `{
  "instanceName": "minha_instancia",
  "token": "seu_token_opcional"
}`,
            response: `{
  "status": "success",
  "qrcode": "data:image/png;base64,..."
}`
        },
        {
            method: 'DELETE',
            path: '/instance/delete/{instanceName}',
            title: 'Deletar Instância',
            description: 'Remove uma instância e desconecta do WhatsApp.',
            params: [{ name: 'instanceName', type: 'string', desc: 'Nome da instância' }],
            response: `{ "status": "success" }`
        }
    ],
    messages: [
        {
            method: 'POST',
            path: '/message/send-text',
            title: 'Enviar Texto',
            description: 'Envia uma mensagem de texto simples.',
            body: `{
  "instanceName": "instancia_1",
  "to": "5511999999999",
  "text": "Olá do Bot!"
}`,
            response: `{
  "key": { "id": "..." },
  "status": "PENDING"
}`
        },
        {
            method: 'POST',
            path: '/message/send-image',
            title: 'Enviar Imagem',
            description: 'Envia uma imagem via URL.',
            body: `{
  "instanceName": "instancia_1",
  "to": "5511999999999",
  "imageUrl": "https://exemplo.com/foto.jpg",
  "caption": "Legenda opcional"
}`,
            response: `{ "status": "PENDING" }`
        },
        {
            method: 'POST',
            path: '/message/send-audio',
            title: 'Enviar Áudio',
            description: 'Envia um arquivo de áudio (MP3/OGG).',
            body: `{
    "instanceName": "instancia_1",
    "to": "5511999999999",
    "audioUrl": "https://exemplo.com/audio.mp3",
    "ptt": true
  }`,
            response: `{ "status": "PENDING" }`
        }
    ],
    webhooks: [
        {
            method: 'POST',
            path: '/webhook/set',
            title: 'Configurar Webhook',
            description: 'Define a URL para receber eventos.',
            body: `{
  "instanceName": "instancia_1",
  "url": "https://seu-sistema.com/webhook",
  "enabled": true
}`,
            response: `{ "success": true }`
        }
    ]
};

export default function Documentacao() {
    const [activeCategory, setActiveCategory] = useState('messages');
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMap({ ...copiedMap, [id]: true });
        setTimeout(() => {
            setCopiedMap(prev => ({ ...prev, [id]: false }));
        }, 2000);
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
                        <p className="font-semibold text-gray-300 mb-1">Autenticação</p>
                        <p>Use o Header:</p>
                        <code className="block mt-1 bg-black/30 p-1 rounded text-cyan-400">apikey: sua_api_key</code>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">{CATEGORIES.find(c => c.id === activeCategory)?.label}</h1>
                        <p className="text-gray-400">Explore os endpoints disponíveis para integração.</p>
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
