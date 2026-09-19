import api from '../client';

// Wrappers sobre /api/asistencias.
// Nota: el registro de asistencia (escaneo de QR) es exclusivo de la app móvil;
// en web solo se consulta el listado ya registrado.
export const asistenciasApi = {
  // GET /api/asistencias/reserva/:id_rev -> Asistencia[] (incluye `estudiante`)
  listarPorReserva: (idReserva) =>
    api.get(`/asistencias/reserva/${idReserva}`).then((res) => res.data),

  // POST /api/asistencias/manual (DOCENTE dueño de la reserva) -> { mensaje, asistencia }
  // Marca presente a un estudiante matriculado en el curso de la tutoría.
  registrarManual: (idReserva, idEstudiante) =>
    api.post('/asistencias/manual', { id_rev: idReserva, id_est: idEstudiante }).then((res) => res.data),

  // DELETE /api/asistencias/manual/:id_rev/:id_est (DOCENTE dueño) -> { mensaje }
  quitarManual: (idReserva, idEstudiante) =>
    api.delete(`/asistencias/manual/${idReserva}/${idEstudiante}`).then((res) => res.data),
};
