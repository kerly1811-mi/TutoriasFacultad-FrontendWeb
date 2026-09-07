import api from '../client';

// GET /api/tutorias -> tutorías confirmadas de hoy en adelante
// [{ id_rev, aula, tipo, bloque, piso, fecha, hora_ini, hora_fin, docente, tema }]
export const tutoriasApi = {
  listar: () => api.get('/tutorias').then((res) => res.data),
};
