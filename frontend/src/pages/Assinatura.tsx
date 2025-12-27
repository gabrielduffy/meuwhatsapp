import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Check,
  X,
  Crown,
  Users,
  Smartphone,
  MessageSquare,
  TrendingUp,
  Star,
  Sparkles,
  Calendar,
  AlertCircle,
  ChevronRight,
  Zap,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../services/api';

interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco_mensal: number;
  preco_anual: number;
  creditos_mensais: number;
  max_usuarios: number;
  max_instancias: number;
  max_contatos: number;
  funcionalidades: {
    agente_ia?: boolean;
    crm?: boolean;
    prospeccao?: boolean;
    suporte_prioritario?: boolean;
    whitelabel?: boolean;
    acesso_api?: boolean;
    chat?: boolean;
    integracoes?: boolean;
  };
  ativo: boolean;
}

interface PlanoAtual {
  plano: Plano;
  status: {
    teste: boolean;
    teste_termina_em: string | null;
    ativo: boolean;
    whitelabel_ativo: boolean;
  };
}

export default function Assinatura() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoAtual, setPlanoAtual] = useState<PlanoAtual | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarModalTroca, setMostrarModalTroca] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [processando, setProcessando] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'mensal' | 'anual'>('mensal');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar todos os planos
      const planosRes = await api.get('/api/planos');
      setPlanos(planosRes.data.planos);

      // Carregar plano atual
      const planoAtualRes = await api.get('/api/planos/meu-plano');
      setPlanoAtual(planoAtualRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalTroca = (plano: Plano) => {
    setPlanoSelecionado(plano);
    setMostrarModalTroca(true);
  };

  const confirmarTrocaPlano = async () => {
    if (!planoSelecionado) return;

    try {
      setProcessando(true);

      const res = await api.post('/api/planos/alterar', {
        plano_id: planoSelecionado.id,
      });

      alert(res.data.mensagem + '\n\n' + res.data.proximos_passos);
      setMostrarModalTroca(false);
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao trocar plano');
    } finally {
      setProcessando(false);
    }
  };

  const formatarPreco = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const calcularEconomia = (plano: Plano) => {
    const totalMensal = plano.preco_mensal * 12;
    const economia = totalMensal - plano.preco_anual;
    const percentual = ((economia / totalMensal) * 100).toFixed(0);
    return { economia, percentual };
  };

  const isPlanoPremium = (slug: string) => {
    return slug === 'business' || slug === 'pro';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Assinatura & Planos</h1>
            <p className="text-sm text-white/60">Gerencie seu plano e faturamento</p>
          </div>
        </div>

        {planoAtual?.status.teste && planoAtual.status.teste_termina_em && (
          <Badge variant="warning" size="md">
            <Calendar className="w-4 h-4" />
            Período de teste até{' '}
            {new Date(planoAtual.status.teste_termina_em).toLocaleDateString('pt-BR')}
          </Badge>
        )}
      </motion.div>

      {/* Plano Atual */}
      {planoAtual && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-white">Plano Atual</h2>
                    {isPlanoPremium(planoAtual.plano.slug) && (
                      <Badge variant="purple" size="sm">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-white/60">Você está no plano {planoAtual.plano.nome}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    {formatarPreco(planoAtual.plano.preco_mensal)}
                  </span>
                  <span className="text-white/60">/mês</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-white/60">Usuários</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {planoAtual.plano.max_usuarios}
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                    <p className="text-sm text-white/60">Instâncias</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {planoAtual.plano.max_instancias}
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-white/60">Mensagens/mês</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {planoAtual.plano.creditos_mensais.toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <p className="text-sm text-white/60">Contatos</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {planoAtual.plano.max_contatos.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {planoAtual.plano.funcionalidades.agente_ia && (
                  <Badge variant="purple" size="sm">
                    <Sparkles className="w-3 h-3" />
                    Agente IA
                  </Badge>
                )}
                {planoAtual.plano.funcionalidades.crm && (
                  <Badge variant="cyan" size="sm">
                    <Check className="w-3 h-3" />
                    CRM
                  </Badge>
                )}
                {planoAtual.plano.funcionalidades.prospeccao && (
                  <Badge variant="success" size="sm">
                    <Check className="w-3 h-3" />
                    Prospecção
                  </Badge>
                )}
                {planoAtual.plano.funcionalidades.suporte_prioritario && (
                  <Badge variant="warning" size="sm">
                    <Star className="w-3 h-3" />
                    Suporte Prioritário
                  </Badge>
                )}
                {planoAtual.plano.funcionalidades.whitelabel && (
                  <Badge variant="info" size="sm">
                    <Crown className="w-3 h-3" />
                    White Label
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Toggle Mensal/Anual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-4"
      >
        <button
          onClick={() => setPeriodoSelecionado('mensal')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodoSelecionado === 'mensal'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setPeriodoSelecionado('anual')}
          className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
            periodoSelecionado === 'anual'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Anual
          <Badge variant="success" size="sm" className="absolute -top-2 -right-2">
            -16%
          </Badge>
        </button>
      </motion.div>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos.map((plano, index) => {
          const { economia, percentual } = calcularEconomia(plano);
          const preco =
            periodoSelecionado === 'mensal' ? plano.preco_mensal : plano.preco_anual / 12;
          const isPlanoAtual = planoAtual?.plano.id === plano.id;
          const isPremium = isPlanoPremium(plano.slug);

          return (
            <motion.div
              key={plano.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="relative"
            >
              {isPremium && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge variant="purple" size="md">
                    <Crown className="w-4 h-4" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <Card
                className={`h-full relative overflow-hidden ${
                  isPremium
                    ? 'border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : ''
                } ${isPlanoAtual ? 'ring-2 ring-cyan-500/50' : ''}`}
              >
                {isPremium && (
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
                )}

                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{plano.nome}</h3>
                      <p className="text-sm text-white/60">{plano.descricao}</p>
                    </div>
                    {isPlanoAtual && (
                      <Badge variant="success" size="sm">
                        <Check className="w-3 h-3" />
                        Atual
                      </Badge>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        {formatarPreco(preco)}
                      </span>
                      <span className="text-white/60">/mês</span>
                    </div>
                    {periodoSelecionado === 'anual' && (
                      <p className="text-sm text-green-400 mt-1">
                        Economize {formatarPreco(economia)} por ano ({percentual}%)
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-white/80">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm">
                        {plano.max_usuarios}{' '}
                        {plano.max_usuarios === 1 ? 'usuário' : 'usuários'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm">
                        {plano.max_instancias}{' '}
                        {plano.max_instancias === 1 ? 'instância' : 'instâncias'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm">
                        {plano.creditos_mensais.toLocaleString('pt-BR')} mensagens/mês
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm">
                        {plano.max_contatos.toLocaleString('pt-BR')} contatos
                      </span>
                    </div>

                    {plano.funcionalidades.agente_ia && (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">Agente IA</span>
                      </div>
                    )}
                    {plano.funcionalidades.crm && (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">CRM Completo</span>
                      </div>
                    )}
                    {plano.funcionalidades.prospeccao ? (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">Prospecção Avançada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/40">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Prospecção</span>
                      </div>
                    )}
                    {plano.funcionalidades.suporte_prioritario ? (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">Suporte Prioritário</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/40">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Suporte Prioritário</span>
                      </div>
                    )}
                    {plano.funcionalidades.whitelabel ? (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">White Label</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/40">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">White Label</span>
                      </div>
                    )}
                    {plano.funcionalidades.acesso_api ? (
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm">Acesso API Completo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/40">
                        <X className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Acesso API</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant={isPremium ? 'neon' : isPlanoAtual ? 'glass' : 'primary'}
                    className="w-full"
                    onClick={() => !isPlanoAtual && abrirModalTroca(plano)}
                    disabled={isPlanoAtual}
                  >
                    {isPlanoAtual ? (
                      'Plano Atual'
                    ) : (
                      <>
                        {isPremium && <Zap className="w-4 h-4" />}
                        Selecionar Plano
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ ou Informações Adicionais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Informações Importantes</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Você pode fazer upgrade ou downgrade a qualquer momento</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Pagamento anual oferece 16% de desconto</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Todos os planos incluem suporte técnico via email</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Dados armazenados com segurança e backup diário</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modal de Confirmação de Troca */}
      <AnimatePresence>
        {mostrarModalTroca && planoSelecionado && (
          <Modal
            isOpen={mostrarModalTroca}
            onClose={() => !processando && setMostrarModalTroca(false)}
            title="Confirmar Alteração de Plano"
          >
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-white/80 mb-2">Você está mudando para o plano:</p>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {planoSelecionado.nome}
                </h3>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  {formatarPreco(planoSelecionado.preco_mensal)}
                  <span className="text-base text-white/60">/mês</span>
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">O que você terá:</h4>
                <div className="space-y-1 text-sm text-white/60">
                  <p>
                    • {planoSelecionado.max_usuarios}{' '}
                    {planoSelecionado.max_usuarios === 1 ? 'usuário' : 'usuários'}
                  </p>
                  <p>
                    • {planoSelecionado.max_instancias}{' '}
                    {planoSelecionado.max_instancias === 1 ? 'instância' : 'instâncias'}
                  </p>
                  <p>
                    • {planoSelecionado.creditos_mensais.toLocaleString('pt-BR')} mensagens/mês
                  </p>
                  <p>
                    • {planoSelecionado.max_contatos.toLocaleString('pt-BR')} contatos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="glass"
                  className="flex-1"
                  onClick={() => setMostrarModalTroca(false)}
                  disabled={processando}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={confirmarTrocaPlano}
                  loading={processando}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
