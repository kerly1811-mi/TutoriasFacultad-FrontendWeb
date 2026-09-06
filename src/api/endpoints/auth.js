import api from '../client';

// Wrappers finos sobre los endpoints de autenticación del backend.
// Devuelven directamente `response.data`.
export const authApi = {
  // POST /api/auth/login  -> { mensaje, token, usuario }
  login: (credenciales) => api.post('/auth/login', credenciales).then((res) => res.data),

  // POST /api/auth/registro  -> { mensaje, usuario }
  registro: (datos) => api.post('/auth/registro', datos).then((res) => res.data),
};
