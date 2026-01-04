import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/api';
import type { Usuario, Empresa, LoginCredentials, RegisterData } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  usuario: Usuario | null;
  empresa: Empresa | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário do localStorage na inicialização
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          const storedEmpresa = authService.getStoredEmpresa();

          setUsuario(storedUser);
          setEmpresa(storedEmpresa);

          // Buscar dados atualizados do servidor
          try {
            const data = await authService.getCurrentUser();
            setUsuario(data.usuario);
            setEmpresa(data.empresa);
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const data = await authService.login(credentials);

      setUsuario(data.usuario);
      setEmpresa(data.empresa);

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      const errorMessage = error.response?.data?.erro || 'Erro ao fazer login';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registerData: RegisterData) => {
    try {
      setIsLoading(true);
      const data = await authService.register(registerData);

      setUsuario(data.usuario);
      setEmpresa(data.empresa);

      toast.success('Cadastro realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer cadastro:', error);
      const errorMessage = error.response?.data?.erro || 'Erro ao fazer cadastro';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUsuario(null);
      setEmpresa(null);
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getCurrentUser();
      setUsuario(data.usuario);
      setEmpresa(data.empresa);
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      // Simular delay de rede
      await new Promise((resolve) => setTimeout(resolve, 800));

      const demoUser: Usuario = {
        id: 999,
        nome: 'Administrador Demo',
        email: 'demo@whatsbenemax.com',
        email_verificado: true,
        papel: 'admin',
        empresa_id: 1,
        avatar_url: 'https://ui-avatars.com/api/?name=Admin+Demo&background=5B21B6&color=fff',
        criado_em: new Date().toISOString(),
      };

      const demoEmpresa: Empresa = {
        id: 1,
        nome: 'Empresa Demonstração',
        slug: 'empresa-demo',
        saldo_creditos: 1000,
        plano_nome: 'Business',
      };

      setUsuario(demoUser);
      setEmpresa(demoEmpresa);

      // Salvar flags falsas no storage para persistência básica
      localStorage.setItem('auth_token', 'DEMO_TOKEN');
      localStorage.setItem('refresh_token', 'DEMO_REFRESH');
      localStorage.setItem('user_data', JSON.stringify(demoUser));
      localStorage.setItem('empresa_data', JSON.stringify(demoEmpresa));

      toast.success('Modo Demonstração Ativado!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        empresa,
        isAuthenticated: !!usuario,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
