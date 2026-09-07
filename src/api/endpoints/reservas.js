import api from '../client';

// Wrappers sobre /api/reservas.
export const reservasApi = {
  // GET /api/reservas  ->  Reserva[] (incluye `espacio` y `solicitante`)
  // opts.mias = true  ->  solo las del usuario del token
  listar: ({ mias = false } = {}) =>
    api.get('/reservas', { params: mias ? { mias: 1 } : {} }).then((res) => res.data),

  // POST /api/reservas (DOCENTE) -> { mensaje, reserva }
  // datos = { id_esp, fecha: 'YYYY-MM-DD', hor_ini: 'HH:MM', hor_fin: 'HH:MM', motivo, id_cur? }
  // Puede responder 409 si el aula ya está ocupada en esa franja.
  crear: (datos) => api.post('/reservas', datos).then((res) => res.data),

  // PATCH /api/reservas/:id/cancelar (dueño, LABORATORISTA o ADMIN) -> { mensaje, reserva }
  // `motivo` es obligatorio: por qué se cancela la reserva.
  cancelar: (id, motivo) => api.patch(`/reservas/${id}/cancelar`, { motivo }).then((res) => res.data),

  // El backend no expone GET /api/reservas/:id, así que se obtiene del listado.
  obtener: (id) =>
    api.get('/reservas').then((res) => res.data.find((r) => r.id_rev === Number(id)) ?? null),
};
