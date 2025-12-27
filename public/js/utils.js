/**
 * WHATSBENEMAX - Utilitários JavaScript
 * Funções auxiliares, API client, helpers
 */

// ================================================
// API CLIENT
// ================================================

const API = {
  baseURL: window.location.origin,

  /**
   * Converte objeto para query string
   * @param {Object} params - Parâmetros
   * @returns {string} Query string
   */
  buildQueryString(params) {
    if (!params || Object.keys(params).length === 0) return '';

    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  },

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || data.mensagem || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  get(endpoint, params = {}, options = {}) {
    const queryString = this.buildQueryString(params);
    return this.request(endpoint + queryString, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};

// ================================================
// AUTH HELPERS
// ================================================

const Auth = {
  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    localStorage.setItem('auth_token', token);
  },

  removeToken() {
    localStorage.removeItem('auth_token');
  },

  getUser() {
    const user = localStorage.getItem('user_data');
    return user ? JSON.parse(user) : null;
  },

  setUser(userData) {
    localStorage.setItem('user_data', JSON.stringify(userData));
  },

  removeUser() {
    localStorage.removeItem('user_data');
  },

  logout() {
    this.removeToken();
    this.removeUser();
    window.location.href = '/login.html';
  },

  checkAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
};

// ================================================
// TOAST NOTIFICATIONS
// ================================================

const Toast = {
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div>${this.getIcon(type)}</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">${this.getTitle(type)}</div>
          <div style="font-size: 13px; color: var(--text-secondary);">${message}</div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  warning(message, duration) {
    this.show(message, 'warning', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  },

  getIcon(type) {
    const icons = {
      success: `<svg class="w-6 h-6" fill="none" stroke="#10B981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
      error: `<svg class="w-6 h-6" fill="none" stroke="#EF4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
      warning: `<svg class="w-6 h-6" fill="none" stroke="#F59E0B" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      info: `<svg class="w-6 h-6" fill="none" stroke="#3B82F6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    };
    return icons[type] || icons.info;
  },

  getTitle(type) {
    const titles = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Atenção',
      info: 'Informação',
    };
    return titles[type] || 'Informação';
  },
};

// ================================================
// MODAL SYSTEM
// ================================================
// NOTA: O sistema completo de modais está em /js/modal.js
// Este arquivo não define Modal para evitar conflitos.
// Sempre inclua modal.js após utils.js nas páginas.

// ================================================
// DARK MODE
// ================================================

const DarkMode = {
  toggle() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('dark_mode', isDark ? 'true' : 'false');
  },

  init() {
    const isDark = localStorage.getItem('dark_mode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  },
};

// ================================================
// SIDEBAR
// ================================================

const Sidebar = {
  toggle() {
    const sidebar = document.querySelector('.app-sidebar');
    const header = document.querySelector('.app-header');
    const main = document.querySelector('.app-main');

    sidebar?.classList.toggle('collapsed');
    header?.classList.toggle('sidebar-collapsed');
    main?.classList.toggle('sidebar-collapsed');

    const isCollapsed = sidebar?.classList.contains('collapsed');
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  },

  init() {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) {
      document.querySelector('.app-sidebar')?.classList.add('collapsed');
      document.querySelector('.app-header')?.classList.add('sidebar-collapsed');
      document.querySelector('.app-main')?.classList.add('sidebar-collapsed');
    }
  },
};

// ================================================
// FORMATTERS
// ================================================

const Format = {
  phone(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  },

  currency(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  date(date) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  },

  datetime(date) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));
  },

  relativeTime(date) {
    if (!date) return '-';

    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000); // segundos

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;

    return this.date(date);
  },

  truncate(text, length = 50) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
  },
};

// ================================================
// VALIDATORS
// ================================================

const Validate = {
  email(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  phone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  },

  cpf(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;

    // Validação básica (não verifica dígitos verificadores)
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    return true;
  },

  cnpj(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return false;

    // Validação básica
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    return true;
  },

  required(value) {
    return value !== null && value !== undefined && value.trim() !== '';
  },

  minLength(value, min) {
    return value && value.length >= min;
  },

  maxLength(value, max) {
    return value && value.length <= max;
  },
};

// ================================================
// COPY TO CLIPBOARD
// ================================================

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.success('Copiado para a área de transferência!');
    return true;
  } catch (error) {
    Toast.error('Erro ao copiar');
    return false;
  }
}

// ================================================
// DEBOUNCE
// ================================================

function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ================================================
// INIT
// ================================================

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar dark mode
  DarkMode.init();

  // Inicializar sidebar
  Sidebar.init();

  // Fechar modais ao clicar fora
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      Modal.closeAll();
    }
  });

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      Modal.closeAll();
    }
  });

  // Busca global com Ctrl+K ou Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('.header-search input');
      searchInput?.focus();
    }
  });
});

// Exportar para uso global
window.API = API;
window.Auth = Auth;
window.Toast = Toast;
window.Modal = Modal;
window.DarkMode = DarkMode;
window.Sidebar = Sidebar;
window.Format = Format;
window.Validate = Validate;
window.copyToClipboard = copyToClipboard;
window.debounce = debounce;
