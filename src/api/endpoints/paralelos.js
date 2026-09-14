import api from '../client';

// Wrappers sobre /api/paralelos.
export const paralelosApi = {
  // GET /api/paralelos?id_niv=&id_doc= -> Paralelo[] (incluye `materia`, `nivel.carrera`, `docente`)
  listar: (params) => api.get('/paralelos', { params }).then((res) => res.data),

  // POST /api/paralelos (ADMIN) -> { mensaje, paralelo }
  // datos = { nom_par, id_mat, id_niv, id_doc }
  crear: (datos) => api.post('/paralelos', datos).then((res) => res.data),

  // PUT /api/paralelos/:id (ADMIN) -> { mensaje, paralelo }
  actualizar: (id, datos) => api.put(`/paralelos/${id}`, datos).then((res) => res.data),

  // DELETE /api/paralelos/:id (ADMIN) -> { mensaje }
  eliminar: (id) => api.delete(`/paralelos/${id}`).then((res) => res.data),
};
