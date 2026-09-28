import api from '../client';

// Wrappers finos sobre los endpoints de autenticación del backend.
// Devuelven directamente `response.data`.
export const authApi = {
  // POST /api/auth/login  -> { mensaje, token, usuario }
  login: (credenciales) => api.post('/auth/login', credenciales).then((res) => res.data),

  // POST /api/auth/registro  -> { mensaje, usuario }
  registro: (datos) => api.post('/auth/registro', datos).then((res) => res.data),

  // POST /api/auth/olvide-password -> { mensaje, token, correo, correoEnviado }
  solicitarRecuperacion: (correo) => api.post('/auth/olvide-password', { correo }).then((res) => res.data),

  // POST /api/auth/restablecer-password -> { mensaje }
  restablecerPassword: (datos) => api.post('/auth/restablecer-password', datos).then((res) => res.data),
};
