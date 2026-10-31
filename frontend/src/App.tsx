import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';          // Libretas (módulo original)
import Solicitudes from './pages/Solicitudes';    // Vista unificada de solicitudes
import Actualizacion from './pages/Actualizacion';
import Consultas from './pages/Consultas';
import Entrevistas from './pages/Entrevistas';
import Reclamos from './pages/Reclamos';
import Quejas from './pages/Quejas';
import { isAuthenticated } from './auth';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="solicitudes"   element={<Solicitudes />} />
          <Route path="libretas"      element={<Requests />} />
          <Route path="actualizacion" element={<Actualizacion />} />
          <Route path="consultas"     element={<Consultas />} />
          <Route path="entrevistas"   element={<Entrevistas />} />
          <Route path="reclamos"      element={<Reclamos />} />
          <Route path="quejas"        element={<Quejas />} />
          {/* Ruta legacy por compatibilidad */}
          <Route path="requests"      element={<Navigate to="/libretas" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
