import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Play,
  Pause,
  Trash2,
  Upload,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart,
  FileSpreadsheet,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../services/api';

interface Campanha {
  id: string;
  nome: string;
  mensagem_template: string;
  instancia_id: string;
  status: 'rascunho' | 'ativa' | 'pausada' | 'concluida' | 'cancelada';
  total_leads: number;
  leads_enviados: number;
  leads_respondidos: number;
  agendamento_inicio?: string;
  intervalo_min?: number;
  intervalo_max?: number;
  criado_em: string;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  status: 'pendente' | 'enviado' | 'respondido' | 'erro' | 'agendado';
  variaveis?: any;
  agendar_para?: string;
  criado_em: string;
}

interface Estatisticas {
  total_leads: number;
  leads_enviados: number;
  leads_respondidos: number;
  taxa_resposta: number;
  taxa_envio: number;
}

export default function Prospeccao() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarModalCampanha, setMostrarModalCampanha] = useState(false);
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    mensagem_template: '',
    instancia_id: '',
    intervalo_min: 30,
    intervalo_max: 60,
  });

  useEffect(() => {
    carregarCampanhas();
  }, []);

  useEffect(() => {
    if (campanhaSelecionada) {
      carregarLeads(campanhaSelecionada.id);
      carregarEstatisticas(campanhaSelecionada.id);
    }
  }, [campanhaSelecionada]);

  const carregarCampanhas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/prospeccao/campanhas');
      setCampanhas(res.data.campanhas || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarLeads = async (campanhaId: string) => {
    try {
      const res = await api.get(`/api/prospeccao/campanhas/${campanhaId}/leads`);
      setLeads(res.data.leads || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    }
  };

  const carregarEstatisticas = async (campanhaId: string) => {
    try {
      const res = await api.get(`/api/prospeccao/campanhas/${campanhaId}/estatisticas`);
      setEstatisticas(res.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const criarCampanha = async () => {
    try {
      setSalvando(true);
      await api.post('/api/prospeccao/campanhas', novaCampanha);
      setMostrarModalCampanha(false);
      setNovaCampanha({
        nome: '',
        mensagem_template: '',
        instancia_id: '',
        intervalo_min: 30,
        intervalo_max: 60,
      });
      carregarCampanhas();
      alert('Campanha criada com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao criar campanha');
    } finally {
      setSalvando(false);
    }
  };

  const deletarCampanha = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      await api.delete(`/api/prospeccao/campanhas/${id}`);
      alert('Campanha excluída com sucesso!');
      carregarCampanhas();
      if (campanhaSelecionada?.id === id) {
        setCampanhaSelecionada(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao excluir campanha');
    }
  };

  const iniciarCampanha = async (id: string) => {
    try {
      await api.post(`/api/prospeccao/campanhas/${id}/iniciar`);
      alert('Campanha iniciada!');
      carregarCampanhas();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao iniciar campanha');
    }
  };

  const pausarCampanha = async (id: string) => {
    try {
      await api.post(`/api/prospeccao/campanhas/${id}/pausar`);
      alert('Campanha pausada!');
      carregarCampanhas();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao pausar campanha');
    }
  };

  const handleImportarLeads = async (file: File) => {
    if (!campanhaSelecionada) return;

    try {
      setSalvando(true);

      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      // Processar CSV simples: nome,telefone
      const leads = lines.slice(1).map((line) => {
        const [nome, telefone] = line.split(',').map((s) => s.trim());
        return { nome, telefone };
      });

      await api.post(`/api/prospeccao/campanhas/${campanhaSelecionada.id}/importar`, {
        leads,
        nomeArquivo: file.name,
      });

      setMostrarModalImportar(false);
      alert(`${leads.length} leads importados com sucesso!`);
      carregarLeads(campanhaSelecionada.id);
      carregarCampanhas();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao importar leads');
    } finally {
      setSalvando(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      rascunho: { variant: 'info' as const, label: 'Rascunho' },
      ativa: { variant: 'success' as const, label: 'Ativa' },
      pausada: { variant: 'warning' as const, label: 'Pausada' },
      concluida: { variant: 'purple' as const, label: 'Concluída' },
      cancelada: { variant: 'danger' as const, label: 'Cancelada' },
    };
    const badge = badges[status as keyof typeof badges] || badges.rascunho;
    return <Badge variant={badge.variant} size="sm">{badge.label}</Badge>;
  };

  const getLeadStatusBadge = (status: string) => {
    const badges = {
      pendente: { variant: 'info' as const, label: 'Pendente', icon: Clock },
      enviado: { variant: 'success' as const, label: 'Enviado', icon: CheckCircle },
      respondido: { variant: 'purple' as const, label: 'Respondido', icon: MessageSquare },
      erro: { variant: 'danger' as const, label: 'Erro', icon: AlertCircle },
      agendado: { variant: 'warning' as const, label: 'Agendado', icon: Clock },
    };
    const badge = badges[status as keyof typeof badges] || badges.pendente;
    const Icon = badge.icon;
    return (
      <Badge variant={badge.variant} size="sm">
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando campanhas...</p>
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
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Prospecção de Leads</h1>
            <p className="text-sm text-white/60">Campanhas de mensagens automatizadas</p>
          </div>
        </div>

        <Button variant="primary" onClick={() => setMostrarModalCampanha(true)}>
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Campanhas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card>
            <h2 className="text-lg font-bold text-white mb-4">Minhas Campanhas</h2>
            {campanhas.length > 0 ? (
              <div className="space-y-2">
                {campanhas.map((campanha) => (
                  <div
                    key={campanha.id}
                    onClick={() => setCampanhaSelecionada(campanha)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      campanhaSelecionada?.id === campanha.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium text-sm truncate">{campanha.nome}</p>
                      {getStatusBadge(campanha.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campanha.total_leads || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {campanha.leads_enviados || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma campanha criada</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Detalhes da Campanha */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {campanhaSelecionada ? (
            <>
              {/* Header da Campanha */}
              <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{campanhaSelecionada.nome}</h2>
                    {getStatusBadge(campanhaSelecionada.status)}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {campanhaSelecionada.status === 'rascunho' && (
                      <Button variant="success" size="sm" onClick={() => iniciarCampanha(campanhaSelecionada.id)}>
                        <Play className="w-4 h-4" />
                        Iniciar
                      </Button>
                    )}
                    {campanhaSelecionada.status === 'ativa' && (
                      <Button variant="glass" size="sm" onClick={() => pausarCampanha(campanhaSelecionada.id)}>
                        <Pause className="w-4 h-4" />
                        Pausar
                      </Button>
                    )}
                    {campanhaSelecionada.status === 'pausada' && (
                      <Button variant="success" size="sm" onClick={() => iniciarCampanha(campanhaSelecionada.id)}>
                        <Play className="w-4 h-4" />
                        Retomar
                      </Button>
                    )}
                    <Button variant="glass" size="sm" onClick={() => setMostrarModalImportar(true)}>
                      <Upload className="w-4 h-4" />
                      Importar Leads
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => deletarCampanha(campanhaSelecionada.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-xs text-white/60 mb-1">Mensagem Template:</p>
                  <p className="text-sm text-white/90">{campanhaSelecionada.mensagem_template}</p>
                </div>
              </Card>

              {/* Estatísticas */}
              {estatisticas && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <p className="text-sm text-white/60">Total de Leads</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{estatisticas.total_leads}</p>
                  </Card>

                  <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <MessageSquare className="w-5 h-5 text-cyan-400" />
                      <p className="text-sm text-white/60">Enviados</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{estatisticas.leads_enviados}</p>
                    <p className="text-xs text-cyan-400 mt-1">{estatisticas.taxa_envio}% taxa</p>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <p className="text-sm text-white/60">Respondidos</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{estatisticas.leads_respondidos}</p>
                    <p className="text-xs text-green-400 mt-1">{estatisticas.taxa_resposta}% taxa</p>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <p className="text-sm text-white/60">Pendentes</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {estatisticas.total_leads - estatisticas.leads_enviados}
                    </p>
                  </Card>
                </div>
              )}

              {/* Lista de Leads */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Leads da Campanha</h3>
                  <span className="text-sm text-white/60">{leads.length} leads</span>
                </div>

                {leads.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-medium text-white/60 pb-2">Nome</th>
                          <th className="text-left text-xs font-medium text-white/60 pb-2">Telefone</th>
                          <th className="text-left text-xs font-medium text-white/60 pb-2">Status</th>
                          <th className="text-left text-xs font-medium text-white/60 pb-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.slice(0, 50).map((lead) => (
                          <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 text-sm text-white">{lead.nome}</td>
                            <td className="py-2 text-sm text-white/80">{lead.telefone}</td>
                            <td className="py-2">{getLeadStatusBadge(lead.status)}</td>
                            <td className="py-2 text-xs text-white/60">
                              {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/40">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum lead nesta campanha</p>
                    <p className="text-xs mt-1">Importe leads para começar</p>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="text-center py-12">
              <BarChart className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">Selecione uma campanha</h3>
              <p className="text-white/60">Escolha uma campanha à esquerda para ver os detalhes</p>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Modal Nova Campanha */}
      <AnimatePresence>
        {mostrarModalCampanha && (
          <Modal
            isOpen={mostrarModalCampanha}
            onClose={() => !salvando && setMostrarModalCampanha(false)}
            title="Nova Campanha de Prospecção"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Nome da Campanha</label>
                <input
                  type="text"
                  value={novaCampanha.nome}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Black Friday 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Mensagem Template</label>
                <textarea
                  value={novaCampanha.mensagem_template}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, mensagem_template: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Olá {{nome}}, temos uma oferta especial..."
                />
                <p className="text-xs text-white/40 mt-1">Use {'{{nome}}'} para personalizar</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Intervalo Min (s)</label>
                  <input
                    type="number"
                    value={novaCampanha.intervalo_min}
                    onChange={(e) =>
                      setNovaCampanha({ ...novaCampanha, intervalo_min: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Intervalo Max (s)</label>
                  <input
                    type="number"
                    value={novaCampanha.intervalo_max}
                    onChange={(e) =>
                      setNovaCampanha({ ...novaCampanha, intervalo_max: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="glass" className="flex-1" onClick={() => setMostrarModalCampanha(false)} disabled={salvando}>
                  Cancelar
                </Button>
                <Button variant="primary" className="flex-1" onClick={criarCampanha} loading={salvando}>
                  Criar Campanha
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Modal Importar Leads */}
      <AnimatePresence>
        {mostrarModalImportar && (
          <Modal
            isOpen={mostrarModalImportar}
            onClose={() => !salvando && setMostrarModalImportar(false)}
            title="Importar Leads (CSV)"
          >
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-white/80 mb-2">Formato do arquivo CSV:</p>
                <code className="text-xs text-blue-400 bg-black/30 p-2 rounded block">
                  nome,telefone{'\n'}
                  João Silva,5511999999999{'\n'}
                  Maria Santos,5511888888888
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Selecione o arquivo CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImportarLeads(e.target.files[0]);
                    }
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-700"
                  disabled={salvando}
                />
              </div>

              <Button variant="glass" className="w-full" onClick={() => setMostrarModalImportar(false)} disabled={salvando}>
                Cancelar
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
