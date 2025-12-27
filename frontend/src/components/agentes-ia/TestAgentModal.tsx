import { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Send, Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface TestAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agente: {
    id: string;
    nome: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TestAgentModal({
  isOpen,
  onClose,
  agente,
}: TestAgentModalProps) {
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagens, setMensagens] = useState<Message[]>([]);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;

    const userMessage = mensagem;
    setMensagem('');
    setMensagens(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post(`/agentes-ia/${agente.id}/testar`, {
        mensagem: userMessage,
      });

      const assistantMessage = response.data.resposta || response.data.mensagem;
      setMensagens(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      console.error('Erro ao testar agente:', error);
      toast.error(error.response?.data?.erro || 'Erro ao testar agente');

      // Remove user message on error
      setMensagens(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMensagens([]);
    setMensagem('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Testar Agente: ${agente.nome}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-400/30 rounded-lg p-4">
          <p className="text-sm text-white/80">
            💡 Esta é uma sessão de teste. Os créditos NÃO serão debitados.
          </p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3">
          {mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <Bot className="w-12 h-12 mb-2" />
              <p className="text-sm">Envie uma mensagem para testar o agente</p>
            </div>
          ) : (
            mensagens.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleTest} className="flex gap-2">
          <Input
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Digite uma mensagem de teste..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="neon"
            loading={loading}
            disabled={!mensagem.trim()}
            icon={<Send className="w-4 h-4" />}
          />
        </form>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="glass"
            onClick={handleClear}
            disabled={mensagens.length === 0}
            className="flex-1"
          >
            Limpar Conversa
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
