// Utilidades para mostrar y comparar el horario semanal de un paralelo
// (bloques { dia_semana, hora_ini, hora_fin, espacio? } de HorarioClase).
import { horaEnMinutos } from './formato';

const ORDEN_DIA = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };
export const ABREV_DIA_CORTA = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb' };

const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Resume los bloques de una hora en franjas por día, uniendo horas seguidas en la misma aula
 * y quitando repeticiones (el PDF a veces pone la misma clase en dos aulas):
 *   [{ dia, ini: '14:00', fin: '16:00', espacios: ['LABORATORIO 6'] }, ...] en orden Lun→Vie.
 */
export function resumirHorario(bloques = []) {
  // 1) Una entrada por (día, hora): si el mismo bloque está en varias aulas, se juntan.
  const porFranja = new Map();
  for (const b of bloques) {
    const clave = `${b.dia_semana}|${b.hora_ini}|${b.hora_fin}`;
    if (!porFranja.has(clave)) {
      porFranja.set(clave, {
        dia: b.dia_semana,
        ini: horaEnMinutos(b.hora_ini),
        fin: horaEnMinutos(b.hora_fin),
        espacios: [],
      });
    }
    const f = porFranja.get(clave);
    const aula = b.espacio?.nom_esp;
    if (aula && !f.espacios.includes(aula)) f.espacios.push(aula);
  }

  // 2) En orden Lun→Vie y por hora, se unen las horas seguidas con las mismas aulas.
  const ordenadas = [...porFranja.values()]
    .map((f) => ({ ...f, espacios: f.espacios.sort() }))
    .sort((a, b) => (ORDEN_DIA[a.dia] ?? 9) - (ORDEN_DIA[b.dia] ?? 9) || a.ini - b.ini);

  const franjas = [];
  for (const f of ordenadas) {
    const previa = franjas[franjas.length - 1];
    if (previa && previa.dia === f.dia && previa.fin === f.ini && previa.espacios.join() === f.espacios.join()) {
      previa.fin = f.fin;
    } else {
      franjas.push({ ...f });
    }
  }
  return franjas.map((f) => ({ ...f, ini: aHora(f.ini), fin: aHora(f.fin) }));
}

// "Lun 14:00–16:00 · Mar 17:00–19:00"
export function textoHorario(bloques = []) {
  const franjas = resumirHorario(bloques);
  if (franjas.length === 0) return 'Sin horario cargado';
  return franjas.map((f) => `${ABREV_DIA_CORTA[f.dia] || f.dia} ${f.ini}–${f.fin}`).join(' · ');
}

// Primer bloque de `a` que se cruza con alguno de `b` (mismo día y horas solapadas), o null.
export function primerChoque(a = [], b = []) {
  for (const x of a) {
    for (const y of b) {
      if (
        x.dia_semana === y.dia_semana &&
        horaEnMinutos(x.hora_ini) < horaEnMinutos(y.hora_fin) &&
        horaEnMinutos(y.hora_ini) < horaEnMinutos(x.hora_fin)
      ) {
        return y;
      }
    }
  }
  return null;
}
