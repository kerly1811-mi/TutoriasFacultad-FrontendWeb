import api from '../client';

// GET /api/disponibilidad?fecha=YYYY-MM-DD&hora_ini=HH:MM&hora_fin=HH:MM
// -> { fecha, dia_semana, con_franja, espacios: [{ id_esp, nom_esp, tipo, capacidad,
//      ubicacion, libre, ocupaciones: [{ tipo:'CLASE'|'RESERVA', etiqueta, hora_ini, hora_fin }] }] }
export const disponibilidadApi = {
  consultar: ({ fecha, horaIni, horaFin }) =>
    api
      .get('/disponibilidad', {
        params: { fecha, ...(horaIni && horaFin ? { hora_ini: horaIni, hora_fin: horaFin } : {}) },
      })
      .then((res) => res.data),
};
