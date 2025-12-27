import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Conversas from './pages/Conversas';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/conversas" replace />} />
          <Route path="/conversas" element={<Conversas />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
