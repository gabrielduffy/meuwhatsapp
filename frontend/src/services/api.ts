import axios from 'axios';

// Base URL da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - tentar renovar
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/autenticacao/atualizar-token`, {
            tokenAtualizacao: refreshToken,
          });

          localStorage.setItem('token', data.token);

          // Repetir requisição original
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Falhou ao renovar - fazer logout
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('usuario');
          window.location.href = '/entrar';
        }
      } else {
        // Sem refresh token - fazer logout
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
        window.location.href = '/entrar';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Tipos
export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
  nomeEmpresa?: string;
  codigoAfiliado?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  email_verificado: boolean;
  papel: 'admin' | 'usuario';
  empresa_id: number;
  avatar_url?: string;
  criado_em: string;
}

export interface Empresa {
  id: number;
  nome: string;
  slug: string;
  saldo_creditos: number;
  plano_nome: string;
}

export interface AuthResponse {
  token: string;
  tokenAtualizacao: string;
  usuario: Usuario;
  empresa: Empresa;
  mensagem: string;
}

// Serviço de Autenticação
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post('/api/autenticacao/entrar', credentials);

    // Salvar tokens e usuário no localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.tokenAtualizacao);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('empresa', JSON.stringify(data.empresa));

    return data;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post('/api/autenticacao/cadastrar', registerData);

    // Salvar tokens e usuário no localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.tokenAtualizacao);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('empresa', JSON.stringify(data.empresa));

    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      if (refreshToken) {
        await api.post('/api/autenticacao/sair', { tokenAtualizacao: refreshToken });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa');
    }
  },

  async getCurrentUser(): Promise<{ usuario: Usuario; empresa: Empresa }> {
    const { data } = await api.get('/api/autenticacao/eu');

    // Atualizar dados no localStorage
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('empresa', JSON.stringify(data.empresa));

    return data;
  },

  async forgotPassword(email: string): Promise<{ mensagem: string }> {
    const { data } = await api.post('/api/autenticacao/esqueci-senha', { email });
    return data;
  },

  async resetPassword(token: string, novaSenha: string): Promise<{ mensagem: string }> {
    const { data } = await api.post('/api/autenticacao/redefinir-senha', { token, novaSenha });
    return data;
  },

  async changePassword(senhaAtual: string, novaSenha: string): Promise<{ mensagem: string }> {
    const { data } = await api.post('/api/autenticacao/alterar-senha', { senhaAtual, novaSenha });
    return data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getStoredUser(): Usuario | null {
    const userStr = localStorage.getItem('usuario');
    return userStr ? JSON.parse(userStr) : null;
  },

  getStoredEmpresa(): Empresa | null {
    const empresaStr = localStorage.getItem('empresa');
    return empresaStr ? JSON.parse(empresaStr) : null;
  },
};
