/**
 * Template Admin - Componentes reutilizáveis para páginas admin
 */

const AdminTemplate = {
  /**
   * Renderizar Sidebar
   */
  renderSidebar(activePage) {
    const menuItems = [
      { label: 'Dashboard', href: '/admin/dashboard.html', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', page: 'dashboard' },
      { label: 'Empresas', href: '/admin/empresas.html', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', page: 'empresas' },
      { label: 'Usuários', href: '/admin/usuarios.html', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', page: 'usuarios' },
      { label: 'Planos', href: '/admin/planos.html', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', page: 'planos' },
      { label: 'Financeiro', href: '/admin/financeiro.html', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', page: 'financeiro' },
      { label: 'Afiliados', href: '/admin/afiliados.html', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', page: 'afiliados' },
      { label: 'Instâncias WhatsApp', href: '/admin/instancias.html', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', page: 'instancias' },
      { label: 'CRM', href: '/admin/crm.html', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', page: 'crm' },
      { label: 'Agentes IA', href: '/admin/agentes-ia.html', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', page: 'agentes-ia' },
      { label: 'Follow-up', href: '/admin/followup.html', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', page: 'followup' },
      { label: 'Prospecção', href: '/admin/prospeccao.html', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', page: 'prospeccao' },
      { label: 'White Label', href: '/admin/whitelabel.html', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', page: 'whitelabel' },
      { label: 'Integrações', href: '/admin/integracoes.html', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z', page: 'integracoes' },
      { label: 'Logs & Auditoria', href: '/admin/logs.html', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', page: 'logs' },
      { label: 'Configurações', href: '/admin/configuracoes.html', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', page: 'configuracoes' }
    ];

    return `
      <aside class="app-sidebar" id="sidebar">
        <div class="sidebar-logo">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          <span>WhatsBenemax Admin</span>
        </div>

        <nav class="sidebar-menu">
          ${menuItems.map(item => `
            <a href="${item.href}" class="menu-item ${item.page === activePage ? 'active' : ''}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}"></path>
              </svg>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>
      </aside>
    `;
  },

  /**
   * Renderizar Header
   */
  renderHeader() {
    return `
      <header class="app-header">
        <button onclick="AdminTemplate.toggleSidebar()" class="header-btn">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <div class="header-actions">
          <!-- Dark Mode Toggle -->
          <button class="header-btn" onclick="AdminTemplate.toggleDarkMode()" title="Alternar modo escuro">
            <svg class="w-6 h-6 dark-mode-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
          </button>

          <!-- Notificações -->
          <div class="relative">
            <button class="header-btn relative" onclick="AdminTemplate.toggleNotifications()" title="Notificações">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
              <span class="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">3</span>
            </button>

            <!-- Dropdown de Notificações -->
            <div id="notificationsDropdown" class="dropdown-menu" style="display: none; right: 0; left: auto; min-width: 320px;">
              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="font-bold">Notificações</h3>
              </div>
              <div class="max-h-96 overflow-y-auto">
                <div class="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <p class="text-sm font-semibold">Nova empresa cadastrada</p>
                  <p class="text-xs text-gray-500 mt-1">Tech Solutions LTDA acabou de se cadastrar</p>
                  <p class="text-xs text-gray-400 mt-1">5 minutos atrás</p>
                </div>
                <div class="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <p class="text-sm font-semibold">Pagamento recebido</p>
                  <p class="text-xs text-gray-500 mt-1">R$ 297,00 - Varejo Premium</p>
                  <p class="text-xs text-gray-400 mt-1">1 hora atrás</p>
                </div>
                <div class="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <p class="text-sm font-semibold">Instância desconectada</p>
                  <p class="text-xs text-gray-500 mt-1">Startup XYZ - WhatsApp desconectado</p>
                  <p class="text-xs text-gray-400 mt-1">2 horas atrás</p>
                </div>
              </div>
              <div class="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <a href="/admin/notificacoes.html" class="text-sm text-purple-600 hover:text-purple-700 font-semibold">Ver todas</a>
              </div>
            </div>
          </div>

          <!-- Menu do Usuário -->
          <div class="user-menu relative">
            <div class="flex items-center gap-2 cursor-pointer" onclick="AdminTemplate.toggleUserMenu()">
              <img src="https://ui-avatars.com/api/?name=Admin&background=5B21B6&color=fff" class="user-avatar" id="userAvatar">
              <div class="user-info hidden md:block">
                <div class="user-name" id="userName">Administrador</div>
                <div class="text-xs text-gray-500" id="userRole">Admin</div>
              </div>
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>

            <!-- Dropdown do Usuário -->
            <div id="userDropdown" class="dropdown-menu" style="display: none; right: 0; left: auto;">
              <a href="/admin/perfil.html" class="dropdown-item">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>Meu Perfil</span>
              </a>
              <a href="/admin/configuracoes.html" class="dropdown-item">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>Configurações</span>
              </a>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <a href="#" onclick="AdminTemplate.logout(); return false;" class="dropdown-item text-red-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Sair</span>
              </a>
            </div>
          </div>
        </div>
      </header>
    `;
  },

  /**
   * Inicializar template
   */
  init(activePage) {
    // Carregar dark mode do localStorage
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark');
    }

    // Verificar autenticação
    Auth.checkAuth();
    const user = Auth.getUser();

    if (user) {
      // Atualizar nome e avatar do usuário
      const userNameEl = document.getElementById('userName');
      const userRoleEl = document.getElementById('userRole');
      const userAvatarEl = document.getElementById('userAvatar');

      if (userNameEl) userNameEl.textContent = user.nome || 'Administrador';
      if (userRoleEl) userRoleEl.textContent = user.funcao || 'Admin';
      if (userAvatarEl) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || 'Admin')}&background=5B21B6&color=fff`;
        userAvatarEl.src = avatarUrl;
      }
    }

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(event) {
      const notifBtn = event.target.closest('.header-btn');
      const userMenu = event.target.closest('.user-menu');

      if (!notifBtn && !userMenu) {
        const notifDropdown = document.getElementById('notificationsDropdown');
        const userDropdown = document.getElementById('userDropdown');
        if (notifDropdown) notifDropdown.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'none';
      }
    });
  },

  /**
   * Toggle Sidebar
   */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('sidebar-collapsed');
  },

  /**
   * Toggle Dark Mode
   */
  toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.contains('dark');

    if (isDark) {
      body.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    } else {
      body.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }
  },

  /**
   * Toggle Notifications
   */
  toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    const userDropdown = document.getElementById('userDropdown');

    if (userDropdown && userDropdown.style.display === 'block') {
      userDropdown.style.display = 'none';
    }

    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Toggle User Menu
   */
  toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    const notifDropdown = document.getElementById('notificationsDropdown');

    if (notifDropdown && notifDropdown.style.display === 'block') {
      notifDropdown.style.display = 'none';
    }

    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Logout
   */
  logout() {
    if (confirm('Deseja realmente sair?')) {
      Auth.logout();
      window.location.href = '/login.html';
    }
  }
};
