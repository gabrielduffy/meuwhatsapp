import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Activity,
  Settings,
  LayoutDashboard,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  TrendingUp,
  Server,
  Database,
  Cpu,
  BarChart3,
  Clock,
  MessageSquare,
  Phone,
  Globe
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import api from '../services/api';
import toast from 'react-hot-toast';

type TabType = 'visao-geral' | 'usuarios' | 'metricas' | 'configuracoes';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  funcao: 'usuario' | 'administrador' | 'empresa';
  ativo: boolean;
  criado_em: string;
  ultimo_acesso?: string;
}

interface Empresa {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  status: string;
  plano_id?: string;
  whitelabel_ativo: boolean;
  saldo_creditos?: number;
}

interface Uso {
  uso: {
    usuarios: number;
    instancias: number;
    contatos: number;
    creditos_usados_mes: number;
  };
  limites: {
    max_usuarios: number;
    max_instancias: number;
    max_contatos: number;
  };
  percentual: {
    usuarios: string;
    instancias: string;
    contatos: string;
  };
}

interface Metricas {
  global?: {
    totalMessages?: number;
    totalInstances?: number;
    activeConnections?: number;
    uptime?: number;
    system?: {
      cpu: number;
      memory: number;
      memoryUsed: number;
      memoryTotal: number;
      load: string;
    };
  };
  instances?: Record<string, any>;
}

interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  funcao: 'usuario' | 'administrador';
}

export default function Manager() {
  const [abaAtiva, setAbaAtiva] = useState<TabType>('visao-geral');
  const [carregando, setCarregando] = useState(true);

  // Estados para dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [metricas, setMetricas] = useState<Metricas | null>(null);

  // Estados para modais
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [acaoConfirmar, setAcaoConfirmar] = useState<(() => void) | null>(null);
  const [mensagemConfirmar, setMensagemConfirmar] = useState('');

  // Formulário novo usuário
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuario>({
    nome: '',
    email: '',
    senha: '',
    funcao: 'usuario'
  });

  // Formulário editar usuário
  const [dadosEdicao, setDadosEdicao] = useState({
    nome: '',
    email: '',
    funcao: 'usuario' as 'usuario' | 'administrador',
    ativo: true
  });

  useEffect(() => {
    carregarDados();
  }, [abaAtiva]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      if (abaAtiva === 'visao-geral') {
        await Promise.all([
          carregarEmpresa(),
          carregarUso(),
          carregarUsuarios()
        ]);
      } else if (abaAtiva === 'usuarios') {
        await carregarUsuarios();
      } else if (abaAtiva === 'metricas') {
        await carregarMetricas();
      } else if (abaAtiva === 'configuracoes') {
        await carregarEmpresa();
      }
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const carregarEmpresa = async () => {
    try {
      const { data } = await api.get('/api/empresa');
      setEmpresa(data.empresa);
    } catch (erro) {
      console.error('Erro ao carregar empresa:', erro);
    }
  };

  const carregarUso = async () => {
    try {
      const { data } = await api.get('/api/empresa/uso');
      setUso(data);
    } catch (erro) {
      console.error('Erro ao carregar uso:', erro);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const { data } = await api.get('/api/usuarios');
      setUsuarios(data.usuarios || []);
    } catch (erro) {
      console.error('Erro ao carregar usuários:', erro);
    }
  };

  const carregarMetricas = async () => {
    try {
      const { data } = await api.get('/metrics/all');
      setMetricas(data);
    } catch (erro) {
      console.error('Erro ao carregar métricas:', erro);
    }
  };

  const handleCriarUsuario = async () => {
    try {
      await api.post('/api/usuarios', novoUsuario);
      setModalUsuario(false);
      setNovoUsuario({ nome: '', email: '', senha: '', funcao: 'usuario' });
      await carregarUsuarios();
    } catch (erro: any) {
      toast.error(erro.response?.data?.erro || 'Erro ao processar requisição');
    }
  };

  const handleEditarUsuario = async () => {
    if (!usuarioEditando) return;

    try {
      await api.put(`/api/usuarios/${usuarioEditando.id}`, dadosEdicao);
      setUsuarioEditando(null);
      await carregarUsuarios();
    } catch (erro: any) {
      alert(erro.response?.data?.erro || 'Erro ao editar usuário');
    }
  };

  const handleDeletarUsuario = async (id: string) => {
    try {
      await api.delete(`/api/usuarios/${id}`);
      await carregarUsuarios();
      setModalConfirmar(false);
    } catch (erro: any) {
      alert(erro.response?.data?.erro || 'Erro ao deletar usuário');
    }
  };

  const handleAlternarStatus = async (usuario: Usuario) => {
    try {
      const endpoint = usuario.ativo ? 'desativar' : 'ativar';
      await api.post(`/api/usuarios/${usuario.id}/${endpoint}`);
      await carregarUsuarios();
      setModalConfirmar(false);
    } catch (erro: any) {
      alert(erro.response?.data?.erro || 'Erro ao alterar status');
    }
  };

  const abrirModalEdicao = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setDadosEdicao({
      nome: usuario.nome,
      email: usuario.email,
      funcao: usuario.funcao === 'administrador' ? 'administrador' : 'usuario',
      ativo: usuario.ativo
    });
  };

  const confirmarAcao = (mensagem: string, acao: () => void) => {
    setMensagemConfirmar(mensagem);
    setAcaoConfirmar(() => acao);
    setModalConfirmar(true);
  };

  const getFuncaoBadge = (funcao: string) => {
    if (funcao === 'empresa' || funcao === 'administrador') {
      return <Badge variant="purple">Admin</Badge>;
    }
    return <Badge variant="info">Usuário</Badge>;
  };

  const formatarData = (data: string) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'visao-geral' as TabType, label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'usuarios' as TabType, label: 'Usuários', icon: Users },
    { id: 'metricas' as TabType, label: 'Métricas', icon: Activity },
    { id: 'configuracoes' as TabType, label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Server className="w-8 h-8 text-purple-400" />
          Gerenciador do Sistema
        </h1>
        <p className="text-white/60">Administração completa da plataforma</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-500/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap border ${abaAtiva === tab.id
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

      <AnimatePresence mode="wait">
        {carregando ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Visão Geral */}
            {abaAtiva === 'visao-geral' && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg">
                          <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {uso?.uso.usuarios || 0}
                      </h3>
                      <p className="text-sm text-white/60">Usuários Ativos</p>
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                          style={{ width: `${uso?.percentual.usuarios || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        {uso?.percentual.usuarios || 0}% do limite
                      </p>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-lg">
                          <Phone className="w-6 h-6 text-cyan-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {uso?.uso.instancias || 0}
                      </h3>
                      <p className="text-sm text-white/60">Instâncias WhatsApp</p>
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                          style={{ width: `${uso?.percentual.instancias || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        {uso?.percentual.instancias || 0}% do limite
                      </p>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg">
                          <Users className="w-6 h-6 text-green-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {uso?.uso.contatos || 0}
                      </h3>
                      <p className="text-sm text-white/60">Contatos Totais</p>
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-600 to-green-400"
                          style={{ width: `${uso?.percentual.contatos || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        {uso?.percentual.contatos || 0}% do limite
                      </p>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg">
                          <MessageSquare className="w-6 h-6 text-orange-400" />
                        </div>
                        <Database className="w-5 h-5 text-orange-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {empresa?.saldo_creditos || 0}
                      </h3>
                      <p className="text-sm text-white/60">Créditos Disponíveis</p>
                      <p className="text-xs text-white/40 mt-3">
                        {uso?.uso.creditos_usados_mes || 0} usados este mês
                      </p>
                    </Card>
                  </motion.div>
                </div>

                {/* Informações da Empresa */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Informações da Empresa
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Nome</p>
                      <p className="text-white font-medium">{empresa?.nome || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">Email</p>
                      <p className="text-white font-medium">{empresa?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">Telefone</p>
                      <p className="text-white font-medium">{empresa?.telefone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">Status</p>
                      <Badge variant={empresa?.status === 'ativo' ? 'success' : 'warning'}>
                        {empresa?.status || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">White Label</p>
                      {empresa?.whitelabel_ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="info">Inativo</Badge>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Usuários Recentes */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    Usuários Recentes
                  </h2>
                  <div className="space-y-3">
                    {usuarios.slice(0, 5).map((usuario) => (
                      <div
                        key={usuario.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {usuario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{usuario.nome}</p>
                            <p className="text-xs text-white/60">{usuario.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getFuncaoBadge(usuario.funcao)}
                          {usuario.ativo ? (
                            <Badge variant="success" size="sm">Ativo</Badge>
                          ) : (
                            <Badge variant="danger" size="sm">Inativo</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Usuários */}
            {abaAtiva === 'usuarios' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">Gerenciar Usuários</h2>
                  <Button onClick={() => setModalUsuario(true)}>
                    <UserPlus className="w-4 h-4" />
                    Novo Usuário
                  </Button>
                </div>

                <Card className="overflow-hidden">
                  <Table
                    data={usuarios}
                    columns={[
                      {
                        key: 'nome',
                        label: 'Usuário',
                        render: (usuario) => (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {usuario.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-white font-medium">{usuario.nome}</p>
                          </div>
                        )
                      },
                      { key: 'email', label: 'Email' },
                      {
                        key: 'funcao',
                        label: 'Função',
                        render: (usuario) => getFuncaoBadge(usuario.funcao)
                      },
                      {
                        key: 'ativo',
                        label: 'Status',
                        render: (usuario) => (
                          usuario.ativo ? (
                            <Badge variant="success">Ativo</Badge>
                          ) : (
                            <Badge variant="danger">Inativo</Badge>
                          )
                        )
                      },
                      {
                        key: 'criado_em',
                        label: 'Criado em',
                        render: (usuario) => formatarData(usuario.criado_em)
                      },
                      {
                        key: 'acoes',
                        label: 'Ações',
                        className: 'text-right',
                        render: (usuario) => (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirModalEdicao(usuario)}
                              className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                confirmarAcao(
                                  `Deseja ${usuario.ativo ? 'desativar' : 'ativar'} o usuário ${usuario.nome}?`,
                                  () => handleAlternarStatus(usuario)
                                )
                              }
                              className={`p-2 rounded-lg transition-colors ${usuario.ativo
                                ? 'text-orange-400 hover:bg-orange-400/10'
                                : 'text-green-400 hover:bg-green-400/10'
                                }`}
                              title={usuario.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {usuario.ativo ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                confirmarAcao(
                                  `Deseja realmente deletar o usuário ${usuario.nome}?`,
                                  () => handleDeletarUsuario(usuario.id)
                                )
                              }
                              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      }
                    ]}
                  />
                </Card>
              </div>
            )}

            {/* Métricas */}
            {abaAtiva === 'metricas' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">Métricas do Sistema</h2>
                  <div className="flex gap-2">
                    <Button variant="glass" onClick={carregarMetricas}>
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </Button>
                    <Button variant="secondary">
                      <Download className="w-4 h-4" />
                      Exportar
                    </Button>
                  </div>
                </div>

                {/* Métricas Globais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-purple-400" />
                      </div>
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {metricas?.global?.totalMessages?.toLocaleString('pt-BR') || 0}
                    </h3>
                    <p className="text-sm text-white/60">Total de Mensagens</p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-lg">
                        <Phone className="w-6 h-6 text-cyan-400" />
                      </div>
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {metricas?.global?.totalInstances || 0}
                    </h3>
                    <p className="text-sm text-white/60">Total de Instâncias</p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg">
                        <Activity className="w-6 h-6 text-green-400" />
                      </div>
                      <BarChart3 className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {metricas?.global?.activeConnections || 0}
                    </h3>
                    <p className="text-sm text-white/60">Conexões Ativas</p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg">
                        <Clock className="w-6 h-6 text-orange-400" />
                      </div>
                      <Server className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {((metricas?.global?.uptime || 0) / 3600).toFixed(1)}h
                    </h3>
                    <p className="text-sm text-white/60">Uptime</p>
                  </Card>
                </div>

                {/* Performance do Sistema */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    Performance do Sistema
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">CPU</span>
                        <span className="text-sm font-medium text-white">
                          {metricas?.global?.system?.cpu || 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                          style={{ width: `${metricas?.global?.system?.cpu || 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/30 mt-1 text-right">Load: {metricas?.global?.system?.load || '0.00'}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Memória</span>
                        <span className="text-sm font-medium text-white">
                          {metricas?.global?.system?.memory || 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                          style={{ width: `${metricas?.global?.system?.memory || 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/30 mt-1 text-right">
                        {metricas?.global?.system?.memoryUsed || 0}MB / {metricas?.global?.system?.memoryTotal || 0}MB
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Uptime</span>
                        <span className="text-sm font-medium text-white">
                          {((metricas?.global?.uptime || 0) / 3600).toFixed(1)}h
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-600 to-green-400 w-full"
                        />
                      </div>
                      <p className="text-[10px] text-white/30 mt-1 text-right">Processo ativo</p>
                    </div>
                  </div>
                </Card>

                {/* Instâncias Ativas */}
                {metricas?.instances && Object.keys(metricas.instances).length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-cyan-400" />
                      Instâncias Ativas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(metricas.instances).map(([nome, dados]: [string, any]) => (
                        <div key={nome} className="p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-medium">{nome}</p>
                            <Badge variant="success" pulse>Online</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/60">Mensagens:</span>
                              <span className="text-white">{dados.messagesSent || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Erros:</span>
                              <span className="text-white">{dados.errors || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Configurações */}
            {abaAtiva === 'configuracoes' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Configurações da Empresa</h2>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Informações Básicas</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Nome da Empresa
                      </label>
                      <input
                        type="text"
                        value={empresa?.nome || ''}
                        readOnly
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={empresa?.email || ''}
                          readOnly
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          value={empresa?.telefone || ''}
                          readOnly
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Limites e Recursos</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-white/60 mb-1">Limite de Usuários</p>
                        <p className="text-2xl font-bold text-white">
                          {uso?.limites.max_usuarios || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-white/60 mb-1">Limite de Instâncias</p>
                        <p className="text-2xl font-bold text-white">
                          {uso?.limites.max_instancias || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-white/60 mb-1">Limite de Contatos</p>
                        <p className="text-2xl font-bold text-white">
                          {uso?.limites.max_contatos?.toLocaleString('pt-BR') || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Recursos Ativos</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white">White Label</span>
                      {empresa?.whitelabel_ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="info">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white">Status da Conta</span>
                      <Badge variant={empresa?.status === 'ativo' ? 'success' : 'warning'}>
                        {empresa?.status || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Criar/Editar Usuário */}
      <Modal
        isOpen={modalUsuario || usuarioEditando !== null}
        onClose={() => {
          setModalUsuario(false);
          setUsuarioEditando(null);
        }}
        title={usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Nome</label>
            <input
              type="text"
              value={usuarioEditando ? dadosEdicao.nome : novoUsuario.nome}
              onChange={(e) =>
                usuarioEditando
                  ? setDadosEdicao({ ...dadosEdicao, nome: e.target.value })
                  : setNovoUsuario({ ...novoUsuario, nome: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
            <input
              type="email"
              value={usuarioEditando ? dadosEdicao.email : novoUsuario.email}
              onChange={(e) =>
                usuarioEditando
                  ? setDadosEdicao({ ...dadosEdicao, email: e.target.value })
                  : setNovoUsuario({ ...novoUsuario, email: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
              placeholder="email@exemplo.com"
            />
          </div>
          {!usuarioEditando && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Senha</label>
              <input
                type="password"
                value={novoUsuario.senha}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                placeholder="••••••••"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Função</label>
            <select
              value={usuarioEditando ? dadosEdicao.funcao : novoUsuario.funcao}
              onChange={(e) =>
                usuarioEditando
                  ? setDadosEdicao({
                    ...dadosEdicao,
                    funcao: e.target.value as 'usuario' | 'administrador'
                  })
                  : setNovoUsuario({
                    ...novoUsuario,
                    funcao: e.target.value as 'usuario' | 'administrador'
                  })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="usuario">Usuário</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setModalUsuario(false);
                setUsuarioEditando(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={usuarioEditando ? handleEditarUsuario : handleCriarUsuario}
              className="flex-1"
            >
              {usuarioEditando ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmação */}
      <Modal
        isOpen={modalConfirmar}
        onClose={() => setModalConfirmar(false)}
        title="Confirmação"
      >
        <p className="text-white/80 mb-6">{mensagemConfirmar}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setModalConfirmar(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (acaoConfirmar) acaoConfirmar();
            }}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
