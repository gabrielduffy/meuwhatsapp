import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Globe,
  Settings,
  Search,
  Share2,
  Image as ImageIcon,
  Loader2,
  Plus,
  ExternalLink,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Card, Button, Input, Modal, Badge, Tabs } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Config {
  nome_sistema?: string;
  logo_url?: string;
  logo_pequena_url?: string;
  favicon_url?: string;
  telefone_suporte?: string;
  email_suporte?: string;
  mostrar_powered_by?: boolean;
  permitir_cadastro_publico?: boolean;
  ativo?: boolean;
  tema?: {
    cor_primaria?: string;
    cor_secundaria?: string;
  };
  dominio_customizado?: string;
}

export default function Whitelabel() {
  const [activeTab, setActiveTab] = useState('geral');
  const [config, setConfig] = useState<Config>({});
  const [dominios, setDominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, dominiosRes] = await Promise.all([
        api.get('/api/whitelabel/config'),
        api.get('/api/whitelabel/dominios')
      ]);
      setConfig(configRes.data || {});
      setDominios(dominiosRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSave = async (payload: any, successMsg: string = 'Salvo com sucesso!') => {
    try {
      setSubmitting(true);
      await api.put('/api/whitelabel/config', payload);
      toast.success(successMsg);
      carregarDados();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAction = (config: any) => {
    setConfirmConfig(config);
    setShowConfirmModal(true);
  };

  const handleDeleteDominio = (id: string, dominio: string) => {
    confirmAction({
      title: 'Excluir Domínio',
      message: `Tem certeza que deseja remover o domínio ${dominio}? Isso pode remover o acesso da plataforma através deste endereço.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/whitelabel/dominios/${id}`);
          toast.success('Domínio removido!');
          carregarDados();
        } catch (error) {
          toast.error('Erro ao remover domínio');
        }
      }
    });
  };

  const tabsList = [
    { id: 'geral', label: 'Geral', icon: Settings },
    { id: 'tema', label: 'Cores', icon: Palette },
    { id: 'dominios', label: 'Domínios', icon: Globe },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'social', label: 'Social', icon: Share2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl shadow-lg shadow-purple-500/20">
            <Palette className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">White Label</h1>
            <p className="text-white/60 text-sm">Controle total sobre a marca da sua plataforma</p>
          </div>
        </div>
        {config.ativo && <Badge variant="success" pulse>Sistema Ativo</Badge>}
      </div>

      <div className="mb-8">
        <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div key="geral" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <Card variant="glass" className="p-6 max-w-4xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon size={20} className="text-purple-400" />
                  Identidade Visual & Logos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Input
                    label="Nome da Plataforma"
                    value={config.nome_sistema || ''}
                    onChange={e => setConfig({ ...config, nome_sistema: e.target.value })}
                    placeholder="Ex: MeuZap Pro"
                  />
                  <Input
                    label="E-mail de Suporte"
                    value={config.email_suporte || ''}
                    onChange={e => setConfig({ ...config, email_suporte: e.target.value })}
                  />
                  <Input
                    label="Logo Principal (URL)"
                    value={config.logo_url || ''}
                    onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                  />
                  <Input
                    label="Favicon (URL)"
                    value={config.favicon_url || ''}
                    onChange={e => setConfig({ ...config, favicon_url: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-6 p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex-1">
                    <p className="text-white font-medium">Status do White Label</p>
                    <p className="text-xs text-white/40">Ative para aplicar sua marca em toda a plataforma.</p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, ativo: !config.ativo })}
                    className={`w - 12 h - 6 rounded - full transition - colors relative ${config.ativo ? 'bg-purple-600' : 'bg-white/10'} `}
                  >
                    <div className={`absolute top - 1 w - 4 h - 4 bg - white rounded - full transition - all ${config.ativo ? 'right-1' : 'left-1'} `} />
                  </button>
                </div>
                <Button variant="neon" className="mt-8 px-10" loading={submitting} onClick={() => handleSave(config)}>Salvar Alterações</Button>
              </Card>
            </motion.div>
          )}

          {activeTab === 'tema' && (
            <motion.div key="tema" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <Card variant="glass" className="p-6 max-w-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Paleta de Cores</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm text-white/60 font-medium">Cor Primária</label>
                    <div className="flex gap-3">
                      <input type="color" value={config.tema?.cor_primaria || '#8B5CF6'} onChange={e => setConfig({ ...config, tema: { ...config.tema, cor_primaria: e.target.value } })} className="w-12 h-12 bg-transparent cursor-pointer" />
                      <Input value={config.tema?.cor_primaria || '#8B5CF6'} className="flex-1" onChange={e => setConfig({ ...config, tema: { ...config.tema, cor_primaria: e.target.value } })} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm text-white/60 font-medium">Cor Secundária</label>
                    <div className="flex gap-3">
                      <input type="color" value={config.tema?.cor_secundaria || '#3B82F6'} onChange={e => setConfig({ ...config, tema: { ...config.tema, cor_secundaria: e.target.value } })} className="w-12 h-12 bg-transparent cursor-pointer" />
                      <Input value={config.tema?.cor_secundaria || '#3B82F6'} className="flex-1" onChange={e => setConfig({ ...config, tema: { ...config.tema, cor_secundaria: e.target.value } })} />
                    </div>
                  </div>
                </div>
                <Button variant="neon" className="mt-10 w-full" onClick={() => handleSave(config, 'Tema atualizado!')}>Aplicar Novo Design</Button>
              </Card>
            </motion.div>
          )}

          {activeTab === 'dominios' && (
            <motion.div key="dominios" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="glass" className="md:col-span-2 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Globe size={20} className="text-cyan-400" /> Meus Domínios</h3>
                    <Button variant="glass" size="sm" icon={<Plus size={16} />}>Novo Domínio</Button>
                  </div>
                  <div className="space-y-3">
                    {dominios.length === 0 ? <p className="text-white/40 text-center py-10 italic italic">Nenhum domínio configurado</p> : dominios.map(d => (
                      <div key={d.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-3">
                          <Globe size={18} className="text-white/40" />
                          <span className="text-white font-medium">{d.dominio}</span>
                          {d.principal && <Badge variant="purple" size="sm">Principal</Badge>}
                          {d.verificado ? <Badge variant="success">Apontado</Badge> : <Badge variant="warning">Pendente DNS</Badge>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="glass" size="sm" icon={<ExternalLink size={14} />} />
                          <Button variant="glass" size="sm" className="text-red-400" icon={<Trash2 size={14} />} onClick={() => handleDeleteDominio(d.id, d.dominio)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card variant="glass" className="p-6 bg-purple-500/5 border-purple-500/20">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2 italic"><AlertCircle size={16} /> Como apontar?</h4>
                  <ul className="text-xs text-white/50 space-y-3 leading-relaxed">
                    <li className="flex gap-2"><div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</div> Crie um registro CNAME</li>
                    <li className="flex gap-2"><div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</div> Aponte para: <code className="text-purple-400">servidor.benemax.com.br</code></li>
                    <li className="flex gap-2"><div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</div> Aguarde até 24h para propagação</li>
                  </ul>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={confirmConfig?.title}>
        <div className="py-4">
          <p className="text-white/80">{confirmConfig?.message}</p>
          <div className="flex gap-2 mt-8">
            <Button variant="glass" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
            <Button variant={confirmConfig?.danger ? 'danger' : 'neon'} className="flex-1" onClick={() => { confirmConfig?.onConfirm(); setShowConfirmModal(false); }}>Confirmar Exclusão</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
