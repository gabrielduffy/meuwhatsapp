import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users as UsersIcon, UserCheck, Shield, DollarSign, Edit, Power, Key, Trash2 } from 'lucide-react';
import { Card, Button, Input, Table, Badge, Modal } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  funcao: 'administrador' | 'empresa' | 'usuario' | 'afiliado';
  ativo: boolean;
  empresa_id?: number;
  empresa_nome?: string;
  criado_em: string;
}

interface Stats {
  total: number;
  ativos: number;
  administradores: number;
  afiliados: number;
}

interface UserFormData {
  nome: string;
  email: string;
  senha?: string;
  funcao: string;
  ativo: boolean;
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

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, ativos: 0, administradores: 0, afiliados: 0 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [funcaoFilter, setFuncaoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    senha: '',
    funcao: 'usuario',
    ativo: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, funcaoFilter, statusFilter, usuarios]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/usuarios');
      const userList = data.usuarios || data || [];
      setUsuarios(userList);
      updateStats(userList);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast.error(error.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = usuarios;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.nome.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    if (funcaoFilter) {
      filtered = filtered.filter((u) => u.funcao === funcaoFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === 'true';
      filtered = filtered.filter((u) => u.ativo === isActive);
    }

    setFilteredUsers(filtered);
  };

  const updateStats = (users: Usuario[]) => {
    setStats({
      total: users.length,
      ativos: users.filter((u) => u.ativo).length,
      administradores: users.filter((u) => u.funcao === 'administrador').length,
      afiliados: users.filter((u) => u.funcao === 'afiliado').length,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFuncaoFilter('');
    setStatusFilter('');
  };

  const handleCreateUser = async () => {
    try {
      setSubmitting(true);
      await api.post('/usuarios', formData);
      toast.success('Usuário criado com sucesso!');
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      const { senha, ...updateData } = formData;
      await api.put(`/usuarios/${selectedUser.id}`, updateData);
      toast.success('Usuário atualizado com sucesso!');
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: Usuario) => {
    try {
      const endpoint = user.ativo ? 'desativar' : 'ativar';
      await api.post(`/usuarios/${user.id}/${endpoint}`);
      toast.success(`Usuário ${user.ativo ? 'desativado' : 'ativado'} com sucesso!`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleResetPassword = async (user: Usuario) => {
    try {
      await api.post(`/usuarios/${user.id}/redefinir-senha`);
      toast.success('Email de redefinição enviado!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar email');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await api.delete(`/usuarios/${selectedUser.id}`);
      toast.success('Usuário excluído com sucesso!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (user: Usuario) => {
    setSelectedUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      funcao: user.funcao,
      ativo: user.ativo,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: Usuario) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      funcao: 'usuario',
      ativo: true,
    });
    setSelectedUser(null);
  };

  const getFuncaoBadge = (funcao: string) => {
    const variants: Record<string, 'danger' | 'purple' | 'info' | 'warning'> = {
      administrador: 'danger',
      empresa: 'purple',
      usuario: 'info',
      afiliado: 'warning',
    };
    return variants[funcao] || 'info';
  };

  const getFuncaoLabel = (funcao: string) => {
    const labels: Record<string, string> = {
      administrador: 'Administrador',
      empresa: 'Empresa',
      usuario: 'Usuário',
      afiliado: 'Afiliado',
    };
    return labels[funcao] || funcao;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (user: Usuario) => (
        <span className="font-semibold text-white">{user.nome || '-'}</span>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'empresa',
      label: 'Empresa',
      render: (user: Usuario) => user.empresa_nome || user.empresa_id || '-',
    },
    {
      key: 'funcao',
      label: 'Função',
      render: (user: Usuario) => (
        <Badge variant={getFuncaoBadge(user.funcao)}>
          {getFuncaoLabel(user.funcao)}
        </Badge>
      ),
    },
    {
      key: 'criado_em',
      label: 'Criado em',
      render: (user: Usuario) => formatDate(user.criado_em),
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (user: Usuario) => (
        <Badge variant={user.ativo ? 'success' : 'danger'} pulse={user.ativo}>
          {user.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (user: Usuario) => (
        <div className="flex gap-2">
          <Button
            variant="glass"
            size="sm"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => openEditModal(user)}
            title="Editar"
          >

          </Button>
          <Button
            variant={user.ativo ? 'secondary' : 'success'}
            size="sm"
            icon={<Power className="w-4 h-4" />}
            onClick={() => handleToggleStatus(user)}
            title={user.ativo ? 'Desativar' : 'Ativar'}
          />
          <Button
            variant="glass"
            size="sm"
            icon={<Key className="w-4 h-4" />}
            onClick={() => handleResetPassword(user)}
            title="Redefinir senha"
          />
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => openDeleteModal(user)}
            title="Excluir"
          />
        </div>
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
            Usuários
          </h1>
          <p className="text-white/60 mt-2">Gerencie todos os usuários da plataforma</p>
        </div>
        <Button variant="neon" icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Novo Usuário
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={item}>
          <Card variant="gradient" hover>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <UsersIcon className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Usuários</p>
                <h3 className="text-3xl font-bold text-white">{stats.total}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card variant="gradient" hover>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <UserCheck className="w-6 h-6 text-green-300" />
              </div>
              <div>
                <p className="text-sm text-white/60">Usuários Ativos</p>
                <h3 className="text-3xl font-bold text-white">{stats.ativos}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card variant="gradient" hover>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Shield className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-white/60">Administradores</p>
                <h3 className="text-3xl font-bold text-white">{stats.administradores}</h3>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card variant="gradient" hover>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <DollarSign className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="text-sm text-white/60">Afiliados</p>
                <h3 className="text-3xl font-bold text-white">{stats.afiliados}</h3>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card variant="glass" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />

            <select
              value={funcaoFilter}
              onChange={(e) => setFuncaoFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple"
            >
              <option value="">Todas as Funções</option>
              <option value="administrador">Administrador</option>
              <option value="empresa">Empresa (Dono)</option>
              <option value="usuario">Usuário</option>
              <option value="afiliado">Afiliado</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple"
            >
              <option value="">Todos os Status</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>

            <Button variant="glass" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card variant="glass">
          <Table
            data={filteredUsers}
            columns={columns}
            loading={loading}
            emptyMessage="Nenhum usuário encontrado"
          />
        </Card>
      </motion.div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Novo Usuário"
        footer={
          <>
            <Button variant="glass" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button variant="neon" onClick={handleCreateUser} loading={submitting}>
              Criar Usuário
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={formData.senha}
            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Função</label>
            <select
              value={formData.funcao}
              onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple"
            >
              <option value="usuario">Usuário</option>
              <option value="empresa">Empresa (Dono)</option>
              <option value="administrador">Administrador</option>
              <option value="afiliado">Afiliado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="ativo" className="text-sm text-white/80">
              Usuário ativo
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Usuário"
        footer={
          <>
            <Button variant="glass" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="neon" onClick={handleEditUser} loading={submitting}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Função</label>
            <select
              value={formData.funcao}
              onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple"
            >
              <option value="usuario">Usuário</option>
              <option value="empresa">Empresa (Dono)</option>
              <option value="administrador">Administrador</option>
              <option value="afiliado">Afiliado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo-edit"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="ativo-edit" className="text-sm text-white/80">
              Usuário ativo
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Usuário"
        footer={
          <>
            <Button variant="glass" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} loading={submitting}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-white/80">
          Tem certeza que deseja excluir o usuário{' '}
          <span className="font-bold text-white">{selectedUser?.nome}</span>?
          <br />
          <span className="text-red-400">Esta ação não pode ser desfeita.</span>
        </p>
      </Modal>
    </div>
  );
}
