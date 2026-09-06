import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { INICIO_POR_ROL } from '../lib/permisos';

// Envuelve páginas que requieren sesión iniciada.
// Si se pasa `rolesPermitidos`, restringe por rol (igual que verificarRol en el backend)
// y manda al usuario a su pantalla de inicio según su rol.
export default function ProtectedRoute({ children, rolesPermitidos }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to={INICIO_POR_ROL[usuario.rol] || '/dashboard'} replace />;
  }

  return children;
}
