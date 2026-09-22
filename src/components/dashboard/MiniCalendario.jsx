import Card from '../ui/Card';
import { fechaISO } from '../../lib/formato';

const DIAS_CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Celdas del mes de `hoy`, en semanas Lunes-Domingo, rellenando con null los
// huecos antes del día 1 y después del último día.
function celdasDelMes(hoy) {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const offsetInicial = (primerDia.getDay() + 6) % 7; // Lunes=0

  const celdas = Array.from({ length: offsetInicial }, () => null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

/**
 * Calendario de solo lectura del mes actual: resalta hoy y marca con un punto
 * los días presentes en `diasConEventos` (Set de 'YYYY-MM-DD').
 */
export default function MiniCalendario({ titulo = 'Este mes', diasConEventos = new Set() }) {
  const hoy = new Date();
  const celdas = celdasDelMes(hoy);
  const hoyISO = fechaISO(hoy);

  return (
    <Card padding="p-5">
      <p className="font-display text-base text-ink mb-1">{titulo}</p>
      <p className="text-xs text-ink/50 mb-4">
        {MESES[hoy.getMonth()]} {hoy.getFullYear()}
      </p>

      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {DIAS_CABECERA.map((d) => (
          <span key={d} className="text-[10px] uppercase text-ink/40 font-medium">
            {d}
          </span>
        ))}

        {celdas.map((dia, i) => {
          if (!dia) return <span key={i} />;
          const iso = fechaISO(dia);
          const esHoy = iso === hoyISO;
          const tieneEventos = diasConEventos.has(iso);
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                  esHoy ? 'bg-azul text-white font-medium' : 'text-ink/70'
                }`}
              >
                {dia.getDate()}
              </span>
              <span className={`w-1 h-1 rounded-full ${tieneEventos ? 'bg-celeste-dark' : ''}`} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
