import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastrar from './pages/Cadastrar';
import RecuperarSenha from './pages/RecuperarSenha';
import Dashboard from './pages/Dashboard';
import Conversas from './pages/Conversas';
import Usuarios from './pages/Usuarios';
import Empresas from './pages/Empresas';
import CRM from './pages/CRM';
import AgentesIA from './pages/AgentesIA';
import Integracoes from './pages/Integracoes';
import Followup from './pages/Followup';
import Configuracoes from './pages/Configuracoes';
import Instancias from './pages/Instancias';
import Whitelabel from './pages/Whitelabel';
import Contatos from './pages/Contatos';
import Prospeccao from './pages/Prospeccao';
import Relatorios from './pages/Relatorios';
import Assinatura from './pages/Assinatura';
import Notificacoes from './pages/Notificacoes';
import Manager from './pages/Manager';
import EnviarMensagem from './pages/EnviarMensagem';
import Documentacao from './pages/Documentacao';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastrar" element={<Cadastrar />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/esqueci-senha" element={<RecuperarSenha />} />

          {/* Rotas Protegidas */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversas"
            element={
              <ProtectedRoute>
                <Layout>
                  <Conversas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <Usuarios />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/empresas"
            element={
              <ProtectedRoute>
                <Layout>
                  <Empresas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <Layout>
                  <CRM />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agentes-ia"
            element={
              <ProtectedRoute>
                <Layout>
                  <AgentesIA />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integracoes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Integracoes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/followup"
            element={
              <ProtectedRoute>
                <Layout>
                  <Followup />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute>
                <Layout>
                  <Configuracoes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instancias"
            element={
              <ProtectedRoute>
                <Layout>
                  <Instancias />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whitelabel"
            element={
              <ProtectedRoute>
                <Layout>
                  <Whitelabel />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contatos"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contatos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prospeccao"
            element={
              <ProtectedRoute>
                <Layout>
                  <Prospeccao />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <Layout>
                  <Relatorios />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assinatura"
            element={
              <ProtectedRoute>
                <Layout>
                  <Assinatura />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notificacoes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notificacoes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute>
                <Layout>
                  <Manager />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enviar-mensagem"
            element={
              <ProtectedRoute>
                <Layout>
                  <EnviarMensagem />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentacao"
            element={
              <ProtectedRoute>
                <Layout>
                  <Documentacao />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
