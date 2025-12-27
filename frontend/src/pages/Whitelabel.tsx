import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Save,
  Globe,
  Settings,
  Share2,
  Code,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  Plus,
  Shield,
  Search,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import api from '../services/api';

interface Config {
  nome_sistema?: string;
  logo_url?: string;
  logo_pequena_url?: string;
  favicon_url?: string;
  telefone_suporte?: string;
  email_suporte?: string;
  endereco?: string;
  meta_titulo?: string;
  meta_descricao?: string;
  meta_palavras_chave?: string;
  mostrar_powered_by?: boolean;
  permitir_cadastro_publico?: boolean;
  ativo?: boolean;
  tema?: {
    cor_primaria?: string;
    cor_secundaria?: string;
    fonte_principal?: string;
    fonte_titulo?: string;
  };
  redes_sociais?: {
    facebook_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
    youtube_url?: string;
  };
  css_customizado?: string;
}

interface Dominio {
  id: string;
  dominio: string;
  tipo: string;
  verificado: boolean;
  ativo: boolean;
  principal: boolean;
  criado_em: string;
}

type TabType = 'geral' | 'tema' | 'dominios' | 'seo' | 'redes-sociais' | 'avancado';

export default function Whitelabel() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('geral');
  const [config, setConfig] = useState<Config>({});
  const [dominios, setDominios] = useState<Dominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarModalDominio, setMostrarModalDominio] = useState(false);
  const [novoDominio, setNovoDominio] = useState('');
  const [tipoDominio, setTipoDominio] = useState<'principal' | 'adicional'>('principal');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar configuração
      const configRes = await api.get('/api/whitelabel/config');
      setConfig(configRes.data || {});

      // Carregar domínios
      const dominiosRes = await api.get('/api/whitelabel/dominios');
      setDominios(dominiosRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfigGeral = async () => {
    try {
      setSalvando(true);

      await api.put('/api/whitelabel/config', {
        nome_sistema: config.nome_sistema,
        logo_url: config.logo_url,
        logo_pequena_url: config.logo_pequena_url,
        favicon_url: config.favicon_url,
        telefone_suporte: config.telefone_suporte,
        email_suporte: config.email_suporte,
        endereco: config.endereco,
        mostrar_powered_by: config.mostrar_powered_by,
        permitir_cadastro_publico: config.permitir_cadastro_publico,
        ativo: config.ativo,
      });

      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  const salvarTema = async () => {
    try {
      setSalvando(true);

      await api.put('/api/whitelabel/config/tema', config.tema);

      alert('Tema aplicado com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao aplicar tema');
    } finally {
      setSalvando(false);
    }
  };

  const salvarSEO = async () => {
    try {
      setSalvando(true);

      await api.put('/api/whitelabel/config', {
        meta_titulo: config.meta_titulo,
        meta_descricao: config.meta_descricao,
        meta_palavras_chave: config.meta_palavras_chave,
      });

      alert('Configurações de SEO salvas com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao salvar SEO');
    } finally {
      setSalvando(false);
    }
  };

  const salvarRedesSociais = async () => {
    try {
      setSalvando(true);

      await api.put('/api/whitelabel/config/redes-sociais', config.redes_sociais);

      alert('Redes sociais salvas com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao salvar redes sociais');
    } finally {
      setSalvando(false);
    }
  };

  const salvarCSS = async () => {
    try {
      setSalvando(true);

      await api.put('/api/whitelabel/config/css', {
        css_customizado: config.css_customizado,
      });

      alert('CSS customizado salvo com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao salvar CSS');
    } finally {
      setSalvando(false);
    }
  };

  const adicionarDominio = async () => {
    if (!novoDominio.trim()) {
      alert('Digite um domínio válido');
      return;
    }

    try {
      setSalvando(true);

      await api.post('/api/whitelabel/dominios', {
        dominio: novoDominio,
        tipo: tipoDominio,
      });

      setNovoDominio('');
      setMostrarModalDominio(false);
      carregarDados();
      alert('Domínio adicionado! Agora você precisa verificá-lo.');
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao adicionar domínio');
    } finally {
      setSalvando(false);
    }
  };

  const verificarDominio = async (id: string) => {
    try {
      const res = await api.post(`/api/whitelabel/dominios/${id}/verificar`);
      alert(res.data.mensagem);
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.mensagem || error.response?.data?.erro || 'Erro ao verificar domínio');
    }
  };

  const ativarDominio = async (id: string, principal: boolean = false) => {
    try {
      await api.post(`/api/whitelabel/dominios/${id}/ativar`, { principal });
      alert('Domínio ativado com sucesso!');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao ativar domínio');
    }
  };

  const definirDominioPrincipal = async (id: string) => {
    try {
      await api.post(`/api/whitelabel/dominios/${id}/principal`);
      alert('Domínio definido como principal!');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao definir domínio principal');
    }
  };

  const deletarDominio = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este domínio?')) return;

    try {
      await api.delete(`/api/whitelabel/dominios/${id}`);
      alert('Domínio excluído com sucesso!');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.erro || 'Erro ao excluir domínio');
    }
  };

  const tabs = [
    { id: 'geral' as TabType, label: 'Geral', icon: Settings },
    { id: 'tema' as TabType, label: 'Tema', icon: Palette },
    { id: 'dominios' as TabType, label: 'Domínios', icon: Globe },
    { id: 'seo' as TabType, label: 'SEO', icon: Search },
    { id: 'redes-sociais' as TabType, label: 'Redes Sociais', icon: Share2 },
    { id: 'avancado' as TabType, label: 'Avançado', icon: Code },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando configurações...</p>
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
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">White Label</h1>
            <p className="text-sm text-white/60">Personalize sua plataforma com sua identidade visual</p>
          </div>
        </div>

        {config.ativo && (
          <Badge variant="success" size="md">
            <CheckCircle className="w-4 h-4" />
            Ativo
          </Badge>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-0 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAbaAtiva(tab.id)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${
                    abaAtiva === tab.id
                      ? 'border-purple-500 text-white bg-purple-500/10'
                      : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Conteúdo das Abas */}
      <AnimatePresence mode="wait">
        {/* Aba Geral */}
        {abaAtiva === 'geral' && (
          <motion.div
            key="geral"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Configurações Gerais
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Nome do Sistema
                  </label>
                  <input
                    type="text"
                    value={config.nome_sistema || ''}
                    onChange={(e) => setConfig({ ...config, nome_sistema: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Minha Plataforma WhatsApp"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Email de Suporte
                    </label>
                    <input
                      type="email"
                      value={config.email_suporte || ''}
                      onChange={(e) => setConfig({ ...config, email_suporte: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="suporte@meudominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Telefone de Suporte
                    </label>
                    <input
                      type="tel"
                      value={config.telefone_suporte || ''}
                      onChange={(e) => setConfig({ ...config, telefone_suporte: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    URL do Logo (Principal)
                  </label>
                  <input
                    type="url"
                    value={config.logo_url || ''}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://seudominio.com/logo.png"
                  />
                  <p className="text-xs text-white/40 mt-1">Logo exibido no topo da plataforma</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    URL do Logo (Pequeno)
                  </label>
                  <input
                    type="url"
                    value={config.logo_pequena_url || ''}
                    onChange={(e) => setConfig({ ...config, logo_pequena_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://seudominio.com/logo-small.png"
                  />
                  <p className="text-xs text-white/40 mt-1">Logo compacto para menus e mobile</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    URL do Favicon
                  </label>
                  <input
                    type="url"
                    value={config.favicon_url || ''}
                    onChange={(e) => setConfig({ ...config, favicon_url: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://seudominio.com/favicon.ico"
                  />
                  <p className="text-xs text-white/40 mt-1">Ícone exibido na aba do navegador</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.mostrar_powered_by || false}
                      onChange={(e) => setConfig({ ...config, mostrar_powered_by: e.target.checked })}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-white/80">Mostrar "Powered by"</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.permitir_cadastro_publico || false}
                      onChange={(e) => setConfig({ ...config, permitir_cadastro_publico: e.target.checked })}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-white/80">Permitir cadastro público</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.ativo || false}
                      onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-white/80">White Label Ativo</span>
                  </label>
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={salvarConfigGeral} loading={salvando}>
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Aba Tema */}
        {abaAtiva === 'tema' && (
          <motion.div
            key="tema"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-400" />
                Tema e Cores
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Cor Primária
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.tema?.cor_primaria || '#8B5CF6'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tema: { ...config.tema, cor_primaria: e.target.value },
                          })
                        }
                        className="w-20 h-12 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.tema?.cor_primaria || '#8B5CF6'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tema: { ...config.tema, cor_primaria: e.target.value },
                          })
                        }
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="#8B5CF6"
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-1">Cor principal dos botões e destaques</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Cor Secundária
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.tema?.cor_secundaria || '#06B6D4'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tema: { ...config.tema, cor_secundaria: e.target.value },
                          })
                        }
                        className="w-20 h-12 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.tema?.cor_secundaria || '#06B6D4'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tema: { ...config.tema, cor_secundaria: e.target.value },
                          })
                        }
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="#06B6D4"
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-1">Cor secundária para acentos e links</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Fonte Principal
                    </label>
                    <select
                      value={config.tema?.fonte_principal || 'Poppins'}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tema: { ...config.tema, fonte_principal: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Poppins">Poppins</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Fonte de Títulos
                    </label>
                    <select
                      value={config.tema?.fonte_titulo || 'Poppins'}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tema: { ...config.tema, fonte_titulo: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Poppins">Poppins</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={salvarTema} loading={salvando}>
                    <Save className="w-4 h-4" />
                    Aplicar Tema
                  </Button>
                </div>
              </div>
            </Card>

            {/* Preview */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Preview do Tema</h3>
              <div className="space-y-3">
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${config.tema?.cor_primaria || '#8B5CF6'}, ${config.tema?.cor_secundaria || '#06B6D4'})`,
                  }}
                >
                  <p className="text-white font-bold" style={{ fontFamily: config.tema?.fonte_titulo || 'Poppins' }}>
                    Título de Exemplo
                  </p>
                  <p className="text-white/90 text-sm mt-1" style={{ fontFamily: config.tema?.fonte_principal || 'Poppins' }}>
                    Este é um exemplo de texto com as cores e fontes selecionadas.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Aba Domínios */}
        {abaAtiva === 'dominios' && (
          <motion.div
            key="dominios"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  Domínios Personalizados
                </h2>
                <Button variant="primary" size="sm" onClick={() => setMostrarModalDominio(true)}>
                  <Plus className="w-4 h-4" />
                  Adicionar Domínio
                </Button>
              </div>

              {dominios.length > 0 ? (
                <div className="space-y-3">
                  {dominios.map((dominio) => (
                    <div
                      key={dominio.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium">{dominio.dominio}</p>
                          {dominio.principal && (
                            <Badge variant="purple" size="sm">
                              <Shield className="w-3 h-3" />
                              Principal
                            </Badge>
                          )}
                          {dominio.verificado ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="w-3 h-3" />
                              Verificado
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              <AlertCircle className="w-3 h-3" />
                              Pendente
                            </Badge>
                          )}
                          {dominio.ativo && (
                            <Badge variant="cyan" size="sm">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          Adicionado em {new Date(dominio.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {!dominio.verificado && (
                          <Button variant="glass" size="sm" onClick={() => verificarDominio(dominio.id)}>
                            <CheckCircle className="w-4 h-4" />
                            Verificar
                          </Button>
                        )}
                        {dominio.verificado && !dominio.ativo && (
                          <Button variant="success" size="sm" onClick={() => ativarDominio(dominio.id)}>
                            Ativar
                          </Button>
                        )}
                        {dominio.verificado && !dominio.principal && (
                          <Button variant="glass" size="sm" onClick={() => definirDominioPrincipal(dominio.id)}>
                            <Shield className="w-4 h-4" />
                            Principal
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deletarDominio(dominio.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/40">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum domínio personalizado configurado</p>
                  <p className="text-sm mt-1">Adicione um domínio para começar</p>
                </div>
              )}
            </Card>

            {/* Informações */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-400" />
                Como adicionar um domínio personalizado
              </h3>
              <ol className="space-y-2 text-sm text-white/70 list-decimal list-inside">
                <li>Adicione seu domínio usando o botão acima</li>
                <li>Configure um registro CNAME no seu provedor DNS apontando para nossa plataforma</li>
                <li>Aguarde a propagação do DNS (pode levar até 48 horas)</li>
                <li>Clique em "Verificar" para confirmar a configuração</li>
                <li>Ative o domínio após a verificação</li>
              </ol>
            </Card>
          </motion.div>
        )}

        {/* Aba SEO */}
        {abaAtiva === 'seo' && (
          <motion.div
            key="seo"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-400" />
                SEO & Meta Tags
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Meta Título
                  </label>
                  <input
                    type="text"
                    value={config.meta_titulo || ''}
                    onChange={(e) => setConfig({ ...config, meta_titulo: e.target.value })}
                    maxLength={60}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Minha Plataforma WhatsApp - Gestão Completa"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {config.meta_titulo?.length || 0}/60 caracteres
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Meta Descrição
                  </label>
                  <textarea
                    value={config.meta_descricao || ''}
                    onChange={(e) => setConfig({ ...config, meta_descricao: e.target.value })}
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Plataforma completa para gestão de WhatsApp com IA, automação e muito mais"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {config.meta_descricao?.length || 0}/160 caracteres
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Palavras-chave (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={config.meta_palavras_chave || ''}
                    onChange={(e) => setConfig({ ...config, meta_palavras_chave: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="whatsapp, automação, chatbot, crm"
                  />
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={salvarSEO} loading={salvando}>
                    <Save className="w-4 h-4" />
                    Salvar SEO
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Aba Redes Sociais */}
        {abaAtiva === 'redes-sociais' && (
          <motion.div
            key="redes-sociais"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-400" />
                Redes Sociais
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/suapagina' },
                  { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/seuperfil' },
                  { key: 'twitter_url', label: 'Twitter / X', placeholder: 'https://twitter.com/seuperfil' },
                  { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/suaempresa' },
                  { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@seucanal' },
                ].map((rede) => (
                  <div key={rede.key}>
                    <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      {rede.label}
                    </label>
                    <input
                      type="url"
                      value={(config.redes_sociais as any)?.[rede.key] || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          redes_sociais: { ...config.redes_sociais, [rede.key]: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={rede.placeholder}
                    />
                  </div>
                ))}

                <div className="pt-4">
                  <Button variant="primary" onClick={salvarRedesSociais} loading={salvando}>
                    <Save className="w-4 h-4" />
                    Salvar Redes Sociais
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Aba Avançado */}
        {abaAtiva === 'avancado' && (
          <motion.div
            key="avancado"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-400" />
                CSS Customizado
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Código CSS Personalizado
                  </label>
                  <textarea
                    value={config.css_customizado || ''}
                    onChange={(e) => setConfig({ ...config, css_customizado: e.target.value })}
                    rows={12}
                    className="w-full px-4 py-2 bg-gray-900 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`.custom-class {\n  color: #ffffff;\n  background: linear-gradient(135deg, #8B5CF6, #06B6D4);\n}`}
                    spellCheck={false}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Adicione CSS customizado para personalizar ainda mais sua plataforma
                  </p>
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={salvarCSS} loading={salvando}>
                    <Save className="w-4 h-4" />
                    Salvar CSS
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 mt-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Atenção
              </h3>
              <p className="text-sm text-white/70">
                CSS customizado pode afetar o funcionamento da plataforma. Use com cuidado e teste suas alterações em ambiente de desenvolvimento primeiro.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Adicionar Domínio */}
      <AnimatePresence>
        {mostrarModalDominio && (
          <Modal
            isOpen={mostrarModalDominio}
            onClose={() => !salvando && setMostrarModalDominio(false)}
            title="Adicionar Domínio Personalizado"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Domínio
                </label>
                <input
                  type="text"
                  value={novoDominio}
                  onChange={(e) => setNovoDominio(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="meudominio.com"
                />
                <p className="text-xs text-white/40 mt-1">Digite apenas o domínio sem http:// ou https://</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tipo de Domínio
                </label>
                <select
                  value={tipoDominio}
                  onChange={(e) => setTipoDominio(e.target.value as 'principal' | 'adicional')}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="principal">Principal</option>
                  <option value="adicional">Adicional</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="glass"
                  className="flex-1"
                  onClick={() => setMostrarModalDominio(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={adicionarDominio}
                  loading={salvando}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
