import api from '../client';

// Wrappers sobre /api/documentos.
export const documentosApi = {
  // GET /api/documentos/reserva/:id_rev -> Documento[] (incluye `extension`, `tamano_bytes`)
  // Para rol ESTUDIANTE el backend responde 403 si no registró asistencia.
  listarPorReserva: (idReserva) =>
    api.get(`/documentos/reserva/${idReserva}`).then((res) => res.data),

  // POST /api/documentos/subir (DOCENTE dueño / ADMINISTRADOR) -> { mensaje, documento }
  // multipart/form-data: { id_rev, archivo: File }. Máximo 25 MB por archivo.
  subir: (idReserva, archivo, onProgreso) => {
    const form = new FormData();
    form.append('id_rev', idReserva);
    form.append('archivo', archivo);
    return api
      .post('/documentos/subir', form, {
        onUploadProgress: onProgreso
          ? (e) => onProgreso(e.total ? Math.round((e.loaded * 100) / e.total) : 0)
          : undefined,
      })
      .then((res) => res.data);
  },

  // POST /api/documentos (DOCENTE / ADMINISTRADOR) -> { mensaje, documento }
  // Comparte un enlace externo en vez de subir un archivo.
  compartir: (datos) => api.post('/documentos', datos).then((res) => res.data),

  // DELETE /api/documentos/:id (docente dueño / ADMINISTRADOR) -> { mensaje }
  eliminar: (id) => api.delete(`/documentos/${id}`).then((res) => res.data),
};
