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
    <div className={`flex p-1 bg-gray-100 dark:bg-[#1c1e26] rounded-xl overflow-x-auto scrollbar-hide ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1
              ${isActive
                ? 'text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white dark:bg-[#2a2d3d] rounded-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
