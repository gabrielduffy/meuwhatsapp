import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu,
  X,
  MessageCircle,
  Users,
  LayoutDashboard,
  Building2,
  Bot,
  Workflow,
  GitBranch,
  Clock,
  Settings,
  LogOut,
  Contact,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Instâncias', path: '/instancias', icon: Smartphone },
  { label: 'Conversas', path: '/conversas', icon: MessageCircle },
  { label: 'Contatos', path: '/contatos', icon: Contact },
  { label: 'CRM', path: '/crm', icon: GitBranch },
  { label: 'Agentes IA', path: '/agentes-ia', icon: Bot },
  { label: 'Follow-up', path: '/followup', icon: Clock },
  { label: 'Integrações', path: '/integracoes', icon: Workflow },
  { label: 'Usuários', path: '/usuarios', icon: Users },
  { label: 'Empresas', path: '/empresas', icon: Building2 },
  { label: 'Configurações', path: '/config', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/entrar');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-900 to-gray-950 border-r border-white/10 backdrop-blur-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-cyan-600/20">
          <h1 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            WhatsBenemax
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 flex-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-all duration-300 group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30 text-white shadow-neon-purple border border-purple-400/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-all duration-300 ${
                    isActive ? 'text-purple-300' : 'text-white/40 group-hover:text-cyan-300'
                  }`} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 animate-pulse" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 px-6 bg-gray-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-white/10">
              <span className="text-sm font-medium text-white">{usuario?.nome || 'Usuário'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
