import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  Tag,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

// Interfaces
interface Contato {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  etiquetas?: string[];
  ultima_mensagem_em?: string;
  notas?: string;
  criado_em?: string;
  atualizado_em?: string;
}

interface ContatoFormData {
  nome: string;
  telefone: string;
  email: string;
  etiquetas: string[];
  notas: string;
}

// Funções de formatação
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 13) {
    // +55 (11) 98888-8888
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 11) {
    // (11) 98888-8888
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // (11) 3888-8888
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
};

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Nunca';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Agora mesmo';
  if (diffMinutes < 60) return `${diffMinutes}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mês atrás`;
  return `${Math.floor(diffDays / 365)}ano atrás`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Contatos() {
  // Estados
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Contato selecionado
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);

  // Formulário
  const [formData, setFormData] = useState<ContatoFormData>({
    nome: '',
    telefone: '',
    email: '',
    etiquetas: [],
    notas: '',
  });
  const [newTag, setNewTag] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Importação
  const [importFile, setImportFile] = useState<File | null>(null);

  // Carregar contatos
  useEffect(() => {
    loadContatos();
  }, []);

  const loadContatos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/contatos');
      // A API retorna { contatos: [], total: 0, ... }
      if (data && Array.isArray(data.contatos)) {
        setContatos(data.contatos);
      } else if (Array.isArray(data)) {
        setContatos(data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
      showToast('Erro ao carregar contatos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar contatos
  const filteredContatos = useMemo(() => {
    if (!searchQuery.trim()) return contatos;

    const query = searchQuery.toLowerCase();
    return contatos.filter((contato) => {
      const nome = contato.nome?.toLowerCase() || '';
      const telefone = contato.telefone?.toLowerCase() || '';
      const email = contato.email?.toLowerCase() || '';
      const etiquetas = contato.etiquetas?.join(' ').toLowerCase() || '';

      return (
        nome.includes(query) ||
        telefone.includes(query) ||
        email.includes(query) ||
        etiquetas.includes(query)
      );
    });
  }, [contatos, searchQuery]);

  // Handlers do formulário
  const handleInputChange = (field: keyof ContatoFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.etiquetas.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        etiquetas: [...prev.etiquetas, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      etiquetas: prev.etiquetas.filter((t) => t !== tag),
    }));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      etiquetas: [],
      notas: '',
    });
    setNewTag('');
  };

  // CRUD Operations
  const handleCreateContato = async () => {
    try {
      setFormLoading(true);

      if (!formData.nome.trim()) {
        showToast('Nome é obrigatório', 'error');
        return;
      }

      if (!formData.telefone.trim()) {
        showToast('Telefone é obrigatório', 'error');
        return;
      }

      await api.post('/api/contatos', formData);
      showToast('Contato criado com sucesso!', 'success');
      setShowNewModal(false);
      resetForm();
      loadContatos();
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      showToast(error.response?.data?.erro || 'Erro ao criar contato', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateContato = async () => {
    if (!selectedContato) return;

    try {
      setFormLoading(true);

      if (!formData.nome.trim()) {
        showToast('Nome é obrigatório', 'error');
        return;
      }

      if (!formData.telefone.trim()) {
        showToast('Telefone é obrigatório', 'error');
        return;
      }

      await api.put(`/api/contatos/${selectedContato.id}`, formData);
      showToast('Contato atualizado com sucesso!', 'success');
      setShowEditModal(false);
      resetForm();
      setSelectedContato(null);
      loadContatos();
    } catch (error: any) {
      console.error('Erro ao atualizar contato:', error);
      showToast(error.response?.data?.erro || 'Erro ao atualizar contato', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContato = async () => {
    if (!selectedContato) return;

    try {
      setFormLoading(true);
      await api.delete(`/api/contatos/${selectedContato.id}`);
      showToast('Contato deletado com sucesso!', 'success');
      setShowDeleteConfirm(false);
      setSelectedContato(null);
      loadContatos();
    } catch (error: any) {
      console.error('Erro ao deletar contato:', error);
      showToast(error.response?.data?.erro || 'Erro ao deletar contato', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Importação
  const handleImportContatos = async () => {
    if (!importFile) {
      showToast('Selecione um arquivo para importar', 'error');
      return;
    }

    try {
      setFormLoading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('arquivo', importFile);

      const { data } = await api.post('/api/contatos/importar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast(`${data.importados || 0} contatos importados com sucesso!`, 'success');
      setShowImportModal(false);
      setImportFile(null);
      loadContatos();
    } catch (error: any) {
      console.error('Erro ao importar contatos:', error);
      showToast(error.response?.data?.erro || 'Erro ao importar contatos', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Exportação
  const handleExportContatos = async () => {
    try {
      const { data } = await api.get('/api/contatos/exportar', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contatos_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast('Contatos exportados com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao exportar contatos:', error);
      showToast('Erro ao exportar contatos', 'error');
    }
  };

  // Abrir modais
  const openNewModal = () => {
    resetForm();
    setShowNewModal(true);
  };

  const openEditModal = (contato: Contato) => {
    setSelectedContato(contato);
    setFormData({
      nome: contato.nome || '',
      telefone: contato.telefone || '',
      email: contato.email || '',
      etiquetas: contato.etiquetas || [],
      notas: contato.notas || '',
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (contato: Contato) => {
    setSelectedContato(contato);
    setShowDetailsModal(true);
  };

  const openDeleteConfirm = (contato: Contato) => {
    setSelectedContato(contato);
    setShowDeleteConfirm(true);
  };

  // Toast (simples - pode ser melhorado com biblioteca)
  const showToast = (message: string, type: 'success' | 'error') => {
    // TODO: Implementar toast notification proper
    if (type === 'success') {
      alert(message);
    } else {
      alert(message);
    }
  };

  // Definir colunas da tabela
  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (contato: Contato) => (
        <div className="font-semibold text-white">{contato.nome || 'Sem nome'}</div>
      ),
    },
    {
      key: 'telefone',
      label: 'Telefone',
      render: (contato: Contato) => (
        <div className="flex items-center gap-2 text-white/80">
          <Phone className="w-4 h-4 text-purple-400" />
          {formatPhone(contato.telefone)}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (contato: Contato) => (
        <div className="flex items-center gap-2 text-white/60">
          {contato.email ? (
            <>
              <Mail className="w-4 h-4 text-cyan-400" />
              {contato.email}
            </>
          ) : (
            <span className="text-white/40">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'etiquetas',
      label: 'Tags',
      render: (contato: Contato) => (
        <div className="flex flex-wrap gap-1">
          {contato.etiquetas && contato.etiquetas.length > 0 ? (
            contato.etiquetas.map((tag, index) => (
              <Badge key={index} variant="purple" size="sm">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-white/40 text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'ultima_mensagem_em',
      label: 'Última Mensagem',
      render: (contato: Contato) => (
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          {formatRelativeTime(contato.ultima_mensagem_em)}
        </div>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (contato: Contato) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailsModal(contato);
            }}
            className="p-2 rounded-lg hover:bg-cyan-600/20 text-cyan-400 transition-colors"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(contato);
            }}
            className="p-2 rounded-lg hover:bg-purple-600/20 text-purple-400 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteConfirm(contato);
            }}
            className="p-2 rounded-lg hover:bg-red-600/20 text-red-400 transition-colors"
            title="Deletar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Contatos
          </h1>
          <p className="text-white/60 mt-1">Gerencie sua base de contatos</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="glass"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportContatos}
          >
            Exportar
          </Button>
          <Button
            variant="glass"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowImportModal(true)}
          >
            Importar
          </Button>
          <Button
            variant="neon"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={openNewModal}
          >
            Novo Contato
          </Button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Input
          type="text"
          placeholder="Buscar contatos por nome, telefone, email ou tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card variant="gradient" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-600/20 border border-purple-400/30">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Total de Contatos</p>
              <p className="text-2xl font-bold text-white">{contatos.length}</p>
            </div>
          </div>
        </Card>

        <Card variant="gradient" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-600/20 border border-cyan-400/30">
              <Search className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Filtrados</p>
              <p className="text-2xl font-bold text-white">{filteredContatos.length}</p>
            </div>
          </div>
        </Card>

        <Card variant="gradient" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-600/20 border border-purple-400/30">
              <Tag className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Tags Únicas</p>
              <p className="text-2xl font-bold text-white">
                {new Set(contatos.flatMap((c) => c.etiquetas || [])).size}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass" hover={false} className="overflow-hidden">
          <Table
            data={filteredContatos}
            columns={columns}
            loading={loading}
            emptyMessage="Nenhum contato encontrado"
          />
        </Card>
      </motion.div>

      {/* Modal: Novo Contato */}
      <Modal
        isOpen={showNewModal}
        onClose={() => {
          setShowNewModal(false);
          resetForm();
        }}
        title="Novo Contato"
        footer={
          <>
            <Button
              variant="glass"
              onClick={() => {
                setShowNewModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="neon"
              onClick={handleCreateContato}
              loading={formLoading}
              disabled={formLoading}
            >
              Criar Contato
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            type="text"
            placeholder="Nome do contato"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            icon={<Users className="w-5 h-5" />}
          />

          <Input
            label="Telefone *"
            type="tel"
            placeholder="+55 (11) 98888-8888"
            value={formData.telefone}
            onChange={(e) => handleInputChange('telefone', e.target.value)}
            icon={<Phone className="w-5 h-5" />}
          />

          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            icon={<Mail className="w-5 h-5" />}
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Adicionar tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  icon={<Tag className="w-5 h-5" />}
                />
                <Button variant="glass" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.etiquetas.map((tag, index) => (
                    <Badge key={index} variant="purple">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              placeholder="Observações sobre o contato..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white placeholder-white/40 transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple focus:bg-white/10 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Contato */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
          setSelectedContato(null);
        }}
        title="Editar Contato"
        footer={
          <>
            <Button
              variant="glass"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
                setSelectedContato(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="neon"
              onClick={handleUpdateContato}
              loading={formLoading}
              disabled={formLoading}
            >
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            type="text"
            placeholder="Nome do contato"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            icon={<Users className="w-5 h-5" />}
          />

          <Input
            label="Telefone *"
            type="tel"
            placeholder="+55 (11) 98888-8888"
            value={formData.telefone}
            onChange={(e) => handleInputChange('telefone', e.target.value)}
            icon={<Phone className="w-5 h-5" />}
          />

          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            icon={<Mail className="w-5 h-5" />}
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Adicionar tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  icon={<Tag className="w-5 h-5" />}
                />
                <Button variant="glass" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.etiquetas.map((tag, index) => (
                    <Badge key={index} variant="purple">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              placeholder="Observações sobre o contato..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white placeholder-white/40 transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple focus:bg-white/10 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Ver Detalhes */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedContato(null);
        }}
        title="Detalhes do Contato"
        size="lg"
      >
        {selectedContato && (
          <div className="space-y-6">
            {/* Info Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-white/60">Nome</p>
                <p className="text-lg font-semibold text-white">{selectedContato.nome}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-white/60">Telefone</p>
                <p className="text-lg font-semibold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  {formatPhone(selectedContato.telefone)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-white/60">Email</p>
                <p className="text-lg text-white/80 flex items-center gap-2">
                  {selectedContato.email ? (
                    <>
                      <Mail className="w-4 h-4 text-cyan-400" />
                      {selectedContato.email}
                    </>
                  ) : (
                    <span className="text-white/40">-</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-white/60">Última Mensagem</p>
                <p className="text-lg text-white/80 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  {formatRelativeTime(selectedContato.ultima_mensagem_em)}
                </p>
              </div>
            </div>

            {/* Tags */}
            {selectedContato.etiquetas && selectedContato.etiquetas.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-white/60">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedContato.etiquetas.map((tag, index) => (
                    <Badge key={index} variant="purple">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {selectedContato.notas && (
              <div className="space-y-2">
                <p className="text-sm text-white/60">Notas</p>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-white/80 whitespace-pre-wrap">{selectedContato.notas}</p>
                </div>
              </div>
            )}

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-sm text-white/60 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Criado em
                </p>
                <p className="text-sm text-white/80">{formatDate(selectedContato.criado_em)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-white/60 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Atualizado em
                </p>
                <p className="text-sm text-white/80">{formatDate(selectedContato.atualizado_em)}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  openEditModal(selectedContato);
                }}
                icon={<Edit2 className="w-4 h-4" />}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowDetailsModal(false);
                  openDeleteConfirm(selectedContato);
                }}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Deletar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Importar Contatos */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
        }}
        title="Importar Contatos"
        footer={
          <>
            <Button
              variant="glass"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="neon"
              onClick={handleImportContatos}
              loading={formLoading}
              disabled={formLoading || !importFile}
              icon={<Upload className="w-4 h-4" />}
            >
              Importar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-cyan-600/10 border border-cyan-400/30 rounded-lg">
            <p className="text-sm text-cyan-300">
              <strong>Formato aceito:</strong> CSV com colunas: nome, telefone, email, etiquetas (separadas por vírgula)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Selecione o arquivo
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-lg text-white placeholder-white/40 transition-all duration-300 focus:outline-none focus:border-purple-400/50 focus:shadow-neon-purple focus:bg-white/10 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600/20 file:text-purple-300 file:cursor-pointer hover:file:bg-purple-600/30"
            />
          </div>

          {importFile && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm text-white/80">
                <strong>Arquivo selecionado:</strong> {importFile.name}
              </p>
              <p className="text-xs text-white/60 mt-1">
                Tamanho: {(importFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Confirmar Exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedContato(null);
        }}
        title="Confirmar Exclusão"
        size="sm"
        footer={
          <>
            <Button
              variant="glass"
              onClick={() => {
                setShowDeleteConfirm(false);
                setSelectedContato(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteContato}
              loading={formLoading}
              disabled={formLoading}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Deletar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-600/10 border border-red-400/30 rounded-lg">
            <p className="text-red-300">
              Tem certeza que deseja deletar este contato? Esta ação não pode ser desfeita.
            </p>
          </div>

          {selectedContato && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
              <p className="text-sm text-white/60">Contato a ser deletado:</p>
              <p className="text-lg font-semibold text-white">{selectedContato.nome}</p>
              <p className="text-sm text-white/80">{formatPhone(selectedContato.telefone)}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
