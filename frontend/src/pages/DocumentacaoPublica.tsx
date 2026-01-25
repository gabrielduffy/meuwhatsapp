import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Copy,
    Check,
    MessageSquare,
    Smartphone,
    Globe,
    ChevronRight,
    Terminal,
    BookOpen,
    Cpu
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';

const CATEGORIES = [
    { id: 'start', label: 'Começar Agora', icon: BookOpen },
    { id: 'instances', label: 'Instâncias', icon: Smartphone },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'scraping', label: 'Prospecção (Scraper)', icon: Cpu },
    { id: 'webhooks', label: 'Webhooks', icon: Globe },
];

const ENDPOINTS = {
    start: [
        {
            method: 'GUIDE',
            path: 'Integração em 4 Passos',
            title: 'Como usar em outro sistema',
            description: 'Siga este roteiro para integrar nossa API de prospecção e WhatsApp no seu aplicativo externo.\n\n1. Autenticação: Obtenha sua API KEY no painel.\n2. Preparação: Crie uma campanha via API para agrupar os leads.\n3. Mineração: Dispare o scraper informando o ID da campanha e sua Webhook URL.\n4. Processamento: Receba os leads via Webhook e inicie o contato via API de Mensagens.',
            body: `// Exemplo de fluxo via cURL
# 1. Iniciar busca
curl -X POST https://api.whatsbenemax.com/api/prospeccao/scraper/mapa \\
     -H "Authorization: Bearer [TOKEN]" \\
     -H "Content-Type: application/json" \\
     -d '{
       "niche": "Dentistas",
       "city": "São Paulo - SP",
       "webhook_url": "https://seu-sistema.com/callback"
     }'`,
            response: 'Fácil, rápido e 100% cloud.'
        }
    ],
    instances: [
        {
            method: 'GET',
            path: '/instance/list',
            title: 'Listar Instâncias',
            description: 'Recupera todas as suas conexões e seus respectivos estados.',
            response: '[ { "instanceName": "demo", "status": "connected" } ]'
        },
        {
            method: 'POST',
            path: '/instance/create',
            title: 'Adicionar Conexão',
            description: 'Cria uma nova instância pronta para pareamento.',
            body: '{ "instanceName": "vendas01" }',
            response: '{ "status": "success", "message": "Instância inicializada" }'
        },
        {
            method: 'GET',
            path: '/instance/{name}/qrcode',
            title: 'Pegar QR Code',
            description: 'Retorna o QR Code em Base64 para exibir no seu frontend.',
            params: [{ name: 'name', type: 'string', desc: 'Nome da instância' }],
            response: '{ "qrcode": "data:image/png;base64,..." }'
        }
    ],
    messages: [
        {
            method: 'POST',
            path: '/message/send-text',
            title: 'Enviar Texto',
            description: 'Envia uma mensagem de texto simples.',
            body: '{ "instanceName": "vendas01", "to": "5511999999999", "text": "Olá do meu App!" }',
            response: '{ "messageId": "BAE..." }'
        },
        {
            method: 'POST',
            path: '/message/send-image',
            title: 'Enviar Imagem',
            description: 'Envia imagem via URL com legenda opcional.',
            body: '{ "instanceName": "vendas01", "to": "5511999999999", "imageUrl": "https://site.com/foto.jpg", "caption": "Veja isso!" }',
            response: '{ "status": "sent" }'
        }
    ],
    scraping: [
        {
            method: 'POST',
            path: '/api/prospeccao/campanhas',
            title: '1. Criar Campanha',
            description: 'Organize seus leads minerados em pastas (campanhas).',
            body: '{ "nome": "Lançamento Fev", "status": "ativa" }',
            response: '{ "campanha": { "id": "uuid-v4" } }'
        },
        {
            method: 'POST',
            path: '/api/prospeccao/scraper/mapa',
            title: '2. Disparar Robô',
            description: 'Inicia a varredura do Google Maps em tempo real.',
            body: `{
  "niche": "Petshops",
  "city": "Rio de Janeiro - RJ",
  "campanhaId": "uuid-v4",
  "webhook_url": "https://callback.com"
}`,
            response: '{ "jobId": "bul_888", "mensagem": "Minerando..." }'
        },
        {
            method: 'GET',
            path: '/api/prospeccao/scraper/leads/{jobId}',
            title: '3. Baixar Resultados',
            description: 'Obtém a lista de leads capturados pelo robô.',
            response: '[ { "nome": "Amigão Pet", "telefone": "5521..." } ]'
        }
    ],
    webhooks: [
        {
            method: 'POST',
            path: 'map_scraper_completed',
            title: 'Status Final do Scraper',
            description: 'Aviso enviado para sua URL quando o robô termina o trabalho.',
            body: `{
  "event": "map_scraper_completed",
  "data": { "job_id": "bul_888", "leads_collected": 120 }
}`,
            response: 'HTTP 200 OK'
        },
        {
            method: 'POST',
            path: 'messages.upsert',
            title: 'Recebimento de Mensagem',
            description: 'Notificação em tempo real de novas mensagens recebidas.',
            body: `{ 
  "event": "messages.upsert", 
  "data": { "text": "Oi!", "from": "5511..." } 
}`,
            response: 'HTTP 200 OK'
        }
    ]
};

export default function DocumentacaoPublica() {
    const [activeCategory, setActiveCategory] = useState('start');
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMap({ ...copiedMap, [id]: true });
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [id]: false })), 2000);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/status" className="flex items-center gap-2 group">
                        <Terminal className="w-6 h-6 text-purple-500 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-xl tracking-tight">whatsbenemax <span className="text-purple-500">Docs</span></span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/entrar" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Entrar no Painel</Link>
                        <Link to="/cadastrar" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 hover:scale-105 transition-all">Criar Conta Grátis</Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto flex flex-col md:flex-row gap-0">
                {/* Navigation Sidebar */}
                <aside className="w-full md:w-72 p-6 md:sticky md:top-20 md:h-[calc(100vh-80px)] border-r border-white/5 overflow-y-auto">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Desenvolvedor</p>
                    <nav className="space-y-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeCategory === cat.id
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                                {activeCategory === cat.id && <ChevronRight className="w-4 h-4 ml-auto opacity-40" />}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content Area */}
                <section className="flex-1 p-8 md:p-12 overflow-y-auto">
                    <div className="max-w-3xl">
                        <div className="mb-12">
                            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                                {CATEGORIES.find(c => c.id === activeCategory)?.label}
                            </h2>
                            <p className="text-gray-400 leading-relaxed">Documentação pública para desenvolvedores integrando soluções de WhatsApp e Prospecção.</p>
                        </div>

                        <div className="space-y-10">
                            {ENDPOINTS[activeCategory as keyof typeof ENDPOINTS]?.map((endpoint: any, index: number) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <Badge variant="purple" className="font-mono text-[10px]">{endpoint.method}</Badge>
                                        <code className="text-sm font-mono text-purple-300">{endpoint.path}</code>
                                    </div>

                                    <Card variant="glass" className="p-8 border-white/5 bg-white/[0.02]">
                                        <h3 className="text-xl font-bold mb-3">{endpoint.title}</h3>
                                        <p className="text-gray-400 text-sm mb-8 leading-relaxed whitespace-pre-line">{endpoint.description}</p>

                                        {endpoint.body && (
                                            <div className="mb-6">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Exemplo (JSON)</span>
                                                    <button
                                                        onClick={() => handleCopy(endpoint.body, `copy-${index}`)}
                                                        className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        {copiedMap[`copy-${index}`] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                        {copiedMap[`copy-${index}`] ? 'Copiado' : 'Copiar'}
                                                    </button>
                                                </div>
                                                <pre className="bg-black/50 p-6 rounded-xl border border-white/5 text-sm font-mono text-cyan-400 overflow-x-auto">
                                                    {endpoint.body}
                                                </pre>
                                            </div>
                                        )}

                                        {endpoint.response && (
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Resposta Esperada</span>
                                                <pre className="bg-black/20 p-4 rounded-lg border-l-2 border-green-500/50 text-xs font-mono text-gray-300">
                                                    {endpoint.response}
                                                </pre>
                                            </div>
                                        )}
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
