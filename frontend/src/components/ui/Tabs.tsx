import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  hidden?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const [activeTab, setActiveTab] = useState(defaultTab || visibleTabs[0]?.id);

  const activeTabContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-6 py-3 rounded-lg font-medium
              transition-all duration-300
              whitespace-nowrap
              flex items-center gap-2
              ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30 text-white border-2 border-purple-400/50 shadow-neon-purple'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-2 border-transparent'
              }
            `}
          >
            {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
            <span>{tab.label}</span>

            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {activeTabContent}
      </motion.div>
    </div>
  );
}
