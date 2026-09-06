import api from '../client';

// Wrappers sobre /api/horarios (horario semanal de clases).
export const horariosApi = {
  // GET /api/horarios?espacio=  ->  HorarioClase[] (incluye `espacio` y `docente`)
  listar: (idEspacio) =>
    api.get('/horarios', { params: idEspacio ? { espacio: idEspacio } : {} }).then((res) => res.data),

  // POST /api/horarios (LABORATORISTA / ADMIN)
  // datos = { id_esp, nombre_curso, id_doc?, dia_semana, hora_ini: 'HH:MM', hora_fin: 'HH:MM' }
  crear: (datos) => api.post('/horarios', datos).then((res) => res.data),

  // PUT /api/horarios/:id
  actualizar: (id, datos) => api.put(`/horarios/${id}`, datos).then((res) => res.data),

  // DELETE /api/horarios/:id
  eliminar: (id) => api.delete(`/horarios/${id}`).then((res) => res.data),
};
