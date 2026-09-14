import api from '../client';

// Wrappers sobre /api/niveles.
export const nivelesApi = {
  // GET /api/niveles?id_car= -> Nivel[] (incluye `carrera`)
  listar: (id_car) => api.get('/niveles', { params: id_car ? { id_car } : {} }).then((res) => res.data),

  // POST /api/niveles (ADMIN) -> { mensaje, nivel }
  // datos = { nom_niv, id_car }
  crear: (datos) => api.post('/niveles', datos).then((res) => res.data),

  // DELETE /api/niveles/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/niveles/${id}`).then((res) => res.data),
};
