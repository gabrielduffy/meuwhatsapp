import { motion } from 'framer-motion';
import { CreditCard, Check } from 'lucide-react';

export default function Assinatura() {
  const plans = [
    { name: 'Starter', price: 'R$ 97', features: ['1 usuário', '1 instância', '1000 mensagens'] },
    { name: 'Pro', price: 'R$ 197', features: ['3 usuários', '2 instâncias', '5000 mensagens'] },
    { name: 'Business', price: 'R$ 497', features: ['10 usuários', '5 instâncias', '20000 mensagens'] },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-8 h-8 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Assinatura</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-white/10 rounded-lg p-6"
          >
            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <p className="text-3xl font-bold text-purple-400 mb-4">{plan.price}<span className="text-sm text-white/60">/mês</span></p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-white/60">
                  <Check className="w-4 h-4 text-green-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg">
              Assinar
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
