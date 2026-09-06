import { createContext, useContext, useState } from 'react';
import { authApi } from '../api/endpoints/auth';
import { mensajeDeError } from '../lib/formato';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Coincide exactamente con POST /api/auth/login del backend: { correo, password }
  async function iniciarSesion(correo, password) {
    setCargando(true);
    setError(null);
    try {
      const data = await authApi.login({ correo, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return true;
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo iniciar sesión.'));
      return false;
    } finally {
      setCargando(false);
    }
  }

  // Coincide exactamente con POST /api/auth/registro: { cedula, nombres, apellidos, correo, password, rol }
  async function registrar(datos) {
    setCargando(true);
    setError(null);
    try {
      await authApi.registro(datos);
      return true;
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo completar el registro.'));
      return false;
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, error, iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
