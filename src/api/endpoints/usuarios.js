import api from '../client';

// Wrappers sobre /api/usuarios (solo ADMINISTRADOR).
export const usuariosApi = {
  // GET /api/usuarios?rol=  ->  Usuario[] (sin password)
  listar: (rol) => api.get('/usuarios', { params: rol ? { rol } : {} }).then((res) => res.data),

  // POST /api/usuarios  ->  { mensaje, usuario }
  // datos = { cedula, nombres, apellidos, correo, password, rol }
  crear: (datos) => api.post('/usuarios', datos).then((res) => res.data),
};
