import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Search,
  History as HistoryIcon,
  MoreVertical,
  Plus,
  Play,
  BarChart,
  MapPin,
  ChevronDown,
  Database,
  ArrowRight,
  Terminal,
  FileDown,
  RefreshCw,
  ExternalLink,
  UserX,
  Instagram,
  Linkedin,
  ShoppingBag,
  Facebook,
  AtSign
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

interface HistoricoScraping {
  id: string;
  job_id: string;
  niche: string;
  city: string;
  leads_coletados: number;
  status: 'processando' | 'concluido' | 'falhado';
  mensagem_erro?: string;
  progresso: number;
  criado_em: string;
}

interface Campanha {
  id: string;
  nome: string;
  mensagem_modelo: string;
  status: 'rascunho' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
  total_leads: number;
  leads_enviados: number;
  leads_respondidos: number;
  criado_em: string;
}

export default function Prospeccao() {
  const [activeTab, setActiveTab] = useState<'scraping' | 'campanhas' | 'historico' | 'logs'>('scraping');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState({ niche: '', city: '', limit: 150 });
  const [historico, setHistorico] = useState<HistoricoScraping[]>([]);
  const [leadsMinerados, setLeadsMinerados] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leadsDoJob, setLeadsDoJob] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>(['gmaps']);
  const [loadingLeads, setLoadingLeads] = useState(false);

  useEffect(() => {
    let interval: any;

    if (activeTab === 'historico') {
      carregarHistorico();
      // Polling se houver itens processando
      interval = setInterval(() => {
        const temGenteProcessando = historico.some(h => h.status === 'processando');
        if (temGenteProcessando) {
          carregarHistorico();
        }
      }, 5000);
    }

    if (activeTab === 'campanhas') carregarCampanhas();
    if (activeTab === 'logs') {
      carregarLeadsMinerados();
      interval = setInterval(carregarLeadsMinerados, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, historico.some(h => h.status === 'processando')]);

  const carregarLeadsMinerados = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/prospeccao/scraper/leads/all');
      setLeadsMinerados(res.data);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/prospeccao/scraper/historico');
      setHistorico(res.data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleStartScrape = async () => {
    if (!searchData.niche || !searchData.city) {
      toast.error('Informe o nicho e a cidade');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/prospeccao/scraper/mapa', { ...searchData, sources });
      toast.success('Busca iniciada em segundo plano!');
      setActiveTab('historico');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao iniciar busca');
    } finally {
      setLoading(false);
    }
  };
  // Carregar leads quando expandir um item do histórico
  useEffect(() => {
    if (expandedId) {
      const item = historico.find(h => h.id === expandedId);
      if (item && item.job_id) {
        carregarLeadsDoJob(item.job_id);
      }
    } else {
      setLeadsDoJob([]);
    }
  }, [expandedId, historico]);

  const carregarLeadsDoJob = async (jobId: string) => {
    try {
      setLoadingLeads(true);
      setLeadsDoJob([]); // Limpa para não mostrar dados do job anterior
      const response = await api.get(`/api/prospeccao/scraper/leads/${jobId}`);
      setLeadsDoJob(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar leads do job:', error);
      setLeadsDoJob([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Prospecção</h1>
          <p className="text-white/60">Encontre novos leads por nicho e localização em tempo real.</p>
        </div>
        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-sm font-medium text-purple-400">Multi-Source Engine Ativo</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
        {[
          { id: 'scraping', label: 'Nova Busca', icon: Search },
          { id: 'campanhas', label: 'Minhas Campanhas', icon: Target },
          { id: 'historico', label: 'Histórico', icon: HistoryIcon },
          { id: 'logs', label: 'Logs & Leads', icon: Terminal },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'scraping' && (
          <motion.div
            key="scraping"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="glass" className="p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-3 mb-2 text-white/60">
                  <Search className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Scraping Estimado</span>
                </div>
                <p className="text-2xl font-bold text-white">150 leads/busca</p>
                <p className="text-[10px] text-purple-400 mt-1">{sources.length > 1 ? 'Multi-Source Engine active' : 'Google Maps Engine v2.0'}</p>
              </Card>
              <Card variant="glass" className="p-4 border-l-4 border-cyan-500">
                <div className="flex items-center gap-3 mb-2 text-white/60">
                  <Play className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Envios hoje</span>
                </div>
                <p className="text-2xl font-bold text-white">0 envios</p>
                <p className="text-[10px] text-cyan-400 mt-1">Total do dia</p>
              </Card>
              <Card variant="glass" className="p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3 mb-2 text-white/60">
                  <BarChart className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Taxa de Resposta</span>
                </div>
                <p className="text-2xl font-bold text-white">0%</p>
                <p className="text-[10px] text-yellow-400 mt-1">Média das campanhas</p>
              </Card>
            </div>

            {/* Busca Form */}
            <Card variant="glass" className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Search className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Buscar Leads</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase ml-1">Nicho / Palavra-chave</label>
                  <div className="relative group">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Ex: Contabilidade, Dentistas..."
                      value={searchData.niche}
                      onChange={(e) => setSearchData({ ...searchData, niche: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase ml-1">Cidade / Região</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Ex: São Paulo, Rio de Janeiro..."
                      value={searchData.city}
                      onChange={(e) => setSearchData({ ...searchData, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="primary"
                    className="w-full py-3 h-[46px] shadow-lg shadow-purple-500/20"
                    onClick={handleStartScrape}
                    loading={loading}
                    disabled={sources.length === 0}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Iniciar Prospecção
                  </Button>
                </div>
              </div>

              {/* Seleção de Fontes */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <label className="text-xs font-bold text-white/40 uppercase ml-1 mb-3 block">Fontes de Prospecção</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'gmaps', label: 'Google Maps', icon: MapPin, color: 'text-blue-400' },
                    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
                    { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
                    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-cyan-400' },
                    { id: 'olx', label: 'OLX / Classificados', icon: ShoppingBag, color: 'text-emerald-400' },
                    { id: 'threads', label: 'Threads', icon: AtSign, color: 'text-white' },
                  ].map((source) => (
                    <button
                      key={source.id}
                      onClick={() => {
                        if (sources.includes(source.id)) {
                          setSources(sources.filter(s => s !== source.id));
                        } else {
                          setSources([...sources, source.id]);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${sources.includes(source.id)
                        ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                      <div className={`p-2 rounded-lg bg-black/20 ${source.color}`}>
                        <source.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-semibold ${sources.includes(source.id) ? 'text-white' : 'text-white/40'}`}>
                        {source.label}
                      </span>
                      {sources.includes(source.id) && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Target className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/40 text-center px-6">Insira um nicho e cidade para começar a minerar contatos valiosos de diversas fontes em tempo real.</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'historico' && (
          <motion.div
            key="historico"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card variant="glass" className="overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5 text-purple-400" />
                    Histórico de Prospecções
                  </h2>
                  <p className="text-sm text-white/60">Todas as buscas realizadas pelo sistema.</p>
                </div>
                <Button variant="glass" size="sm" onClick={carregarHistorico} loading={loading}>
                  Atualizar
                </Button>
              </div>

              <div className="divide-y divide-white/5">
                {historico.length > 0 ? (
                  historico.map((item) => (
                    <div key={item.id} className="transition-colors group">
                      <div
                        className="p-4 hover:bg-white/5 cursor-pointer flex items-center justify-between"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'concluido' ? 'bg-green-500/10' :
                            item.status === 'falhado' ? 'bg-red-500/10' : 'bg-purple-500/10'
                            }`}>
                            <Database className={`w-5 h-5 ${item.status === 'concluido' ? 'text-green-400' :
                              item.status === 'falhado' ? 'text-red-400' : 'text-purple-400'
                              }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold">{item.niche}</p>
                              <span className="text-white/40 text-xs">•</span>
                              <p className="text-white/60 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.city}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="purple" size="sm">
                                {item.leads_coletados} contatos
                              </Badge>
                              <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                                {new Date(item.criado_em).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            {item.status === 'processando' && (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] text-yellow-400 font-bold uppercase">Em Progresso ({(item.progresso || 0)}%)</span>
                                <div className="w-24 bg-white/5 h-1 rounded-full overflow-hidden">
                                  <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${(item.progresso || 0)}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                          {item.status === 'processando' && (
                            <Badge variant="warning" size="sm" className="animate-pulse">
                              Processando
                            </Badge>
                          )}
                          {item.status === 'concluido' && (
                            <Badge variant="success" size="sm">
                              Concluído
                            </Badge>
                          )}
                          {item.status === 'falhado' && (
                            <Badge variant="danger" size="sm">
                              Falhou
                            </Badge>
                          )}
                          <motion.div
                            animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                            className="p-2 text-white/20 hover:text-white"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedId === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white/[0.02]"
                          >
                            <div className="p-6 border-t border-white/5 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-white/40 uppercase font-bold">Status do Job</span>
                                  <p className="text-xs text-white/80 font-mono">{item.job_id || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-white/40 uppercase font-bold">Progresso Total</span>
                                  <p className="text-sm text-white font-bold">{(item.progresso || 0)}%</p>
                                </div>
                                <div className="flex justify-end items-center">
                                  <Button
                                    variant="glass"
                                    size="sm"
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/prospeccao/scraper/exportar?jobId=${item.job_id}`, '_blank');
                                    }}
                                  >
                                    <FileDown className="w-4 h-4" />
                                    Exportar CSV da Busca
                                  </Button>
                                </div>
                              </div>

                              {item.mensagem_erro && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                                  <div className="flex items-center gap-2 text-red-400">
                                    <Terminal className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Log de Erro</span>
                                  </div>
                                  <pre className="text-xs text-red-200/80 font-mono whitespace-pre-wrap leading-relaxed">
                                    {item.mensagem_erro}
                                  </pre>
                                </div>
                              )}

                              {item.status === 'processando' && (
                                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
                                  <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                                  <p className="text-sm text-white/60">Aguardando novos contatos serem minerados...</p>
                                </div>
                              )}

                              {/* Tabela de Leads Extraídos */}
                              <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Contatos Extraídos</h4>
                                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    {leadsDoJob.length} encontrados
                                  </span>
                                </div>

                                {loadingLeads ? (
                                  <div className="py-10 flex flex-col items-center justify-center gap-3 bg-white/[0.01] rounded-xl border border-white/5">
                                    <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                                    <p className="text-xs text-white/40 italic">Buscando contatos no servidor...</p>
                                  </div>
                                ) : leadsDoJob.length > 0 ? (
                                  <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-white/5 border-b border-white/5 text-[10px] text-white/40 uppercase font-bold">
                                          <th className="px-4 py-3">Nome / Local</th>
                                          <th className="px-4 py-3">Fonte</th>
                                          <th className="px-4 py-3">Telefone</th>
                                          <th className="px-4 py-3 text-right whitespace-nowrap">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                        {leadsDoJob.map((lead) => (
                                          <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                            <td className="px-4 py-3">
                                              <div className="flex flex-col">
                                                <span className="text-xs text-white font-medium truncate max-w-[200px]">{lead.nome || 'N/A'}</span>
                                                {lead.metadados?.city && (
                                                  <span className="text-[10px] text-white/30 truncate">{lead.metadados.city}</span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <Badge
                                                variant={
                                                  lead.metadados?.source === 'instagram' ? 'purple' :
                                                    lead.metadados?.source === 'linkedin' ? 'cyan' :
                                                      lead.metadados?.source === 'facebook' ? 'info' :
                                                        lead.metadados?.source === 'threads' ? 'purple' :
                                                          lead.metadados?.source === 'olx' ? 'success' : 'info'
                                                }
                                                size="sm"
                                                className="text-[9px] uppercase tracking-tighter"
                                              >
                                                {lead.metadados?.source || 'G-Maps'}
                                              </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-purple-400">
                                              {lead.telefone}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <Button
                                                  variant="glass"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                  onClick={() => window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank')}
                                                  title="Abrir no WhatsApp"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="py-10 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                                    <UserX className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Nenhum contato salvo ainda</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <HistoryIcon className="w-12 h-12 text-white/10 mx-auto" />
                    <p className="text-white/40">Nenhuma busca realizada no histórico.</p>
                    <Button variant="glass" size="sm" onClick={carregarHistorico} className="mx-auto">
                      <RefreshCw className="w-4 h-4" />
                      Tentar Carregar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status das Buscas Recentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historico.filter(h => h.status === 'processando' || h.status === 'falhado').slice(0, 4).map(h => (
                <Card key={h.id} variant="glass" className="p-4 border-l-4 border-yellow-500 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{h.niche} em {h.city}</span>
                    <Badge variant={h.status === 'processando' ? 'warning' : 'danger'} size="sm">
                      {h.status === 'processando' ? `${h.progresso}%` : 'Falhou'}
                    </Badge>
                  </div>
                  {h.status === 'processando' ? (
                    <div className="space-y-2">
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${h.progresso}%` }} />
                      </div>
                      <p className="text-[10px] text-white/40 italic flex items-center gap-1 truncate" title={h.mensagem_erro}>
                        <RefreshCw className="w-3 h-3 animate-spin" /> {h.mensagem_erro || 'Iniciando minerador...'} | {h.leads_coletados} encontrados
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-red-400 font-mono truncate">{h.mensagem_erro || 'Erro desconhecido'}</p>
                  )}
                </Card>
              ))}
            </div>

            <Card variant="glass" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    Leads Minerados
                  </h2>
                  <p className="text-sm text-white/60">Contatos recentes encontrados pelo sistema.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="glass" size="sm" onClick={carregarLeadsMinerados}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/prospeccao/scraper/exportar`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar Tudo (CSV)
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Local</th>
                      <th className="py-3 px-4">Job ID</th>
                      <th className="py-3 px-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leadsMinerados.length > 0 ? (
                      leadsMinerados.map((lead) => (
                        <tr key={lead.id} className="text-sm text-white/80 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-medium text-white">{lead.nome}</td>
                          <td className="py-4 px-4 font-mono text-emerald-400">{lead.telefone}</td>
                          <td className="py-4 px-4 text-xs font-semibold uppercase">{lead.metadados?.city || lead.variaveis?.city}</td>
                          <td className="py-4 px-4 text-[10px] font-mono opacity-40">{(lead.metadados?.job_id || lead.variaveis?.job_id || '').slice(0, 8)}...</td>
                          <td className="py-4 px-4 text-[10px] whitespace-nowrap">{new Date(lead.criado_em).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-white/40 italic">Nenhum log disponível. Inicie uma busca para ver resultados aqui.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'campanhas' && (
          <motion.div
            key="campanhas"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Gestão de Campanhas</h2>
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" />
                Nova Campanha
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campanhas.length > 0 ? (
                campanhas.map((campanha) => (
                  <Card key={campanha.id} variant="glass" className="hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant={campanha.status === 'em_andamento' ? 'success' : 'info'} size="sm">
                        {campanha.status}
                      </Badge>
                      <button className="text-white/40 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{campanha.nome}</h3>
                    <div className="space-y-3">
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(campanha.leads_enviados / (campanha.total_leads || 1)) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-white/60">{campanha.leads_enviados} / {campanha.total_leads} leads</span>
                        <span className="text-purple-400">{Math.round((campanha.leads_enviados / (campanha.total_leads || 1)) * 100)}%</span>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                  <Target className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40">Nenhuma campanha ativa no momento.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
