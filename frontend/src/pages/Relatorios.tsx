import { motion } from 'framer-motion';
import { BarChart3, Download } from 'lucide-react';

export default function Relatorios() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg">
          <Download className="w-5 h-5" />
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Mensagens Enviadas', 'Taxa de Resposta', 'Conversões', 'Campanhas Ativas', 'Leads Gerados', 'ROI'].map((metric) => (
          <motion.div
            key={metric}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
          >
            <h3 className="text-sm font-medium text-white/60 mb-2">{metric}</h3>
            <p className="text-3xl font-bold text-white">0</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
