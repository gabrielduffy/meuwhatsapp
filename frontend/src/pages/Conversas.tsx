import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MessageCircle,
  ArrowLeft,
  Smile,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Users,
  User,
  Clock,
  Briefcase,
  Mail
} from 'lucide-react';
import api from '../services/api';

interface Conversa {
  id: string;
  contato_id: string;
  contato_nome: string;
  contato_telefone: string;
  avatar?: string;
  ultima_mensagem: string;
  ultima_mensagem_em: string;
  nao_lidas: number;
  email?: string;
  empresa?: string;
  cidade?: string;
  criado_em: string;
  etiquetas?: string[];
  status?: string;
  atribuido_para?: string;
  atribuido_nome?: string;
  departamento?: string;
}

interface Mensagem {
  id: string;
  direcao: 'enviada' | 'recebida';
  conteudo: string;
  criado_em: string;
  status: string;
  tipo_mensagem: string;
}

type TabType = 'todos' | 'aguardando' | 'meus' | 'grupos';

export default function Conversas() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaQuery, setBuscaQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversas();
    // Iniciar polling ou socket idealmente
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const loadConversas = async () => {
    try {
      const { data } = await api.get('/api/chat/conversas');
      setConversas(data.conversas || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirConversa = async (conversa: Conversa) => {
    setConversaSelecionada(conversa);
    setShowMessages(true);
    try {
      const { data } = await api.get(`/api/chat/conversas/${conversa.id}/mensagens`);
      setMensagens(data.mensagens || []);
      await api.post(`/api/chat/conversas/${conversa.id}/marcar-lida`);
      setConversas(prev => prev.map(c => c.id === conversa.id ? { ...c, nao_lidas: 0 } : c));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    const texto = novaMensagem;
    setNovaMensagem('');

    // Otimistic update
    const tempMsg: Mensagem = {
      id: Date.now().toString(),
      direcao: 'enviada',
      conteudo: texto,
      criado_em: new Date().toISOString(),
      status: 'enviando',
      tipo_mensagem: 'texto'
    };
    setMensagens(prev => [...prev, tempMsg]);

    try {
      await api.post(`/api/chat/conversas/${conversaSelecionada.id}/mensagens`, {
        tipo_mensagem: 'texto',
        conteudo: texto
      });
      // Idealmente o socket atualizará a lista
    } catch (error) {
      console.error('Erro ao enviar:', error);
    }
  };

  const filteredConversas = conversas.filter(c => {
    const matchesBusca = c.contato_nome?.toLowerCase().includes(buscaQuery.toLowerCase()) ||
      c.contato_telefone?.includes(buscaQuery);

    if (!matchesBusca) return false;

    if (activeTab === 'aguardando') return !c.atribuido_para;
    if (activeTab === 'meus') return c.atribuido_para; // Simplificado
    if (activeTab === 'grupos') return false; // TODO groups logic
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar: Lista de Conversas */}
      <div className={`w-full md:w-96 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${showMessages ? 'hidden md:flex' : 'flex'}`}>
        {/* Top Header */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conversas</h1>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={buscaQuery}
              onChange={(e) => setBuscaQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
            />
          </div>

          {/* Custom Tabs */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {(['todos', 'aguardando', 'meus', 'grupos'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversas.map(conversa => (
            <div
              key={conversa.id}
              onClick={() => abrirConversa(conversa)}
              className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${conversaSelecionada?.id === conversa.id ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}
            >
              <div className="relative">
                <img
                  src={conversa.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversa.contato_nome)}&background=random`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {conversa.nao_lidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                    {conversa.nao_lidas}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">
                    {conversa.contato_nome}
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    {conversa.ultima_mensagem_em ? new Date(conversa.ultima_mensagem_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {conversa.atribuido_para ? <User className="w-3 h-3 text-purple-500" /> : <Clock className="w-3 h-3 text-gray-400" />}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conversa.ultima_mensagem || 'Inicie uma conversa...'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${!showMessages ? 'hidden md:flex' : 'flex'}`}>
        {conversaSelecionada ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowMessages(false)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={conversaSelecionada.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversaSelecionada.contato_nome)}&background=random`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{conversaSelecionada.contato_nome}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetalhes(!showDetalhes)}
                  className={`p-2 rounded-lg transition-colors ${showDetalhes ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                >
                  <Briefcase className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-950/50 relative">
              {/* Background patterns could go here */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b5cf6 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>

              {mensagens.map((msg) => {
                const isMine = msg.direcao === 'enviada';
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMine
                        ? 'bg-purple-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'}`}>
                        {msg.conteudo}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        {new Date(msg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (
                          msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-cyan-400" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <form onSubmit={handleEnviar} className="flex items-center gap-2 max-w-5xl mx-auto">
                <button type="button" className="p-2.5 text-gray-500 hover:text-purple-600 transition-colors">
                  <Smile className="w-6 h-6" />
                </button>
                <button type="button" className="p-2.5 text-gray-500 hover:text-purple-600 transition-colors">
                  <Paperclip className="w-6 h-6" />
                </button>
                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!novaMensagem.trim()}
                  className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seus Chats</h2>
            <p className="text-gray-500 max-w-xs">Selecione uma conversa ao lado para começar o atendimento.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar: Details */}
      {showDetalhes && conversaSelecionada && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hidden xl:flex flex-col">
          <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
            <img
              src={conversaSelecionada.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversaSelecionada.contato_nome)}&background=random`}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-purple-100 dark:border-purple-900/30"
            />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{conversaSelecionada.contato_nome}</h3>
            <p className="text-sm text-gray-500">{conversaSelecionada.contato_telefone}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Informações do Contato</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{conversaSelecionada.email || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{conversaSelecionada.empresa || 'Empresa não informada'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Atendimento</h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Ativo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Atribuído para</span>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{conversaSelecionada.atribuido_nome || 'Ninguém'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors">
                Ir para CRM
              </button>
              <button className="w-full py-2 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Finalizar Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
