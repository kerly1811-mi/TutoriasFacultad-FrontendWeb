import api from '../client';

// Wrappers sobre /api/espacios.
export const espaciosApi = {
  // GET /api/espacios -> Espacio[] (incluye `estado`)
  listar: () => api.get('/espacios').then((res) => res.data),

  // POST /api/espacios (ADMIN) -> { mensaje, espacio }
  crear: (datos) => api.post('/espacios', datos).then((res) => res.data),

  // PUT /api/espacios/:id (ADMIN) -> { mensaje, espacio }
  actualizar: (id, datos) => api.put(`/espacios/${id}`, datos).then((res) => res.data),

  // DELETE /api/espacios/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/espacios/${id}`).then((res) => res.data),
};
