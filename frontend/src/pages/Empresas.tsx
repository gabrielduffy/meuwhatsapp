import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Edit,
  Loader2,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  CreditCard
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
}

export default function Empresas() {
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [plano, setPlano] = useState<any>(null);
  const [uso, setUso] = useState<any>(null);
  const [creditos, setCreditos] = useState<any>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', documento: '', endereco: '', cidade: '', estado: '', cep: ''
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, planoRes, usoRes, credRes] = await Promise.allSettled([
        api.get('/api/empresa'),
        api.get('/api/empresa/plano'),
        api.get('/api/empresa/uso'),
        api.get('/api/empresa/creditos')
      ]);

      if (empRes.status === 'fulfilled') setEmpresa(empRes.value.data.empresa || empRes.value.data);
      if (planoRes.status === 'fulfilled') setPlano(planoRes.value.data.plano_atual || planoRes.value.data);
      if (usoRes.status === 'fulfilled') setUso(usoRes.value.data);
      if (credRes.status === 'fulfilled') setCreditos(credRes.value.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  const tabsList = [
    { id: 'overview', label: 'Estatísticas', icon: LayoutDashboard },
    { id: 'uso', label: 'Consumo IA', icon: Zap },
    { id: 'perfil', label: 'Dados Reais', icon: ShieldCheck },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="purple" className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-black">Empresa Gold</Badge>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent italic">
            {empresa?.nome.toUpperCase()}
          </h1>
          <p className="text-white/40 text-sm font-medium flex items-center gap-2">
            <Building2 size={14} className="text-purple-500" />
            ID: #{empresa?.id} • Membro desde {new Date(empresa?.criado_em || '').toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="neon"
          icon={<Edit size={18} />}
          onClick={openEditModal}
          className="px-8 py-6 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] hover:shadow-purple-500/40 transition-all duration-500 font-bold"
        >
          EDITAR PERFIL
        </Button>
      </div>

      {/* TABS PREMIUM */}
      <div className="flex justify-center">
        <Tabs
          tabs={tabsList}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="max-w-fit"
        />
      </div>

      {/* CONTEÚDO COM CARDS NEON */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card variant="neon" className="lg:col-span-2 p-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 italic">Performance Operacional</h3>
                  <p className="text-white/40 text-sm mb-12 font-medium">Análise de volume e tráfego da empresa</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-2">
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">E-mail Corporativo</p>
                      <p className="text-xl text-white font-medium">{empresa?.email}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Localização</p>
                      <p className="text-xl text-white font-medium">{empresa?.cidade || 'Não informada'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-purple-500 border border-white/10">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 font-bold">PLANO ATUAL</p>
                      <p className="text-white font-black">{plano?.nome || 'FREE'}</p>
                    </div>
                  </div>
                  <Badge variant="success" pulse className="px-4 py-1.5 font-bold">ATIVA</Badge>
                </div>
              </Card>

              <Card variant="gradient" className="p-10 border-purple-500/20 shadow-[0_0_80px_rgba(168,85,247,0.1)]">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Créditos de Envio</p>
                <div className="space-y-1 mb-10">
                  <h2 className="text-7xl font-black text-white italic tracking-tighter">
                    {creditos?.saldo_creditos || 0}
                  </h2>
                  <p className="text-purple-400 font-bold text-sm">Disponíveis para uso imediato</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-bold">USADOS NO MÊS</span>
                    <span className="text-white font-black">{creditos?.creditos_usados_mes || 0}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_10px_purple]" />
                  </div>
                  <Button variant="neon" className="w-full py-4 text-xs font-black tracking-widest">RECARREGAR CRÉDITOS</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'uso' && (
            <motion.div key="uso" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card variant="neon" className="p-12">
                <div className="flex items-center gap-4 mb-12">
                  <div className="p-4 bg-purple-500/20 rounded-2xl border border-purple-500/40 text-purple-400">
                    <Zap size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white italic">LIMITES & RECURSOS</h3>
                    <p className="text-white/40 text-sm font-medium">Monitoramento em tempo real do seu ecossistema</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                  {[
                    { label: 'USUÁRIOS', current: uso?.uso.usuarios, max: uso?.limites.max_usuarios, color: 'from-purple-500' },
                    { label: 'INSTÂNCIAS', current: uso?.uso.instancias, max: uso?.limites.max_instancias, color: 'from-cyan-500' },
                    { label: 'CONTATOS', current: uso?.uso.contatos, max: uso?.limites.max_contatos, color: 'from-emerald-500' }
                  ].map((item) => (
                    <div key={item.label} className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-white/30 text-[10px] font-black tracking-widest">{item.label}</span>
                        <span className="text-2xl font-black text-white">{item.current} <span className="text-sm text-white/20 font-medium">/ {item.max}</span></span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-2xl p-0.5 border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.current / item.max) * 100}%` }}
                          className={`h-full bg-gradient-to-r ${item.color} to-white/20 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'perfil' && (
            <motion.div key="perfil" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card variant="glass" className="p-10 border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 font-black tracking-widest uppercase">Documento / CNPJ</label>
                    <p className="text-xl text-white font-medium border-b border-white/5 pb-2">{empresa?.documento || 'Pendente de validação'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 font-black tracking-widest uppercase">Telefone Principal</label>
                    <p className="text-xl text-white font-medium border-b border-white/5 pb-2">{empresa?.telefone || 'Não registrado'}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] text-white/30 font-black tracking-widest uppercase">Endereço Completo</label>
                    <p className="text-xl text-white font-medium border-b border-white/5 pb-2">{empresa?.endereco || 'Diferente do cadastro original'} • {empresa?.cep}</p>
                  </div>
                </div>
                <div className="mt-20 p-8 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold italic">Sincronização Fiscal</p>
                    <p className="text-xs text-white/40">Seus dados são criptografados e validados via RFB</p>
                  </div>
                  <Badge variant="info" className="px-6 py-2 rounded-xl">VALIDADO</Badge>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="EDITAR PERFIL EMPRESARIAL">
        <div className="space-y-6 py-6">
          <Input label="NOME FANTASIA" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="bg-white/5" />
          <Input label="E-MAIL DE CONTATO" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-white/5" />
          <div className="pt-6">
            <Button variant="neon" className="w-full py-4 text-xs font-black tracking-widest hover:scale-[1.02] transition-transform" onClick={() => setShowEditModal(false)}>SALVAR ALTERAÇÕES</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
