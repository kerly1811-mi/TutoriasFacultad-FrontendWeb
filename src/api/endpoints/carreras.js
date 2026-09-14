import api from '../client';

// Wrappers sobre /api/carreras.
export const carrerasApi = {
  // GET /api/carreras -> Carrera[] (incluye `niveles`)
  listar: () => api.get('/carreras').then((res) => res.data),

  // POST /api/carreras (ADMIN) -> { mensaje, carrera }
  crear: (datos) => api.post('/carreras', datos).then((res) => res.data),

  // PUT /api/carreras/:id (ADMIN) -> { mensaje, carrera }
  actualizar: (id, datos) => api.put(`/carreras/${id}`, datos).then((res) => res.data),

  // DELETE /api/carreras/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/carreras/${id}`).then((res) => res.data),
};
