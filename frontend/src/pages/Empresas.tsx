import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Edit,
  Activity,
  Palette,
  TrendingUp,
  Loader2
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

export default function Empresas() {
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [plano, setPlano] = useState<any>(null);
  const [uso, setUso] = useState<any>(null);
  const [creditos, setCreditos] = useState<any>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', documento: '', endereco: '', cidade: '', estado: '', cep: ''
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, planoRes, usoRes, credRes, transRes] = await Promise.allSettled([
        api.get('/empresa'),
        api.get('/empresa/plano'),
        api.get('/empresa/uso'),
        api.get('/empresa/creditos'),
        api.get('/empresa/transacoes', { params: { limite: 5 } })
      ]);

      if (empRes.status === 'fulfilled') setEmpresa(empRes.value.data.empresa || empRes.value.data);
      if (planoRes.status === 'fulfilled') setPlano(planoRes.value.data.plano_atual || planoRes.value.data);
      if (usoRes.status === 'fulfilled') setUso(usoRes.value.data);
      if (credRes.status === 'fulfilled') setCreditos(credRes.value.data);
      // Dados carregados com sucesso
    } catch (e) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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

  const getStatusBadge = (status: string) => {
    const variants: any = { ativo: 'success', trial: 'warning', inativo: 'info', bloqueado: 'danger' };
    return variants[status] || 'info';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const tabsList = [
    { id: 'overview', label: 'Visão Geral', icon: Building2 },
    { id: 'uso', label: 'Uso & Limites', icon: Activity },
    { id: 'creditos', label: 'Créditos', icon: TrendingUp },
  ];

  if (empresa?.whitelabel_ativo) {
    tabsList.push({ id: 'whitelabel', label: 'White-label', icon: Palette });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Minha Empresa
          </h1>
          <p className="text-white/60 mt-1">Status e recursos do seu plano</p>
        </div>
        <Button variant="neon" icon={<Edit className="w-5 h-5" />} onClick={openEditModal}>
          Editar Empresa
        </Button>
      </div>

      <div className="mb-6">
        <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} className="bg-white/5 p-1" />
      </div>

      <div className="mt-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <Card variant="glass" className="lg:col-span-2 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  Dados Cadastrais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">Nome</label>
                    <p className="text-white font-medium text-lg">{empresa?.nome}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">E-mail</label>
                    <p className="text-white/80">{empresa?.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">Documento</label>
                    <p className="text-white/80">{empresa?.documento || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadge(empresa?.status || '')} pulse>{empresa?.status}</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card variant="glass" className="p-6 border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Plano {plano?.nome}</h3>
                <div className="mb-6">
                  <p className="text-3xl font-bold text-white">
                    R$ {plano?.preco_mensal || 0}
                    <span className="text-sm text-white/40 font-normal ml-2">/mês</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Usuários</span>
                    <span className="text-white font-medium">{plano?.max_usuarios}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Instâncias</span>
                    <span className="text-white font-medium">{plano?.max_instancias}</span>
                  </div>
                </div>
                <Button variant="neon" className="w-full mt-8">Ver Planos</Button>
              </Card>
            </motion.div>
          )}

          {activeTab === 'uso' && (
            <motion.div
              key="uso"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="glass" className="p-8">
                <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Consumo de Recursos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Usuários</span>
                      <span className="text-white">{uso?.uso.usuarios} / {uso?.limites.max_usuarios}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${uso?.percentual.usuarios}%` }} className="h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Instâncias</span>
                      <span className="text-white">{uso?.uso.instancias} / {uso?.limites.max_instancias}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${uso?.percentual.instancias}%` }} className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Contatos</span>
                      <span className="text-white">{uso?.uso.contatos} / {uso?.limites.max_contatos}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${uso?.percentual.contatos}%` }} className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'creditos' && (
            <motion.div
              key="creditos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card variant="glass" className="p-8 text-center">
                <p className="text-white/60 mb-2 uppercase text-xs tracking-widest font-bold">Saldo Disponível</p>
                <h2 className="text-6xl font-bold text-white mb-6">{creditos?.saldo_creditos || 0}</h2>
                <Button variant="neon" className="w-full">Recarregar agora</Button>
              </Card>
              <Card variant="glass" className="p-8 text-center">
                <p className="text-white/60 mb-2 uppercase text-xs tracking-widest font-bold">Consumo do Mês</p>
                <h2 className="text-6xl font-bold text-purple-400 mb-6">{creditos?.creditos_usados_mes || 0}</h2>
                <p className="text-white/40 text-sm">Reset automático em 30 dias</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Empresa">
        <div className="space-y-4">
          <Input label="Nome da Empresa" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
          <Input label="E-mail Corporativo" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Button variant="neon" className="w-full mt-4" onClick={() => setShowEditModal(false)}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
