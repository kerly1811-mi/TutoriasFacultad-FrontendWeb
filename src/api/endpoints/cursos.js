import api from '../client';

// Wrappers sobre /api/cursos.
export const cursosApi = {
  // GET /api/cursos -> Curso[] (incluye `docente`)
  listar: () => api.get('/cursos').then((res) => res.data),

  // POST /api/cursos (ADMIN) -> { mensaje, curso }
  crear: (datos) => api.post('/cursos', datos).then((res) => res.data),

  // PUT /api/cursos/:id (ADMIN) -> { mensaje, curso }
  actualizar: (id, datos) => api.put(`/cursos/${id}`, datos).then((res) => res.data),

  // DELETE /api/cursos/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/cursos/${id}`).then((res) => res.data),
};
