import api from '../client';

// Wrappers sobre /api/documentos.
export const documentosApi = {
  // GET /api/documentos/reserva/:id_rev -> Documento[]
  // Para rol ESTUDIANTE el backend responde 403 si no registró asistencia.
  listarPorReserva: (idReserva) =>
    api.get(`/documentos/reserva/${idReserva}`).then((res) => res.data),

  // POST /api/documentos (DOCENTE / ADMINISTRADOR) -> { mensaje, documento }
  compartir: (datos) => api.post('/documentos', datos).then((res) => res.data),
};
