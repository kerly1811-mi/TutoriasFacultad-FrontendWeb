import api from '../client';

// Wrappers sobre /api/espacios.
export const espaciosApi = {
  // GET /api/espacios?incluirInactivos=1 -> Espacio[] (incluye `estado` y `activo`)
  // Sin incluirInactivos, solo devuelve espacios activos.
  listar: ({ incluirInactivos } = {}) =>
    api.get('/espacios', { params: incluirInactivos ? { incluirInactivos: '1' } : {} }).then((res) => res.data),

  // POST /api/espacios (ADMIN) -> { mensaje, espacio }
  crear: (datos) => api.post('/espacios', datos).then((res) => res.data),

  // PUT /api/espacios/:id (ADMIN) -> { mensaje, espacio }
  actualizar: (id, datos) => api.put(`/espacios/${id}`, datos).then((res) => res.data),

  // PATCH /api/espacios/:id/estado (ADMIN) -> { mensaje, espacio }
  // No se elimina: un espacio deshabilitado deja de ofrecerse para reservar.
  cambiarEstado: (id, activo) => api.patch(`/espacios/${id}/estado`, { activo }).then((res) => res.data),
};
