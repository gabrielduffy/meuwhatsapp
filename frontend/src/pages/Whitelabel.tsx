import { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Save } from 'lucide-react';

export default function Whitelabel() {
  const [config, setConfig] = useState({
    logo_url: '',
    primary_color: '#8B5CF6',
    secondary_color: '#06B6D4',
    company_name: '',
  });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="w-8 h-8 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">White Label</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 border border-white/10 rounded-lg p-6 max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Nome da Empresa</label>
            <input
              type="text"
              value={config.company_name}
              onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">URL do Logo</label>
            <input
              type="text"
              value={config.logo_url}
              onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Cor Primária</label>
              <input
                type="color"
                value={config.primary_color}
                onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                className="w-full h-12 bg-gray-800 border border-white/10 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Cor Secundária</label>
              <input
                type="color"
                value={config.secondary_color}
                onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                className="w-full h-12 bg-gray-800 border border-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:opacity-90">
            <Save className="w-5 h-5" />
            Salvar Configurações
          </button>
        </div>
      </motion.div>
    </div>
  );
}
