import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Lock,
  Database,
  Palette,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

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

export default function Configuracoes() {
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: false,
    sms: false,
  });

  const handleSaveNotifications = () => {
    toast.success('Configurações de notificações salvas!');
  };

  const handleSaveSecurity = () => {
    toast.success('Configurações de segurança salvas!');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-white/60 mt-1">
          Gerencie as configurações da plataforma
        </p>
      </div>

      {/* Grid de Configurações */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Notificações */}
        <motion.div variants={item}>
          <Card variant="gradient" className="h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/30 to-cyan-600/30">
                <Bell className="w-6 h-6 text-purple-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Notificações</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">Email</p>
                  <p className="text-sm text-white/60">Receber notificações por email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.email}
                    onChange={(e) => setNotificacoes({ ...notificacoes, email: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-cyan-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">Push</p>
                  <p className="text-sm text-white/60">Notificações push no navegador</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.push}
                    onChange={(e) => setNotificacoes({ ...notificacoes, push: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-cyan-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">SMS</p>
                  <p className="text-sm text-white/60">Alertas via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificacoes.sms}
                    onChange={(e) => setNotificacoes({ ...notificacoes, sms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-cyan-600"></div>
                </label>
              </div>

              <Button variant="neon" onClick={handleSaveNotifications} className="w-full mt-4">
                Salvar Notificações
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Segurança */}
        <motion.div variants={item}>
          <Card variant="gradient" className="h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-600/30 to-orange-600/30">
                <Lock className="w-6 h-6 text-red-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Segurança</h2>
            </div>

            <div className="space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                placeholder="Digite sua senha atual"
              />
              <Input
                label="Nova Senha"
                type="password"
                placeholder="Digite a nova senha"
              />
              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Confirme a nova senha"
              />

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-300">Autenticação de 2 Fatores</p>
                    <p className="text-xs text-yellow-400/70 mt-1">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                    <Badge variant="warning" className="mt-2">Em breve</Badge>
                  </div>
                </div>
              </div>

              <Button variant="danger" onClick={handleSaveSecurity} className="w-full mt-4">
                Alterar Senha
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Aparência */}
        <motion.div variants={item}>
          <Card variant="gradient" className="h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30">
                <Palette className="w-6 h-6 text-cyan-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Aparência</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-medium text-white mb-3">Tema</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-white font-medium">
                    Escuro
                  </button>
                  <button className="p-3 bg-white/10 rounded-lg text-white/60 font-medium">
                    Claro
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-medium text-white mb-3">Cor Principal</p>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-white cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-cyan-600 border-2 border-transparent cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-transparent cursor-pointer"></div>
                  <div className="w-10 h-10 rounded-full bg-green-600 border-2 border-transparent cursor-pointer"></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Sistema */}
        <motion.div variants={item}>
          <Card variant="gradient" className="h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-600/30 to-emerald-600/30">
                <Database className="w-6 h-6 text-green-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Sistema</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-white">Versão</p>
                  <Badge variant="success">v2.1.0</Badge>
                </div>
                <p className="text-sm text-white/60">Última atualização: 27/12/2025</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-white">API Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-sm text-green-400">Online</span>
                  </div>
                </div>
                <p className="text-sm text-white/60">Todos os serviços operacionais</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="glass" icon={<Globe className="w-4 h-4" />}>
                  Logs
                </Button>
                <Button variant="glass" icon={<Zap className="w-4 h-4" />}>
                  Cache
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Ações Perigosas */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card variant="glass" className="border-red-500/30">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Zona de Perigo</h2>
          </div>
          <p className="text-white/60 mb-4">
            Ações irreversíveis que afetam permanentemente sua conta
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" size="sm">
              Limpar Cache
            </Button>
            <Button variant="danger" size="sm">
              Resetar Configurações
            </Button>
            <Button variant="danger" size="sm">
              Exportar Dados
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
