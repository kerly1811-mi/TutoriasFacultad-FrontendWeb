import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ACCESO_RUTA } from './lib/permisos';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Dashboard from './pages/Dashboard';
import Tutorias from './pages/Tutorias';
import Reservas from './pages/Reservas';
import DetalleReserva from './pages/DetalleReserva';
import Horarios from './pages/Horarios';
import Ocupacion from './pages/Ocupacion';
import Espacios from './pages/Espacios';
import Usuarios from './pages/Usuarios';
import Cursos from './pages/Cursos';
import Matriculas from './pages/Matriculas';
import ControlAcceso from './pages/ControlAcceso';
import Solicitudes from './pages/Solicitudes';
import MisTutorias from './pages/MisTutorias';
import Reportes from './pages/Reportes';

// path -> componente. Los roles con acceso se toman de ACCESO_RUTA (lib/permisos).
const RUTAS_PRIVADAS = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/tutorias', element: <Tutorias /> },
  { path: '/reservas', element: <Reservas /> },
  { path: '/reservas/:id', element: <DetalleReserva /> },
  { path: '/horarios', element: <Horarios /> },
  { path: '/ocupacion', element: <Ocupacion /> },
  { path: '/espacios', element: <Espacios /> },
  { path: '/usuarios', element: <Usuarios /> },
  { path: '/cursos', element: <Cursos /> },
  { path: '/matriculas', element: <Matriculas /> },
  { path: '/control-acceso', element: <ControlAcceso /> },
  { path: '/solicitudes', element: <Solicitudes /> },
  { path: '/mis-tutorias', element: <MisTutorias /> },
  { path: '/reportes', element: <Reportes /> },
];

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {RUTAS_PRIVADAS.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute rolesPermitidos={ACCESO_RUTA[path]}>{element}</ProtectedRoute>}
            />
          ))}

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
