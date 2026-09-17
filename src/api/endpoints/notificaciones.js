import api from '../client';

// Wrappers sobre /api/notificaciones.
export const notificacionesApi = {
  // GET /api/notificaciones -> Notificacion[] (las 30 más recientes del usuario)
  listar: () => api.get('/notificaciones').then((res) => res.data),

  // PATCH /api/notificaciones/:id/leer
  marcarLeida: (id) => api.patch(`/notificaciones/${id}/leer`).then((res) => res.data),

  // PATCH /api/notificaciones/leer-todas
  marcarTodasLeidas: () => api.patch('/notificaciones/leer-todas').then((res) => res.data),
};
