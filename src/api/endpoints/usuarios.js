import api from '../client';

// Wrappers sobre /api/usuarios (solo ADMINISTRADOR).
export const usuariosApi = {
  // GET /api/usuarios?rol=&incluirInactivos=1  ->  Usuario[] (sin password, incluye `activo`)
  listar: ({ rol, incluirInactivos } = {}) =>
    api
      .get('/usuarios', { params: { ...(rol && { rol }), ...(incluirInactivos && { incluirInactivos: '1' }) } })
      .then((res) => res.data),

  // POST /api/usuarios  ->  { mensaje, usuario }
  // datos = { cedula, nombres, apellidos, correo, password, rol }
  crear: (datos) => api.post('/usuarios', datos).then((res) => res.data),

  // PATCH /api/usuarios/:id/estado  ->  { mensaje, usuario }
  // No se elimina: un usuario deshabilitado no puede iniciar sesión.
  cambiarEstado: (id, activo) => api.patch(`/usuarios/${id}/estado`, { activo }).then((res) => res.data),
};
