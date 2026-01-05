import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Mail,
  Trash2,
  Plus,
  Filter,
  Settings,
  Bot,
  UserPlus,
  Calendar,
  Tags,
  Share2,
  Phone,
  LogOut,
  Archive,
  X,
  CheckCircle
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

interface Instance {
  instanceName: string;
  isConnected: boolean;
  color?: string;
}

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
  instancia_id: string;
}

const INSTANCE_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-cyan-500',
];

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
  const [instances, setInstances] = useState<Instance[]>([]);
  const [activeInstance, setActiveInstance] = useState<string>('todas');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [novaConversaData, setNovaConversaData] = useState({ instancia: '', numero: '', mensagem: '' });
  const [enviandoNova, setEnviandoNova] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('contactId');

  useEffect(() => {
    loadConversas();
    loadInstances();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadInstances = async () => {
    try {
      const { data } = await api.get('/instance/list');
      // Adicionar cores às instâncias
      const formatted = data.map((inst: any, idx: number) => ({
        ...inst,
        color: INSTANCE_COLORS[idx % INSTANCE_COLORS.length]
      }));
      setInstances(formatted);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  if (socket) {
    socket.on('mensagem_recebida', (data: { conversa_id: string, mensagem: Mensagem }) => {
      const { conversa_id, mensagem } = data;

      setConversaSelecionada(current => {
        if (current && current.id === conversa_id) {
          setMensagens(prev => {
            if (prev.find(m => m.id === mensagem.id)) return prev;
            return [...prev, mensagem];
          });
        }
        return current;
      });

      loadConversas();
    });

    socket.on('mensagem_enviada', (data: { conversa_id: string, mensagem: Mensagem }) => {
      const { conversa_id, mensagem } = data;

      setConversaSelecionada(current => {
        if (current && current.id === conversa_id) {
          setMensagens(prev => {
            if (prev.find(m => m.id === mensagem.id)) return prev;
            return [...prev, mensagem];
          });
        }
        return current;
      });

      loadConversas();
    });
  }

  return () => {
    socketService.disconnect();
  };
}, []);

useEffect(() => {
  if (contactId && conversas.length > 0) {
    const conversa = conversas.find(c => c.contato_id === contactId);
    if (conversa) {
      abrirConversa(conversa);
    } else {
      // Se colocar lógica de criar nova conversa aqui se não existir
    }
  }
}, [contactId, conversas]);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [mensagens]);

const loadConversas = async (instFilter?: string) => {
  try {
    const filter = instFilter || activeInstance;
    const url = filter === 'todas' ? '/api/chat/conversas' : `/api/chat/conversas?instancia_id=${filter}`;
    const { data } = await api.get(url);
    setConversas(data.conversas || []);
  } catch (error) {
    console.error('Erro ao carregar conversas:', error);
  } finally {
    setLoading(false);
  }
};

const handleInstanceFilter = (id: string) => {
  setActiveInstance(id);
  loadConversas(id);
};

const handleDeletarConversa = async () => {
  if (!conversaSelecionada) return;

  if (!confirm('Tem certeza que deseja excluir esta conversa? Todos os dados serão perdidos.')) return;

  try {
    await api.delete(`/api/chat/conversas/${conversaSelecionada.id}`);
    toast.success('Conversa excluída com sucesso');
    setConversaSelecionada(null);
    setShowMessages(false);
    setShowDropdown(false);
    loadConversas();
  } catch (error) {
    toast.error('Erro ao excluir conversa');
    console.error(error);
  }
};

const handleNovaConversa = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!novaConversaData.instancia || !novaConversaData.numero || !novaConversaData.mensagem) {
    toast.error('Preencha todos os campos obrigatórios');
    return;
  }

  setEnviandoNova(true);
  try {
    // Usar endpoint de mensagem legado ou criar conversa no chat interno?
    // O ideal é enviar a mensagem pela API de mensagem e o webhook cuidará do resto
    await api.post('/message/send-text', {
      instanceName: novaConversaData.instancia,
      to: novaConversaData.numero,
      text: novaConversaData.mensagem
    });

    toast.success('Mensagem enviada! A conversa aparecerá em instantes.');
    setShowNovaConversa(false);
    setNovaConversaData({ instancia: '', numero: '', mensagem: '' });
    setTimeout(loadConversas, 2000); // Dar tempo pro webhook
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Erro ao enviar mensagem');
  } finally {
    setEnviandoNova(false);
  }
};

const abrirConversa = async (conversa: Conversa) => {
  if (conversaSelecionada) {
    socketService.leaveConversa(conversaSelecionada.id);
  }

  setConversaSelecionada(conversa);
  setShowMessages(true);
  socketService.joinConversa(conversa.id);

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
    id: 'temp-' + Date.now(),
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
  } catch (error) {
    console.error('Erro ao enviar:', error);
    setMensagens(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'erro' } : m));
  }
};

const filteredConversas = conversas.filter(c => {
  const matchesBusca = c.contato_nome?.toLowerCase().includes(buscaQuery.toLowerCase()) ||
    c.contato_telefone?.includes(buscaQuery);

  if (!matchesBusca) return false;

  if (activeTab === 'aguardando') return !c.atribuido_para;
  if (activeTab === 'meus') return c.atribuido_para;
  if (activeTab === 'grupos') return false;
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
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conversas</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNovaConversa(true)}
              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instance Selectors */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
          <button
            onClick={() => handleInstanceFilter('todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeInstance === 'todas'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            Todas
          </button>
          {instances.map((inst) => (
            <button
              key={inst.instanceName}
              onClick={() => handleInstanceFilter(inst.instanceName)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeInstance === inst.instanceName
                ? `${inst.color} text-white shadow-lg shadow-${inst.color.split('-')[1]}-500/30`
                : `bg-transparent text-${inst.color.split('-')[1]}-500 border border-${inst.color.split('-')[1]}-500/30 hover:bg-${inst.color.split('-')[1]}-50`
                }`}
            >
              {inst.instanceName}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar contato..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-purple-500 transition-all"
            value={buscaQuery}
            onChange={(e) => setBuscaQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        {(['todos', 'aguardando', 'meus'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeTab === tab
              ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversas.map((conversa) => (
            <button
              key={conversa.id}
              onClick={() => abrirConversa(conversa)}
              className={`w-full p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 relative ${conversaSelecionada?.id === conversa.id ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                }`}
            >
              {/* Instance indicator bar */}
              <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full ${instances.find(i => i.instanceName === conversa.instancia_id)?.color || 'bg-gray-300'
                }`} />

              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                  {conversa.contato_nome?.charAt(0) || '?'}
                </div>
                {conversa.nao_lidas > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                    {conversa.nao_lidas}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white truncate">
                    {conversa.contato_nome}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(conversa.ultima_mensagem_em || conversa.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {conversa.ultima_mensagem || 'Sem mensagens...'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>

    {/* Main Chat Area */}
    <div className={`flex-1 flex flex-col bg-white dark:bg-gray-950 ${!showMessages ? 'hidden md:flex' : 'flex'}`}>
      {!conversaSelecionada ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 dark:bg-gray-950">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="w-10 h-10 text-purple-600 dark:text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Selecione uma conversa</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Escolha um contato na lista ao lado para ver as mensagens e responder.
          </p>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="h-[72px] px-4 md:px-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMessages(false)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                {conversaSelecionada.contato_nome?.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {conversaSelecionada.contato_nome}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{conversaSelecionada.contato_telefone}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDetalhes(!showDetalhes)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Bot className="w-4 h-4 text-purple-500" />
                      Ativar Agente IA
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      Criar contato
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Calendar className="w-4 h-4 text-green-500" />
                      Agendar reunião
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Tags className="w-4 h-4 text-yellow-500" />
                      Gerenciar Etiquetas
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Share2 className="w-4 h-4 text-indigo-500" />
                      Transferir
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Fechar conversa
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <Archive className="w-4 h-4 text-orange-500" />
                      Arquivar
                    </button>
                    <button
                      onClick={handleDeletarConversa}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir conversa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/30 dark:bg-gray-950/30">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[70%] p-3 rounded-2xl shadow-sm ${msg.direcao === 'enviada'
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-tl-none'
                    }`}
                >
                  <p className="text-sm md:text-[15px] whitespace-pre-wrap">{msg.conteudo}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${msg.direcao === 'enviada' ? 'text-purple-100' : 'text-gray-400'}`}>
                      {new Date(msg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.direcao === 'enviada' && (
                      <span className="text-purple-100">
                        {msg.status === 'enviando' ? <Clock className="w-3 h-3" /> : (msg.status === 'lida' ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <form onSubmit={handleEnviar} className="flex items-end gap-2 md:gap-4 max-w-6xl mx-auto">
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                <Smile className="w-6 h-6" />
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                <Paperclip className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviar(e);
                    }
                  }}
                  placeholder="Sua mensagem..."
                  className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-purple-500 transition-all resize-none max-h-32"
                />
              </div>
              <button
                type="submit"
                disabled={!novaMensagem.trim()}
                className="p-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>

    {/* Details Panel */}
    {showDetalhes && conversaSelecionada && (
      <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto hidden lg:block">
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-3xl mb-4">
              {conversaSelecionada.contato_nome?.charAt(0)}
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{conversaSelecionada.contato_nome}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{conversaSelecionada.contato_telefone}</p>
          </div>

          <div className="space-y-6">
            <div>
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Informações</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{conversaSelecionada.email || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{conversaSelecionada.empresa || 'Não informada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Iniciado: {new Date(conversaSelecionada.criado_em).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Departamento</h5>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                {conversaSelecionada.departamento || 'Geral'}
              </span>
            </div>

            <div>
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Etiquetas</h5>
              <div className="flex flex-wrap gap-2">
                {conversaSelecionada.etiquetas?.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[10px] text-gray-600 dark:text-gray-400">
                    {tag}
                  </span>
                )) || <span className="text-xs text-gray-400">Sem etiquetas</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* New Conversation Modal */}
    {showNovaConversa && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Nova Conversa no WhatsApp</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Envie uma mensagem para iniciar uma nova conversa</p>
              </div>
            </div>
            <button
              onClick={() => setShowNovaConversa(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleNovaConversa} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Instância WhatsApp *
              </label>
              <select
                required
                value={novaConversaData.instancia}
                onChange={(e) => setNovaConversaData({ ...novaConversaData, instancia: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 transition-all text-sm outline-none appearance-none"
              >
                <option value="">Selecione uma instância</option>
                {instances.filter(i => i.isConnected).map(inst => (
                  <option key={inst.instanceName} value={inst.instanceName}>{inst.instanceName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Número de Telefone *
              </label>
              <input
                type="text"
                required
                placeholder="5511999999999"
                value={novaConversaData.numero}
                onChange={(e) => setNovaConversaData({ ...novaConversaData, numero: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 transition-all text-sm outline-none"
              />
              <p className="mt-1.5 text-[10px] text-gray-500">Formato: DDI + DDD + Número (ex: 5511999999999 para Brasil)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Mensagem *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Digite sua mensagem inicial..."
                value={novaConversaData.mensagem}
                onChange={(e) => setNovaConversaData({ ...novaConversaData, mensagem: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 transition-all text-sm outline-none resize-none"
              />
              <p className="mt-1.5 text-[10px] text-gray-500 font-medium">Esta será a primeira mensagem da conversa</p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNovaConversa(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviandoNova}
                className="flex-2 flex-[2] py-3 px-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50"
              >
                {enviandoNova ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
