import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Edit,
  CreditCard,
  Activity,
  Palette,
  TrendingUp,
  Users as UsersIcon,
  Zap,
  Target,
} from 'lucide-react';
import { Card, Button, Input, Modal, Badge, Tabs } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Empresa {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  documento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status: 'ativo' | 'trial' | 'inativo' | 'bloqueado';
  criado_em: string;
  whitelabel_ativo?: boolean;
  logo_url?: string;
  dominio_customizado?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
}

interface Plano {
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_instancias: number;
  max_contatos: number;
}

interface Uso {
  uso: {
    usuarios: number;
    instancias: number;
    contatos: number;
  };
  limites: {
    max_usuarios: number;
    max_instancias: number;
    max_contatos: number;
  };
  percentual: {
    usuarios: number;
    instancias: number;
    contatos: number;
  };
}

interface Creditos {
  saldo_creditos: number;
  creditos_usados_mes: number;
  creditos_resetam_em?: string;
}

interface Transacao {
  id: number;
  tipo: string;
  valor: number;
  criado_em: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function Empresas() {
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [creditos, setCreditos] = useState<Creditos | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showWhitelabelModal, setShowWhitelabelModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  });

  const [whitelabelData, setWhitelabelData] = useState({
    logo_url: '',
    dominio_customizado: '',
    cor_primaria: '#8B5CF6',
    cor_secundaria: '#3B82F6',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadEmpresa(),
      loadPlano(),
      loadUso(),
      loadCreditos(),
      loadTransacoes(),
    ]);
    setLoading(false);
  };

  const loadEmpresa = async () => {
    try {
      const { data } = await api.get('/empresa');
      const empresaData = data.empresa || data;
      setEmpresa(empresaData);
    } catch (error: any) {
      console.error('Erro ao carregar empresa:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar empresa');
    }
  };

  const loadPlano = async () => {
    try {
      const { data } = await api.get('/empresa/plano');
      setPlano(data.plano_atual || data);
    } catch (error: any) {
      console.error('Erro ao carregar plano:', error);
    }
  };

  const loadUso = async () => {
    try {
      const { data } = await api.get('/empresa/uso');
      setUso(data);
    } catch (error: any) {
      console.error('Erro ao carregar uso:', error);
    }
  };

  const loadCreditos = async () => {
    try {
      const { data } = await api.get('/empresa/creditos');
      setCreditos(data);
    } catch (error: any) {
      console.error('Erro ao carregar créditos:', error);
    }
  };

  const loadTransacoes = async () => {
    try {
      const { data } = await api.get('/empresa/transacoes', { params: { limite: 5 } });
      setTransacoes(data.transacoes || []);
    } catch (error: any) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const handleEditEmpresa = async () => {
    try {
      setSubmitting(true);
      await api.put('/empresa', formData);
      toast.success('Empresa atualizada com sucesso!');
      setShowEditModal(false);
      loadEmpresa();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWhitelabel = async () => {
    try {
      setSubmitting(true);
      await api.put('/empresa/whitelabel', whitelabelData);
      toast.success('Configurações atualizadas com sucesso!');
      setShowWhitelabelModal(false);
      loadEmpresa();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar configurações');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!empresa) return;
    setFormData({
      nome: empresa.nome,
      email: empresa.email,
      telefone: empresa.telefone || '',
      documento: empresa.documento || '',
      endereco: empresa.endereco || '',
      cidade: empresa.cidade || '',
      estado: empresa.estado || '',
      cep: empresa.cep || '',
    });
    setShowEditModal(true);
  };

  const openWhitelabelModal = () => {
    if (!empresa) return;
    setWhitelabelData({
      logo_url: empresa.logo_url || '',
      dominio_customizado: empresa.dominio_customizado || '',
      cor_primaria: empresa.cor_primaria || '#8B5CF6',
      cor_secundaria: empresa.cor_secundaria || '#3B82F6',
    });
    setShowWhitelabelModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
      ativo: 'success',
      trial: 'warning',
      inativo: 'info',
      bloqueado: 'danger',
    };
    return variants[status] || 'info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativo: 'Ativo',
      trial: 'Trial',
      inativo: 'Inativo',
      bloqueado: 'Bloqueado',
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Carregando...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: <Building2 />,
      content: (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Company Info */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card variant="gradient">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Informações da Empresa
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Nome</label>
                  <p className="font-semibold text-white">{empresa?.nome || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Email</label>
                  <p className="text-white/80">{empresa?.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Telefone</label>
                  <p className="text-white/80">{empresa?.telefone || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Documento</label>
                  <p className="text-white/80">{empresa?.documento || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Cidade/Estado</label>
                  <p className="text-white/80">
                    {empresa?.cidade || '-'} / {empresa?.estado || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">CEP</label>
                  <p className="text-white/80">{empresa?.cep || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white/60 mb-1">Endereço</label>
                  <p className="text-white/80">{empresa?.endereco || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Status</label>
                  <Badge variant={getStatusBadge(empresa?.status || '')} pulse>
                    {getStatusLabel(empresa?.status || '')}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Criada em</label>
                  <p className="text-white/80">{formatDate(empresa?.criado_em || '')}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Plan Info */}
          <motion.div variants={item}>
            <Card variant="gradient">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                Plano Atual
              </h3>
              <div className="mb-4">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {plano?.nome || 'Nenhum plano'}
                </h4>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  {formatCurrency(plano?.preco_mensal || 0)}
                  <span className="text-sm text-white/60">/mês</span>
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-white/60 mb-2">Recursos:</p>
                <ul className="text-sm space-y-2 text-white/80">
                  <li className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-purple-400" />
                    Até {plano?.max_usuarios || 0} usuários
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Até {plano?.max_instancias || 0} instâncias
                  </li>
                  <li className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    Até {plano?.max_contatos || 0} contatos
                  </li>
                </ul>
              </div>
              <div className="mt-4">
                <Button variant="neon" className="w-full">
                  Ver Todos os Planos
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ),
    },
    {
      id: 'uso',
      label: 'Uso & Limites',
      icon: <Activity />,
      content: (
        <Card variant="gradient">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Uso e Limites
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Usuários */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Usuários</span>
                <span className="text-sm text-white/60">
                  {uso?.uso.usuarios} / {uso?.limites.max_usuarios}
                </span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uso?.percentual.usuarios || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full shadow-neon-purple"
                />
              </div>
              <p className="text-xs text-white/60 mt-2">{uso?.percentual.usuarios || 0}% utilizado</p>
            </div>

            {/* Instâncias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Instâncias</span>
                <span className="text-sm text-white/60">
                  {uso?.uso.instancias} / {uso?.limites.max_instancias}
                </span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uso?.percentual.instancias || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-3 rounded-full shadow-neon-cyan"
                />
              </div>
              <p className="text-xs text-white/60 mt-2">{uso?.percentual.instancias || 0}% utilizado</p>
            </div>

            {/* Contatos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Contatos</span>
                <span className="text-sm text-white/60">
                  {uso?.uso.contatos} / {uso?.limites.max_contatos}
                </span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uso?.percentual.contatos || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                />
              </div>
              <p className="text-xs text-white/60 mt-2">{uso?.percentual.contatos || 0}% utilizado</p>
            </div>
          </div>
        </Card>
      ),
    },
    {
      id: 'creditos',
      label: 'Créditos',
      icon: <TrendingUp />,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credits Info */}
          <Card variant="gradient">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Créditos
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Saldo de Créditos</span>
                <span className="text-3xl font-bold text-green-400">{creditos?.saldo_creditos || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Usados Este Mês</span>
                <span className="text-xl font-semibold text-red-400">{creditos?.creditos_usados_mes || 0}</span>
              </div>
              {creditos?.creditos_resetam_em && (
                <div className="text-xs text-white/60 pt-3 border-t border-white/10">
                  Próximo reset: {formatDate(creditos.creditos_resetam_em)}
                </div>
              )}
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card variant="gradient">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Transações Recentes
            </h3>
            {transacoes.length === 0 ? (
              <p className="text-center text-white/60 py-8">Nenhuma transação ainda</p>
            ) : (
              <div className="space-y-3">
                {transacoes.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{t.tipo}</p>
                      <p className="text-xs text-white/60">{formatDate(t.criado_em)}</p>
                    </div>
                    <span
                      className={`font-bold ${
                        t.valor > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {t.valor > 0 ? '+' : ''}
                      {t.valor}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      id: 'whitelabel',
      label: 'White-label',
      icon: <Palette />,
      hidden: !empresa?.whitelabel_ativo,
      content: (
        <Card variant="gradient">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Configurações White-label
            </h3>
            <Button variant="glass" icon={<Edit className="w-4 h-4" />} onClick={openWhitelabelModal}>
              Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Logo URL</label>
              <p className="text-sm text-white/80 truncate">{empresa?.logo_url || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Domínio Customizado</label>
              <p className="text-sm text-white/80">{empresa?.dominio_customizado || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Cor Primária</label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-white/20"
                  style={{ backgroundColor: empresa?.cor_primaria || '#8B5CF6' }}
                />
                <p className="text-sm text-white/80">{empresa?.cor_primaria || '#8B5CF6'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Cor Secundária</label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-white/20"
                  style={{ backgroundColor: empresa?.cor_secundaria || '#3B82F6' }}
                />
                <p className="text-sm text-white/80">{empresa?.cor_secundaria || '#3B82F6'}</p>
              </div>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Minha Empresa
          </h1>
          <p className="text-white/60 mt-2">Gerencie informações, plano e uso</p>
        </div>
        <Button variant="neon" icon={<Edit className="w-5 h-5" />} onClick={openEditModal}>
          Editar Empresa
        </Button>
      </motion.div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="overview" />

      {/* Edit Company Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Empresa"
        size="lg"
        footer={
          <>
            <Button variant="glass" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="neon" onClick={handleEditEmpresa} loading={submitting}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Nome da Empresa"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Telefone"
            placeholder="5511999999999"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          />
          <Input
            label="CNPJ/CPF"
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
          />
          <Input
            label="CEP"
            placeholder="00000-000"
            value={formData.cep}
            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
          />
          <div className="col-span-2">
            <Input
              label="Endereço"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            />
          </div>
          <Input
            label="Cidade"
            value={formData.cidade}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
          />
          <Input
            label="Estado"
            placeholder="SP"
            value={formData.estado}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          />
        </div>
      </Modal>

      {/* Edit Whitelabel Modal */}
      <Modal
        isOpen={showWhitelabelModal}
        onClose={() => setShowWhitelabelModal(false)}
        title="Configurações White-label"
        footer={
          <>
            <Button variant="glass" onClick={() => setShowWhitelabelModal(false)}>
              Cancelar
            </Button>
            <Button variant="neon" onClick={handleEditWhitelabel} loading={submitting}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="URL do Logo"
            placeholder="https://..."
            value={whitelabelData.logo_url}
            onChange={(e) => setWhitelabelData({ ...whitelabelData, logo_url: e.target.value })}
          />
          <Input
            label="Domínio Customizado"
            placeholder="app.suaempresa.com"
            value={whitelabelData.dominio_customizado}
            onChange={(e) => setWhitelabelData({ ...whitelabelData, dominio_customizado: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Cor Primária</label>
            <input
              type="color"
              value={whitelabelData.cor_primaria}
              onChange={(e) => setWhitelabelData({ ...whitelabelData, cor_primaria: e.target.value })}
              className="w-full h-12 rounded-lg border-2 border-white/10 bg-white/5 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Cor Secundária</label>
            <input
              type="color"
              value={whitelabelData.cor_secundaria}
              onChange={(e) => setWhitelabelData({ ...whitelabelData, cor_secundaria: e.target.value })}
              className="w-full h-12 rounded-lg border-2 border-white/10 bg-white/5 cursor-pointer"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
