import { motion } from 'framer-motion';
import { Settings, Database, Server } from 'lucide-react';

export default function Manager() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Gerenciador do Sistema</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
        >
          <Settings className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="font-semibold text-white mb-2">Configurações</h3>
          <p className="text-sm text-white/60">Gerenciar configurações do sistema</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
        >
          <Database className="w-8 h-8 text-cyan-400 mb-3" />
          <h3 className="font-semibold text-white mb-2">Banco de Dados</h3>
          <p className="text-sm text-white/60">Monitorar e gerenciar dados</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
        >
          <Server className="w-8 h-8 text-green-400 mb-3" />
          <h3 className="font-semibold text-white mb-2">Servidor</h3>
          <p className="text-sm text-white/60">Status e performance</p>
        </motion.div>
      </div>
    </div>
  );
}
