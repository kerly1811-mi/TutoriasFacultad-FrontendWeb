import api from '../client';

// Wrappers sobre /api/asistencias.
// Nota: el registro de asistencia (escaneo de QR) es exclusivo de la app móvil;
// en web solo se consulta el listado ya registrado.
export const asistenciasApi = {
  // GET /api/asistencias/reserva/:id_rev -> Asistencia[] (incluye `estudiante`)
  listarPorReserva: (idReserva) =>
    api.get(`/asistencias/reserva/${idReserva}`).then((res) => res.data),
};
