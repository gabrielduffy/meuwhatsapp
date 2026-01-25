import React from 'react';
import { motion } from 'framer-motion';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex p-1 bg-gray-100/10 dark:bg-white/5 backdrop-blur-md rounded-xl overflow-x-auto scrollbar-hide border border-white/10 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 whitespace-nowrap flex-1
              ${isActive
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600/40 to-cyan-600/40 border border-white/20 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-cyan-400' : 'text-white/30'}`} />}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
