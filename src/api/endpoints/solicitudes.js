import api from '../client';

// Wrappers sobre /api/solicitudes (estudiante -> docente, para pedir una tutoría).
export const solicitudesApi = {
  // GET /api/solicitudes -> Solicitud[] (DOCENTE: las de sus paralelos; ESTUDIANTE: las suyas)
  // Incluye `estudiante` y `paralelo` (con materia/nivel/carrera/docente).
  listar: () => api.get('/solicitudes').then((res) => res.data),

  // POST /api/solicitudes (ESTUDIANTE) -> { mensaje, solicitud }
  // datos = { id_par, fecha: 'YYYY-MM-DD', hor_ini: 'HH:MM', hor_fin: 'HH:MM', tema }
  crear: (datos) => api.post('/solicitudes', datos).then((res) => res.data),

  // PATCH /api/solicitudes/:id/aceptar (DOCENTE dueño del paralelo) -> { mensaje, solicitud }
  aceptar: (id) => api.patch(`/solicitudes/${id}/aceptar`).then((res) => res.data),

  // PATCH /api/solicitudes/:id/rechazar (DOCENTE dueño del paralelo) -> { mensaje, solicitud }
  // `razon` es obligatoria.
  rechazar: (id, razon) => api.patch(`/solicitudes/${id}/rechazar`, { razon }).then((res) => res.data),
};
