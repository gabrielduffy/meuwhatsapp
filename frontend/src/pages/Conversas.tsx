import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MessageCircle,
  ArrowLeft,
  Smile,
  Paperclip,
  MoreVertical,
  X,
} from 'lucide-react';
// import api from '../lib/api';

interface Conversa {
  id: number;
  nome: string;
  telefone: string;
  avatar?: string;
  ultima_mensagem: string;
  timestamp: string;
  nao_lida: boolean;
  mensagens_nao_lidas?: number;
  email?: string;
  empresa?: string;
  cidade?: string;
  criado?: string;
  etiquetas?: string[];
  status?: string;
}

interface Mensagem {
  id: number;
  tipo: 'enviada' | 'recebida';
  texto: string;
  timestamp: string;
}

type FiltroType = 'todas' | 'nao-lidas';

export default function Conversas() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversasFiltradas, setConversasFiltradas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaQuery] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroType>('todas');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversas();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    filtrarConversas();
  }, [conversas, buscaQuery, filtroAtivo]);

  const loadConversas = async () => {
    try {
      // Dados mockados - substituir por API real
      const conversasMock: Conversa[] = [
        {
          id: 1,
          nome: 'João Silva',
          telefone: '5511999999999',
          avatar: 'https://ui-avatars.com/api/?name=Joao+Silva&background=5B21B6&color=fff',
          ultima_mensagem: 'Olá, gostaria de saber mais sobre...',
          timestamp: '10:30',
          nao_lida: true,
          mensagens_nao_lidas: 3,
          email: 'joao@email.com',
          empresa: 'Empresa XYZ',
          cidade: 'São Paulo',
          criado: '15/01/2024',
          etiquetas: ['Cliente', 'VIP'],
          status: 'online',
        },
        {
          id: 2,
          nome: 'Maria Santos',
          telefone: '5511888888888',
          avatar: 'https://ui-avatars.com/api/?name=Maria+Santos&background=7C3AED&color=fff',
          ultima_mensagem: 'Obrigada pelo atendimento!',
          timestamp: '09:15',
          nao_lida: false,
          email: 'maria@email.com',
          empresa: 'Tech Corp',
          cidade: 'Rio de Janeiro',
          criado: '10/01/2024',
          etiquetas: ['Cliente'],
          status: 'offline',
        },
        {
          id: 3,
          nome: 'Pedro Costa',
          telefone: '5511777777777',
          avatar: 'https://ui-avatars.com/api/?name=Pedro+Costa&background=5B21B6&color=fff',
          ultima_mensagem: 'Quando posso realizar o pagamento?',
          timestamp: 'Ontem',
          nao_lida: true,
          mensagens_nao_lidas: 1,
          email: 'pedro@email.com',
          empresa: 'StartUp Inc',
          cidade: 'Belo Horizonte',
          criado: '05/01/2024',
          etiquetas: ['Lead'],
          status: 'offline',
        },
      ];

      setConversas(conversasMock);
      setConversasFiltradas(conversasMock);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarConversas = () => {
    let resultado = [...conversas];

    // Filtro de busca
    if (buscaQuery.trim()) {
      const query = buscaQuery.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.nome.toLowerCase().includes(query) ||
          c.telefone.includes(query) ||
          c.ultima_mensagem.toLowerCase().includes(query)
      );
    }

    // Filtro de não lidas
    if (filtroAtivo === 'nao-lidas') {
      resultado = resultado.filter((c) => c.nao_lida);
    }

    setConversasFiltradas(resultado);
  };

  const abrirConversa = async (conversa: Conversa) => {
    setConversaSelecionada(conversa);
    setShowMessages(true);
    setShowDetalhes(true);

    // Carregar mensagens mockadas - substituir por API real
    const mensagensMock: Mensagem[] = [
      {
        id: 1,
        tipo: 'recebida',
        texto: 'Olá, gostaria de saber mais sobre o produto',
        timestamp: '10:25',
      },
      {
        id: 2,
        tipo: 'enviada',
        texto: 'Olá! Claro, ficarei feliz em ajudar. Sobre qual produto você gostaria de saber?',
        timestamp: '10:26',
      },
      {
        id: 3,
        tipo: 'recebida',
        texto: 'Sobre o plano Premium',
        timestamp: '10:30',
      },
    ];

    setMensagens(mensagensMock);

    // Marcar como lida
    setConversas((prev) =>
      prev.map((c) =>
        c.id === conversa.id
          ? { ...c, nao_lida: false, mensagens_nao_lidas: 0 }
          : c
      )
    );
  };

  const enviarMensagem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    const now = new Date();
    const timestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const novaMensagemObj: Mensagem = {
      id: mensagens.length + 1,
      tipo: 'enviada',
      texto: novaMensagem,
      timestamp,
    };

    setMensagens([...mensagens, novaMensagemObj]);
    setNovaMensagem('');

    // Atualizar última mensagem na lista
    setConversas((prev) =>
      prev.map((c) =>
        c.id === conversaSelecionada.id
          ? { ...c, ultima_mensagem: novaMensagem, timestamp }
          : c
      )
    );

    // TODO: Enviar para API e Socket.io
  };

  const handleBackToList = () => {
    setShowMessages(false);
  };

  const handleFiltroClick = (tipo: FiltroType) => {
    setFiltroAtivo(tipo);
  };

  // const getInitials = (name: string) => {
  //   const parts = name.split(' ');
  //   if (parts.length >= 2) {
  //     return (parts[0][0] + parts[1][0]).toUpperCase();
  //   }
  //   return name.substring(0, 2).toUpperCase();
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Coluna 1: Lista de Conversas */}
      <div
        className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${
          showMessages ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header da Lista */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg mb-3 dark:text-white">Conversas</h2>

          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFiltroClick('todas')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filtroAtivo === 'todas'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => handleFiltroClick('nao-lidas')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filtroAtivo === 'nao-lidas'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Não Lidas
            </button>
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Nenhuma conversa encontrada
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <div
                key={conversa.id}
                onClick={() => abrirConversa(conversa)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  conversa.nao_lida
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : ''
                } ${
                  conversaSelecionada?.id === conversa.id
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={conversa.avatar}
                    alt={conversa.nome}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold truncate dark:text-white">
                        {conversa.nome}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversa.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conversa.ultima_mensagem}
                      </p>
                      {conversa.mensagens_nao_lidas &&
                        conversa.mensagens_nao_lidas > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full flex-shrink-0">
                            {conversa.mensagens_nao_lidas}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coluna 2: Área de Mensagens */}
      <div
        className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${
          !showMessages ? 'hidden md:flex' : 'flex'
        }`}
      >
        {conversaSelecionada ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Botão Voltar (Mobile) */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  <img
                    src={conversaSelecionada.avatar}
                    alt={conversaSelecionada.nome}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-bold dark:text-white">
                      {conversaSelecionada.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {conversaSelecionada.status || 'offline'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {mensagens.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-4 flex ${
                      msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className="max-w-[70%]">
                      <div
                        className={`rounded-lg p-3 shadow ${
                          msg.tipo === 'enviada'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-gray-700 dark:text-white'
                        }`}
                      >
                        <p className="break-words">{msg.texto}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.tipo === 'enviada'
                              ? 'text-purple-200'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={enviarMensagem} className="flex gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Emoji"
                >
                  <Smile className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Anexar arquivo"
                >
                  <Paperclip className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-24 h-24 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa da lista para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Coluna 3: Detalhes do Contato */}
      {conversaSelecionada && showDetalhes && (
        <div className="hidden lg:flex w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-col overflow-y-auto">
          {/* Header com Avatar */}
          <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowDetalhes(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <img
              src={conversaSelecionada.avatar}
              alt={conversaSelecionada.nome}
              className="w-24 h-24 rounded-full mx-auto mb-3"
            />
            <h3 className="font-bold text-xl mb-1 dark:text-white">
              {conversaSelecionada.nome}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {conversaSelecionada.telefone}
            </p>

            {/* Etiquetas */}
            {conversaSelecionada.etiquetas &&
              conversaSelecionada.etiquetas.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {conversaSelecionada.etiquetas.map((etiqueta, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full"
                    >
                      {etiqueta}
                    </span>
                  ))}
                </div>
              )}
          </div>

          {/* Informações */}
          <div className="p-4">
            <h4 className="font-bold mb-3 dark:text-white">Informações</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="dark:text-white">
                  {conversaSelecionada.email || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Empresa:</span>
                <span className="dark:text-white">
                  {conversaSelecionada.empresa || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Cidade:</span>
                <span className="dark:text-white">
                  {conversaSelecionada.cidade || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Desde:</span>
                <span className="dark:text-white">
                  {conversaSelecionada.criado || '-'}
                </span>
              </div>
            </div>

            {/* Negociações */}
            <h4 className="font-bold mt-6 mb-3 dark:text-white">Negociações</h4>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>Nenhuma negociação encontrada</p>
            </div>

            {/* Ações Rápidas */}
            <h4 className="font-bold mt-6 mb-3 dark:text-white">Ações Rápidas</h4>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                Adicionar ao CRM
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                Adicionar Etiqueta
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                Ver Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
