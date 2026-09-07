// Utilidades de formato centralizadas.
//
// Todo el tiempo (fecha y hora) se trata en UTC: el backend guarda `fecha` como
// `@db.Date` y las horas como hora-del-día en UTC ("09:00" -> 09:00Z). Si
// formateáramos en hora local, en Ecuador (UTC-5) las fechas retrocederían un
// día y las horas -5h. Por eso siempre `timeZone: 'UTC'` / `getUTC*`.

const LOCALE = 'es-EC';

// Fecha corta: 06/09/2026
export function formatearFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString(LOCALE, { timeZone: 'UTC' });
}

// Fecha larga: "sábado, 6 de septiembre"
export function formatearFechaLarga(valor = new Date()) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString(LOCALE, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Fecha con día de la semana: "lunes, 07/09/2026"
export function formatearFechaConDia(valor) {
  if (!valor) return '—';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00:00.000Z` : valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  const dia = d.toLocaleDateString(LOCALE, { timeZone: 'UTC', weekday: 'long' });
  return `${capitalizar(dia)}, ${formatearFecha(valor)}`;
}

// Hora en formato 24h "HH:MM". Acepta "HH:MM" (ya listo) o una fecha ISO.
export function formatearHora(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && /^\d{1,2}:\d{2}/.test(valor)) {
    const [h, m] = valor.split(':');
    return `${h.padStart(2, '0')}:${m.slice(0, 2)}`;
  }
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Rango "09:00 – 11:00"
export function formatearRango(ini, fin) {
  return `${formatearHora(ini)} – ${formatearHora(fin)}`;
}

// Clave de día "YYYY-MM-DD" (en UTC) para comparar fechas de distinto formato.
export function claveDia(valor) {
  if (!valor) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00:00.000Z` : valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toISOString().slice(0, 10);
}

// ¿Dos valores (ISO o "YYYY-MM-DD") caen el mismo día?
export function mismaFecha(a, b) {
  return claveDia(a) === claveDia(b);
}

// Minutos desde medianoche. Acepta "HH:MM" o una fecha ISO (hora-del-día en UTC).
export function horaEnMinutos(valor) {
  if (!valor) return 0;
  if (typeof valor === 'string' && /^\d{1,2}:\d{2}$/.test(valor)) {
    const [h, m] = valor.split(':').map(Number);
    return h * 60 + m;
  }
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// "ESTUDIANTE" -> "Estudiante"
export function capitalizar(texto = '') {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Mensaje de error legible a partir de un error de axios.
export function mensajeDeError(err, respaldo = 'Ocurrió un error inesperado.') {
  return err?.response?.data?.error || respaldo;
}
