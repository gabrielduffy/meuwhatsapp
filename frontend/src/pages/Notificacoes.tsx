import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

export default function Notificacoes() {
  const notifications = [
    { id: 1, title: 'Nova mensagem', message: 'Você recebeu uma nova mensagem', time: '5 min atrás' },
    { id: 2, title: 'Instância conectada', message: 'WhatsApp conectado com sucesso', time: '1 hora atrás' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Notificações</h1>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900/50 border border-white/10 rounded-lg p-4 hover:bg-white/5 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">{notif.title}</h3>
                <p className="text-sm text-white/60">{notif.message}</p>
              </div>
              <span className="text-xs text-white/40">{notif.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
