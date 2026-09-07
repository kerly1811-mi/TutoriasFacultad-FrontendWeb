import api from '../client';

// Wrappers sobre /api/matriculas (solo ADMINISTRADOR).
export const matriculasApi = {
  // GET /api/matriculas -> Matricula[] (incluye `estudiante` y `curso`)
  listar: () => api.get('/matriculas').then((res) => res.data),

  // POST /api/matriculas -> { mensaje, matricula }
  // datos = { id_est, id_cur }
  crear: (datos) => api.post('/matriculas', datos).then((res) => res.data),

  // DELETE /api/matriculas/:id -> { mensaje }
  eliminar: (id) => api.delete(`/matriculas/${id}`).then((res) => res.data),
};
