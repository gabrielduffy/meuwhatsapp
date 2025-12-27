import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Bot,
  Power,
  Edit,
  Trash2,
  TestTube,
  Zap,
  MessageSquare,
  Settings,
  TrendingUp,
} from 'lucide-react';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import CreateAgentModal from '../components/agentes-ia/CreateAgentModal';
import TestAgentModal from '../components/agentes-ia/TestAgentModal';
import AgentDetailsModal from '../components/agentes-ia/AgentDetailsModal';

interface Agente {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  modelo: string;
  ativo: boolean;
  instancia_id: string;
  instancia_nome?: string;
  temperatura: number;
  max_tokens: number;
  personalidade?: string;
  instrucoes?: string;
  total_interacoes?: number;
  criado_em: string;
}

interface Stats {
  total: number;
  ativos: number;
  inativos: number;
  totalInteracoes: number;
}

export default function AgentesIA() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    totalInteracoes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState<Agente | null>(null);

  useEffect(() => {
    carregarAgentes();
  }, []);

  const carregarAgentes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/agentes-ia');
      const agentesData = response.data.agentes || [];
      setAgentes(agentesData);

      // Calcular estatísticas
      const stats = {
        total: agentesData.length,
        ativos: agentesData.filter((a: Agente) => a.ativo).length,
        inativos: agentesData.filter((a: Agente) => !a.ativo).length,
        totalInteracoes: agentesData.reduce((sum: number, a: Agente) => sum + (a.total_interacoes || 0), 0),
      };
      setStats(stats);
    } catch (error: any) {
      console.error('Erro ao carregar agentes:', error);
      toast.error(error.response?.data?.erro || 'Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (agente: Agente) => {
    try {
      const endpoint = agente.ativo ? 'desativar' : 'ativar';
      await api.post(`/agentes-ia/${agente.id}/${endpoint}`);
      toast.success(`Agente ${agente.ativo ? 'desativado' : 'ativado'} com sucesso!`);
      await carregarAgentes();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao alterar status');
    }
  };

  const handleDelete = async (agente: Agente) => {
    if (!confirm(`Tem certeza que deseja deletar o agente "${agente.nome}"?`)) return;

    try {
      await api.delete(`/agentes-ia/${agente.id}`);
      toast.success('Agente deletado com sucesso!');
      await carregarAgentes();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao deletar agente');
    }
  };

  const handleEdit = (agente: Agente) => {
    setSelectedAgente(agente);
    setDetailsModalOpen(true);
  };

  const handleTest = (agente: Agente) => {
    setSelectedAgente(agente);
    setTestModalOpen(true);
  };

  const handleCreateSuccess = async () => {
    await carregarAgentes();
    setCreateModalOpen(false);
  };

  const handleUpdateSuccess = async () => {
    await carregarAgentes();
    setDetailsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Agentes de IA
          </h1>
          <p className="text-white/60 mt-1">
            Gerencie assistentes inteligentes para suas conversas
          </p>
        </div>

        <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Novo Agente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-purple-600/10">
              <Bot className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total de Agentes</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/30 to-green-600/10">
              <Power className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Agentes Ativos</p>
              <p className="text-2xl font-bold text-white">{stats.ativos}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-red-600/30 to-red-600/10">
              <Power className="w-6 h-6 text-red-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Agentes Inativos</p>
              <p className="text-2xl font-bold text-white">{stats.inativos}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-cyan-600/10">
              <MessageSquare className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Interações</p>
              <p className="text-2xl font-bold text-white">{stats.totalInteracoes}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agentes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : agentes.length === 0 ? (
        <Card variant="glass" className="text-center py-12">
          <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Nenhum agente configurado</p>
          <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Criar Primeiro Agente
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentes.map((agente, index) => (
            <motion.div
              key={agente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="gradient" className="h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      agente.ativo
                        ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30'
                        : 'bg-white/5'
                    }`}>
                      <Bot className={`w-6 h-6 ${
                        agente.ativo ? 'text-purple-300' : 'text-white/40'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{agente.nome}</h3>
                      <p className="text-xs text-white/60">{agente.tipo}</p>
                    </div>
                  </div>

                  <Badge variant={agente.ativo ? 'success' : 'danger'} pulse={agente.ativo}>
                    {agente.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {/* Descrição */}
                {agente.descricao && (
                  <p className="text-sm text-white/70 mb-4 line-clamp-2">
                    {agente.descricao}
                  </p>
                )}

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/60">Modelo:</span>
                    <span className="text-white font-medium">{agente.modelo}</span>
                  </div>

                  {agente.instancia_nome && (
                    <div className="flex items-center gap-2 text-xs">
                      <Settings className="w-4 h-4 text-cyan-400" />
                      <span className="text-white/60">Instância:</span>
                      <span className="text-white font-medium truncate">
                        {agente.instancia_nome}
                      </span>
                    </div>
                  )}

                  {agente.total_interacoes !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-white/60">Interações:</span>
                      <span className="text-white font-medium">
                        {agente.total_interacoes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleTest(agente)}
                    icon={<TestTube className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Testar
                  </Button>

                  <Button
                    variant={agente.ativo ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggleStatus(agente)}
                    icon={<Power className="w-4 h-4" />}
                  />

                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleEdit(agente)}
                    icon={<Edit className="w-4 h-4" />}
                  />

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(agente)}
                    icon={<Trash2 className="w-4 h-4" />}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateAgentModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {testModalOpen && selectedAgente && (
        <TestAgentModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          agente={selectedAgente}
        />
      )}

      {detailsModalOpen && selectedAgente && (
        <AgentDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          onSuccess={handleUpdateSuccess}
          agenteId={selectedAgente.id}
        />
      )}
    </div>
  );
}
