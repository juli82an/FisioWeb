import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PacientesPage from './pages/PacientesPage';
import PacienteDetailPage from './pages/PacienteDetailPage';
import EjerciciosPage from './pages/EjerciciosPage';
import SesionesPage from './pages/SesionesPage';
import GruposPage from './pages/GruposPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetailPage />} />
          <Route path="/ejercicios" element={<EjerciciosPage />} />
          <Route path="/sesiones" element={<SesionesPage />} />
          <Route path="/grupos" element={<GruposPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

