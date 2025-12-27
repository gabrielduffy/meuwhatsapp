import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastrar from './pages/Cadastrar';
import Dashboard from './pages/Dashboard';
import Conversas from './pages/Conversas';
import Usuarios from './pages/Usuarios';
import Empresas from './pages/Empresas';
import CRM from './pages/CRM';
import AgentesIA from './pages/AgentesIA';
import Integracoes from './pages/Integracoes';
import Followup from './pages/Followup';
import Configuracoes from './pages/Configuracoes';

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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
