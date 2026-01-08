import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Webhook,
  Power,
  Trash2,
  TestTube,
  Link as LinkIcon,
  Send,
  Code,
  Layout
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  url?: string;
  metodo?: string;
  headers?: any;
  criado_em: string;
}

export default function Integracoes() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    headers: '{}',
  });
  const [testWebhookData, setTestWebhookData] = useState({
    url: '',
    payload: '{\n  "event": "message",\n  "instance": "teste",\n  "data": {\n    "text": "Teste de Webhook"\n  }\n}',
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    carregarIntegracoes();
  }, []);

  const carregarIntegracoes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/integracoes');
      setIntegracoes(response.data.integracoes || []);
    } catch (error: any) {
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/integracoes', {
        ...formData,
        headers: JSON.parse(formData.headers),
      });
      toast.success('Integração criada com sucesso!');
      setCreateModalOpen(false);
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao criar integração');
    }
  };

  const handleToggle = async (integracao: Integracao) => {
    try {
      const endpoint = integracao.ativo ? 'desativar' : 'ativar';
      await api.post(`/api/integracoes/${integracao.id}/${endpoint}`);
      toast.success(`Integração ${integracao.ativo ? 'desativada' : 'ativada'}!`);
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleTest = async (integracao: Integracao) => {
    try {
      await api.post(`/api/integracoes/${integracao.id}/testar`);
      toast.success('Teste realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.erro || 'Erro ao testar integração');
    }
  };

  const handleDelete = async (integracao: Integracao) => {
    if (!confirm(`Deletar integração "${integracao.nome}"?`)) return;

    try {
      await api.delete(`/api/integracoes/${integracao.id}`);
      toast.success('Integração deletada!');
      await carregarIntegracoes();
    } catch (error: any) {
      toast.error('Erro ao deletar integração');
    }
  };

  const executeGenericTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await api.post('/api/integracoes/test-webhook', {
        url: testWebhookData.url,
        payload: JSON.parse(testWebhookData.payload)
      });
      setTestResult(response.data);
      if (response.data.sucesso) {
        toast.success('Webhook enviado com sucesso!');
      } else {
        toast.error('Ocorreu um erro na resposta do servidor');
      }
    } catch (error: any) {
      setTestResult(error.response?.data || { erro: error.message });
      toast.error('Erro ao conectar com o servidor de teste');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Integrações
          </h1>
          <p className="text-white/60 mt-1">
            Conecte seu WhatsApp com outras plataformas
          </p>
        </div>

        <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-5 h-5" />
          Nova Integração
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : integracoes.length === 0 ? (
        <Card variant="glass" className="text-center py-12">
          <Webhook className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">Nenhuma integração configurada</p>
          <Button variant="neon" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Criar Primeira Integração
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integracoes.map((integracao, index) => (
            <motion.div
              key={integracao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="gradient">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${integracao.ativo
                      ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30'
                      : 'bg-white/5'
                      }`}>
                      <Webhook className={`w-6 h-6 ${integracao.ativo ? 'text-purple-300' : 'text-white/40'
                        }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{integracao.nome}</h3>
                      <p className="text-xs text-white/60">{integracao.tipo}</p>
                    </div>
                  </div>

                  <Badge variant={integracao.ativo ? 'success' : 'danger'}>
                    {integracao.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                {integracao.url && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <LinkIcon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-white/60">URL</span>
                    </div>
                    <p className="text-sm text-white/80 truncate">{integracao.url}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handleTest(integracao)}
                    icon={<TestTube className="w-4 h-4" />}
                  >
                    Testar
                  </Button>

                  <Button
                    variant={integracao.ativo ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggle(integracao)}
                    icon={<Power className="w-4 h-4" />}
                  />

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(integracao)}
                    icon={<Trash2 className="w-4 h-4" />}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Webhook Tester Section */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-600/20 rounded-lg">
            <TestTube className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Simulador de Webhook</h2>
            <p className="text-white/60">Teste a recepção de dados no seu servidor sem enviar mensagens reais</p>
          </div>
        </div>

        <Card variant="glass">
          <form onSubmit={executeGenericTest} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="URL do seu Webhook"
                placeholder="https://seu-servidor.com/webhook"
                value={testWebhookData.url}
                onChange={(e) => setTestWebhookData({ ...testWebhookData, url: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Payload JSON (Corpo)</label>
                <textarea
                  className="w-full h-48 px-4 py-3 bg-black/20 border-2 border-white/10 rounded-lg text-cyan-300 font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                  value={testWebhookData.payload}
                  onChange={(e) => setTestWebhookData({ ...testWebhookData, payload: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                loading={testLoading}
                icon={<Send className="w-4 h-4" />}
              >
                Enviar Webhook de Teste
              </Button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">Resultado do Teste</label>
              <div className={`w-full h-[300px] rounded-lg border-2 p-4 font-mono text-sm overflow-auto ${!testResult ? 'bg-black/20 border-white/5 flex items-center justify-center' :
                  testResult.sucesso ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
                }`}>
                {testResult ? (
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                ) : (
                  <div className="text-center text-white/20">
                    <Layout className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p>Aguardando execução do teste...</p>
                  </div>
                )}
              </div>

              {testResult && (
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-white/40">Latência: <span className="text-white/80">{testResult.tempo}</span></span>
                  <span className="text-white/40">Status: <span className={testResult.status < 300 ? 'text-green-400' : 'text-red-400'}>{testResult.status}</span></span>
                </div>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova Integração"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="webhook">Webhook</option>
              <option value="api">API REST</option>
              <option value="zapier">Zapier</option>
              <option value="make">Make (Integromat)</option>
            </select>
          </div>

          <Input
            label="URL"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Método HTTP</label>
            <select
              value={formData.metodo}
              onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400/50"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => setCreateModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="neon" className="flex-1">
              Criar Integração
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
