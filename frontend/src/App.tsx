import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Conversas from './pages/Conversas';
import Usuarios from './pages/Usuarios';
import Empresas from './pages/Empresas';
import CRM from './pages/CRM';
import AgentesIA from './pages/AgentesIA';

function App() {
  return (
    <BrowserRouter>
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
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conversas" element={<Conversas />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/agentes-ia" element={<AgentesIA />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
