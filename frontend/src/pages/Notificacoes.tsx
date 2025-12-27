import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Mail,
  MailOpen,
  AlertCircle,
  Info,
  MessageSquare,
  Settings,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  url_acao?: string;
  texto_acao?: string;
  lida: boolean;
  lida_em?: string;
  metadados?: any;
  criado_em: string;
}

interface Estatisticas {
  total: number;
  nao_lidas: number;
  lidas: number;
  sistema: number;
  mensagens: number;
  alertas: number;
}

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Estatisticas>({
    total: 0,
    nao_lidas: 0,
    lidas: 0,
    sistema: 0,
    mensagens: 0,
    alertas: 0,
  });

  useEffect(() => {
    carregarNotificacoes();
    carregarEstatisticas();
  }, [filtro]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const params: any = { limite: 100 };

      if (filtro === 'nao_lidas') params.lida = 'false';
      if (filtro === 'lidas') params.lida = 'true';

      const { data } = await api.get('/api/notificacoes', { params });
      setNotificacoes(data.notificacoes || []);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const { data } = await api.get('/api/notificacoes/estatisticas');
      setStats({
        total: parseInt(data.total) || 0,
        nao_lidas: parseInt(data.nao_lidas) || 0,
        lidas: parseInt(data.lidas) || 0,
        sistema: parseInt(data.sistema) || 0,
        mensagens: parseInt(data.mensagens) || 0,
        alertas: parseInt(data.alertas) || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      await api.patch(`/api/notificacoes/${id}/lida`);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
      );
      carregarEstatisticas();
      toast.success('Notificação marcada como lida');
    } catch (error) {
      toast.error('Erro ao marcar notificação');
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await api.patch('/api/notificacoes/marcar-todas-lidas');
      carregarNotificacoes();
      carregarEstatisticas();
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar notificações');
    }
  };

  const deletarNotificacao = async (id: string) => {
    try {
      await api.delete(`/api/notificacoes/${id}`);
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      carregarEstatisticas();
      toast.success('Notificação deletada');
    } catch (error) {
      toast.error('Erro ao deletar notificação');
    }
  };

  const deletarTodasLidas = async () => {
    if (!confirm('Deseja deletar todas as notificações lidas?')) return;

    try {
      await api.delete('/api/notificacoes/lidas/todas');
      carregarNotificacoes();
      carregarEstatisticas();
      toast.success('Notificações lidas deletadas');
    } catch (error) {
      toast.error('Erro ao deletar notificações');
    }
  };

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'sistema':
        return <Settings className="w-5 h-5 text-purple-400" />;
      case 'mensagem':
        return <MessageSquare className="w-5 h-5 text-cyan-400" />;
      case 'alerta':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatarTempo = (data: string) => {
    const agora = new Date();
    const notif = new Date(data);
    const diff = agora.getTime() - notif.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 1) return 'Agora mesmo';
    if (minutos < 60) return `${minutos}m atrás`;
    if (horas < 24) return `${horas}h atrás`;
    if (dias < 7) return `${dias}d atrás`;
    return notif.toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Notificações
          </h1>
          <p className="text-white/60 mt-1">
            {stats.nao_lidas > 0
              ? `Você tem ${stats.nao_lidas} ${stats.nao_lidas === 1 ? 'notificação nova' : 'notificações novas'}`
              : 'Nenhuma notificação nova'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="glass"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              carregarNotificacoes();
              carregarEstatisticas();
            }}
          >
            Atualizar
          </Button>

          {stats.nao_lidas > 0 && (
            <Button
              variant="glass"
              size="sm"
              icon={<CheckCheck className="w-4 h-4" />}
              onClick={marcarTodasComoLidas}
            >
              Marcar todas como lidas
            </Button>
          )}

          {stats.lidas > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={deletarTodasLidas}
            >
              Limpar lidas
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-600/20 border border-purple-400/30">
              <Bell className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-sm text-white/60">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-cyan-600/20 border border-cyan-400/30">
              <Mail className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm text-white/60">Não lidas</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.nao_lidas}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-600/20 border border-green-400/30">
              <MailOpen className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-white/60">Lidas</p>
              <p className="text-2xl font-bold text-white">{stats.lidas}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-yellow-600/20 border border-yellow-400/30">
              <AlertCircle className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm text-white/60">Alertas</p>
              <p className="text-2xl font-bold text-white">{stats.alertas}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card variant="glass">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-white/60" />
          <div className="flex gap-2">
            <Button
              variant={filtro === 'todas' ? 'neon' : 'glass'}
              size="sm"
              onClick={() => setFiltro('todas')}
            >
              Todas
            </Button>
            <Button
              variant={filtro === 'nao_lidas' ? 'neon' : 'glass'}
              size="sm"
              onClick={() => setFiltro('nao_lidas')}
            >
              Não lidas ({stats.nao_lidas})
            </Button>
            <Button
              variant={filtro === 'lidas' ? 'neon' : 'glass'}
              size="sm"
              onClick={() => setFiltro('lidas')}
            >
              Lidas ({stats.lidas})
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Notificações */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : notificacoes.length === 0 ? (
        <Card variant="glass" className="text-center py-12">
          <BellOff className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">
            {filtro === 'todas' && 'Nenhuma notificação ainda'}
            {filtro === 'nao_lidas' && 'Nenhuma notificação nova'}
            {filtro === 'lidas' && 'Nenhuma notificação lida'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notificacoes.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant={notif.lida ? 'glass' : 'gradient'}
                  className={`cursor-pointer hover:scale-[1.01] transition-transform ${
                    !notif.lida ? 'border-2 border-purple-400/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Ícone */}
                    <div
                      className={`p-3 rounded-lg ${
                        notif.lida ? 'bg-white/5' : 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30'
                      }`}
                    >
                      {getIconeTipo(notif.tipo)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${notif.lida ? 'text-white/80' : 'text-white'}`}>
                            {notif.titulo}
                          </h3>
                          {notif.mensagem && (
                            <p className="text-sm text-white/60 mt-1 line-clamp-2">{notif.mensagem}</p>
                          )}
                        </div>

                        {!notif.lida && (
                          <Badge variant="purple" size="sm" pulse>
                            Novo
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs text-white/40">{formatarTempo(notif.criado_em)}</span>

                        <div className="flex items-center gap-2">
                          {notif.url_acao && (
                            <Button
                              variant="glass"
                              size="sm"
                              onClick={() => {
                                if (notif.url_acao) window.location.href = notif.url_acao;
                              }}
                            >
                              {notif.texto_acao || 'Ver'}
                            </Button>
                          )}

                          {!notif.lida && (
                            <Button
                              variant="glass"
                              size="sm"
                              icon={<Check className="w-4 h-4" />}
                              onClick={() => marcarComoLida(notif.id)}
                              title="Marcar como lida"
                            />
                          )}

                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => deletarNotificacao(notif.id)}
                            title="Deletar"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
