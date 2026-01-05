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
import api from '../services/api';

interface Conversa {
  id: string; // Changed to string UUID
  contato_nome: string;
  contato_telefone: string;
  avatar?: string;
  ultima_mensagem: string; // Derived in frontend or added to backend response? Check API.
  ultima_mensagem_em: string;
  nao_lidas: number;
  email?: string;
  empresa?: string;
  cidade?: string;
  criado_em: string;
  etiquetas?: string[];
  status?: string;
  // mapped fields for UI
  nome: string;
  telefone: string;
  timestamp: string;
}

interface Mensagem {
  id: string;
  direcao: 'enviada' | 'recebida';
  conteudo: string;
  criado_em: string;
  status: string;
  // mapped fields for UI
  tipo: 'enviada' | 'recebida';
  texto: string;
  timestamp: string;
}

// ... existing code ...

const loadConversas = async () => {
  try {
    const { data } = await api.get('/api/chat/conversas');
    // Map API response to UI model
    const mapped = data.conversas.map((c: any) => ({
      ...c,
      nome: c.contato_nome || c.contato_telefone,
      telefone: c.contato_telefone,
      ultima_mensagem: '...', // API doesn't return content of last message yet, only timestamp
      timestamp: new Date(c.ultima_mensagem_em || c.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      nao_lida: c.nao_lidas > 0,
      mensagens_nao_lidas: c.nao_lidas
    }));

    setConversas(mapped);
    setConversasFiltradas(mapped);
  } catch (error) {
    console.error('Erro ao carregar conversas:', error);
  } finally {
    setLoading(false);
  }
};


const abrirConversa = async (conversa: Conversa) => {
  setConversaSelecionada(conversa);
  setShowMessages(true);
  setShowDetalhes(true);

  try {
    const { data } = await api.get(`/api/chat/conversas/${conversa.id}/mensagens`);

    const mappedMsgs = data.mensagens.map((m: any) => ({
      ...m,
      tipo: m.direcao, // 'enviada' | 'recebida' matches
      texto: m.conteudo || (m.midia_url ? '[Mídia]' : ''),
      timestamp: new Date(m.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    setMensagens(mappedMsgs);

    // Marcar como lida
    await api.post(`/api/chat/conversas/${conversa.id}/marcar-lida`);

    setConversas((prev) =>
      prev.map((c) =>
        c.id === conversa.id
          ? { ...c, nao_lida: false, mensagens_nao_lidas: 0 }
          : c
      )
    );
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
};

const enviarMensagem = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!novaMensagem.trim() || !conversaSelecionada) return;

  // Otimistic update
  const now = new Date();
  const timestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  const tempId = 'temp-' + Date.now();

  const novaMensagemObj: Mensagem = {
    id: tempId,
    direcao: 'enviada',
    conteudo: novaMensagem,
    criado_em: now.toISOString(),
    status: 'enviando',
    tipo: 'enviada',
    texto: novaMensagem,
    timestamp,
  };

  setMensagens([...mensagens, novaMensagemObj]);
  setNovaMensagem('');

  try {
    const { data } = await api.post(`/api/chat/conversas/${conversaSelecionada.id}/mensagens`, {
      tipo_mensagem: 'texto', // ou 'text' conforme backend
      conteudo: novaMensagem
    });

    // Atualizar ID temporário com real se necessário, ou recarregar
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    // Reverter ou mostrar erro
  }
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
      className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${showMessages ? 'hidden md:flex' : 'flex'
        }`}
    >
      {/* Header da Lista */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-lg mb-3 dark:text-white">Conversas</h2>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFiltroClick('todas')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filtroAtivo === 'todas'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            Todas
          </button>
          <button
            onClick={() => handleFiltroClick('nao-lidas')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filtroAtivo === 'nao-lidas'
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
              className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${conversa.nao_lida
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : ''
                } ${conversaSelecionada?.id === conversa.id
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
      className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${!showMessages ? 'hidden md:flex' : 'flex'
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
                  className={`mb-4 flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'
                    }`}
                >
                  <div className="max-w-[70%]">
                    <div
                      className={`rounded-lg p-3 shadow ${msg.tipo === 'enviada'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 dark:text-white'
                        }`}
                    >
                      <p className="break-words">{msg.texto}</p>
                      <p
                        className={`text-xs mt-1 ${msg.tipo === 'enviada'
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
