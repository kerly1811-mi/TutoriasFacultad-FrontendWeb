import axios from 'axios';

// La URL del backend se toma de la variable de entorno VITE_API_URL.
// En desarrollo local, tu backend corre en http://localhost:3000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Adjunta automáticamente el token JWT guardado en localStorage a cada petición,
// tal como lo espera el middleware verificarToken del backend (header Authorization: Bearer <token>)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró o es inválido, el backend responde 400/401.
// Limpiamos la sesión y mandamos al usuario de vuelta al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 400)) {
      const mensaje = error.response.data?.error || '';
      if (mensaje.toLowerCase().includes('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
