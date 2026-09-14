import api from '../client';

// Wrappers sobre /api/materias.
export const materiasApi = {
  // GET /api/materias -> Materia[]
  listar: () => api.get('/materias').then((res) => res.data),

  // POST /api/materias (ADMIN) -> { mensaje, materia }
  crear: (datos) => api.post('/materias', datos).then((res) => res.data),

  // PUT /api/materias/:id (ADMIN) -> { mensaje, materia }
  actualizar: (id, datos) => api.put(`/materias/${id}`, datos).then((res) => res.data),

  // DELETE /api/materias/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/materias/${id}`).then((res) => res.data),
};
