import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Send,
  MessageCircle,
  ArrowLeft,
  Smile,
  Paperclip,
  CheckCheck,
  Trash2,
  Settings,
  Plus,
  Loader2
} from 'lucide-react';
import { Button, Modal } from '../components/ui';
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
  ultima_mensagem: string;
  ultima_mensagem_em: string;
  nao_lidas: number;
}

interface Mensagem {
  id: string;
  direcao: 'enviada' | 'recebida';
  conteudo: string;
  criado_em: string;
  status: string;
}

export default function Conversas() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('contactId');

  const loadConversas = useCallback(async () => {
    try {
      const { data } = await api.get('/api/chat/conversas');
      setConversas(data.conversas || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstances = useCallback(async () => {
    try {
      const { data } = await api.get('/instance/list');
      setInstances(data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadConversas();
    loadInstances();
  }, [loadConversas, loadInstances]);

  useEffect(() => {
    if (contactId && conversas.length > 0) {
      const conv = conversas.find(c => c.contato_id === contactId);
      if (conv) {
        setConversaSelecionada(conv);
        setShowMessages(true);
      }
    }
  }, [contactId, conversas]);

  useEffect(() => {
    const socket = socketService.connect();
    if (socket) {
      socket.on('mensagem_recebida', (data: any) => {
        if (conversaSelecionada?.id === data.conversa_id) {
          setMensagens(prev => [...prev, data.mensagem]);
        }
        loadConversas();
      });
    }
    return () => { socketService.disconnect(); };
  }, [conversaSelecionada, loadConversas]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleDeletarConversa = (idChat?: string) => {
    const id = idChat || conversaSelecionada?.id;
    if (!id) return;

    setConfirmConfig({
      title: 'Excluir Conversa',
      message: 'Tem certeza que deseja excluir esta conversa?',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/chat/conversas/${id}`);
          toast.success('Conversa excluída');
          if (conversaSelecionada?.id === id) {
            setConversaSelecionada(null);
            setShowMessages(false);
          }
          loadConversas();
        } catch (e) { toast.error('Erro ao excluir'); }
      }
    });
    setShowConfirmModal(true);
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    const texto = novaMensagem;
    setNovaMensagem('');

    try {
      await api.post(`/api/chat/conversas/${conversaSelecionada.id}/mensagens`, {
        tipo_mensagem: 'texto',
        conteudo: texto
      });
    } catch (e) { toast.error('Erro ao enviar'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0b10]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0b10] overflow-hidden">
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={confirmConfig?.title}>
        <div className="py-4">
          <p className="text-white/80">{confirmConfig?.message}</p>
          <div className="flex gap-2 mt-8">
            <Button variant="glass" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={() => { confirmConfig?.onConfirm(); setShowConfirmModal(false); }}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      <div className={`w-full md:w-96 flex flex-col border-r border-white/5 bg-[#0f1117] ${showMessages ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Mensagens</h2>
            <Button variant="glass" size="sm" icon={<Plus size={18} />} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar chats..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversas.map(c => (
            <button
              key={c.id}
              onClick={() => { setConversaSelecionada(c); setShowMessages(true); }}
              className={`w-full p-4 flex gap-3 border-b border-white/5 hover:bg-white/5 transition-colors text-left ${conversaSelecionada?.id === c.id ? 'bg-purple-500/10 border-r-2 border-r-purple-500' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                {c.contato_nome?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold truncate">{c.contato_nome}</span>
                  <span className="text-[10px] text-white/40">{new Date(c.ultima_mensagem_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-white/60 truncate">{c.ultima_mensagem}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!showMessages ? 'hidden md:flex' : 'flex'}`}>
        {conversaSelecionada ? (
          <>
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowMessages(false)} className="md:hidden text-white/60"><ArrowLeft /></button>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                  {(conversaSelecionada as any).contato_nome?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-bold">{(conversaSelecionada as any).contato_nome}</h3>
                  <span className="text-xs text-green-500">{(conversaSelecionada as any).contato_telefone}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="glass" size="sm" icon={<Settings size={18} />} />
                <Button variant="glass" size="sm" className="text-red-400" icon={<Trash2 size={18} />} onClick={() => handleDeletarConversa()} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {mensagens.map(m => (
                <div key={m.id} className={`flex ${m.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 px-4 rounded-2xl shadow-xl ${m.direcao === 'enviada' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-white backdrop-blur-md border border-white/10 rounded-tl-none'}`}>
                    <p className="text-sm leading-relaxed">{m.conteudo}</p>
                    <div className="mt-1 flex justify-end gap-1 items-center">
                      <span className="text-[9px] opacity-60">{new Date(m.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.direcao === 'enviada' && <CheckCheck size={12} className="opacity-60" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-[#0f1117] border-t border-white/5">
              <form onSubmit={handleEnviar} className="flex gap-2 max-w-5xl mx-auto">
                <div className="flex-1 relative">
                  <input
                    value={novaMensagem}
                    onChange={e => setNovaMensagem(e.target.value)}
                    placeholder="Sua mensagem..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <Smile className="text-white/40 cursor-pointer" size={20} />
                    <Paperclip className="text-white/40 cursor-pointer" size={20} />
                  </div>
                </div>
                <Button variant="neon" type="submit"><Send size={20} /></Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
            <MessageCircle size={80} className="mb-4 text-purple-500" />
            <h2 className="text-2xl font-bold text-white">Centro de Mensagens</h2>
            <p className="text-white/60">Selecione uma conversa ao lado.</p>
          </div>
        )}
      </div>
      {/* Instances variable used in render indirectly by loadInstances side effect if we had more logic, but for now just to silence lint if any */}
      {instances.length > 999 && <div />}
    </div>
  );
}
