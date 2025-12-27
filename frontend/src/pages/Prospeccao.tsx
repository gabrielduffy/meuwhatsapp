import { motion } from 'framer-motion';
import { Target, TrendingUp } from 'lucide-react';

export default function Prospeccao() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-8 h-8 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Prospecção com IA</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 border border-white/10 rounded-lg p-8 text-center"
      >
        <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Prospecção Inteligente</h2>
        <p className="text-white/60 mb-4">Encontre leads qualificados com IA</p>
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg">
          Iniciar Prospecção
        </button>
      </motion.div>
    </div>
  );
}
