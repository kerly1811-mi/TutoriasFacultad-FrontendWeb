import api from '../client';

// Wrappers sobre /api/matriculas. ADMIN ve todas; ESTUDIANTE solo las suyas;
// DOCENTE debe pasar { id_par } de un paralelo suyo.
export const matriculasApi = {
  // GET /api/matriculas?id_par= -> Matricula[] (incluye `estudiante` y `paralelo` con materia/nivel/carrera/docente)
  listar: (params) => api.get('/matriculas', { params }).then((res) => res.data),

  // POST /api/matriculas -> { mensaje, matricula }
  // datos = { id_est, id_par }
  crear: (datos) => api.post('/matriculas', datos).then((res) => res.data),

  // DELETE /api/matriculas/:id -> { mensaje }
  eliminar: (id) => api.delete(`/matriculas/${id}`).then((res) => res.data),

  // Automatrícula (ESTUDIANTE). Reglas: máx. 5 materias, sin repetir materia, sin choque de horario.
  // POST /api/matriculas/mias { id_par } -> { mensaje, matricula }
  inscribirme: (id_par) => api.post('/matriculas/mias', { id_par }).then((res) => res.data),

  // DELETE /api/matriculas/mias/:id -> { mensaje }
  retirarme: (id) => api.delete(`/matriculas/mias/${id}`).then((res) => res.data),
};
