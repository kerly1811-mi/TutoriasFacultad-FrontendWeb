import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { horariosApi } from '../api/endpoints/horarios';
import { matriculasApi } from '../api/endpoints/matriculas';
import { tutoriasApi } from '../api/endpoints/tutorias';
import { DIAS_SEMANA, ETIQUETA_DIA } from '../lib/constantes';
import { esHoy, fechaISO, horaEnMinutos, mismaFecha, semanaActual } from '../lib/formato';
import { Badge, Button, DataState, PageHeader, normalizarBusqueda } from '../components/ui';

const DIAS_MOSTRADOS = DIAS_SEMANA; // Lunes a Viernes, como en el horario de clases
const ABREV_DIA = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie' };

const NUMERO_NIVEL = {
  'primer semestre': 1, 'segundo semestre': 2, 'tercer semestre': 3, 'cuarto semestre': 4,
  'quinto semestre': 5, 'sexto semestre': 6, 'septimo semestre': 7, 'octavo semestre': 8,
  'noveno semestre': 9, 'decimo semestre': 10,
};
const normalizar = normalizarBusqueda;

/**
 * ¿Este bloque de HorarioClase es de uno de los paralelos del estudiante?
 * Lo normal es que el bloque tenga `id_par` y se compare directo. Para bloques antiguos
 * sin paralelo, se compara el texto "MATERIA - 4A SW" (materia + nivel + letra del
 * paralelo) y el docente; si el nombre no sigue ese formato, basta con que empiece por
 * la materia y sea del mismo docente.
 */
function esDeMisParalelos(h, matriculas) {
  // Bloques enlazados a su paralelo (id_par): comparación directa con las matrículas.
  if (h.id_par) return matriculas.some((m) => m.id_par === h.id_par);
  const curso = normalizar(h.nombre_curso);
  const m = curso.match(/^(.*) - (\d+)([a-z]) [a-z]+$/);
  return matriculas.some(({ paralelo: p }) => {
    if (!p || p.docente?.id_usr !== h.id_doc) return false;
    const materia = normalizar(p.materia?.nom_mat);
    if (!m) return curso.startsWith(materia);
    return (
      m[1] === materia &&
      Number(m[2]) === NUMERO_NIVEL[normalizar(p.nivel?.nom_niv)] &&
      m[3] === normalizar(p.nom_par)
    );
  });
}

/**
 * Horario semanal de los cursos del estudiante: pestañas por día (con fecha real) y,
 * debajo, sus clases y tutorías de ese día en orden cronológico (primero las de la
 * mañana), hora por hora.
 */
/**
 * Ordena los eventos del día por hora (una fila por cada bloque de una hora). Si el PDF
 * repite la misma clase a la misma hora en varias aulas, se muestra una sola vez con ambas.
 */
function ordenarBloques(eventos) {
  const bloques = [];
  for (const e of eventos) {
    const igual = bloques.find(
      (x) =>
        x.tipo === e.tipo &&
        x.titulo === e.titulo &&
        x.docente === e.docente &&
        x.hora_ini === e.hora_ini &&
        x.hora_fin === e.hora_fin
    );
    if (igual) {
      if (!igual.espacios.includes(e.espacio)) igual.espacios.push(e.espacio);
    } else {
      bloques.push({ ...e, espacios: [e.espacio] });
    }
  }
  return bloques.sort((a, b) => horaEnMinutos(a.hora_ini) - horaEnMinutos(b.hora_ini));
}

export default function MisHorarios() {
  const semana = useMemo(() => semanaActual(), []);
  const [diaIndice, setDiaIndice] = useState(() => {
    const hoyIdx = semana.findIndex(esHoy);
    return hoyIdx >= 0 ? hoyIdx : 0;
  });

  const cargarMatriculas = useCallback(() => matriculasApi.listar(), []);
  const { data: matriculas, cargando: cargandoM, error: errorM } = useApiResource(cargarMatriculas, {
    mensajeError: 'No se pudieron cargar tus cursos.',
  });

  const cargarHorarios = useCallback(() => horariosApi.listar(), []);
  const { data: horarios, cargando: cargandoH, error: errorH } = useApiResource(cargarHorarios, {
    mensajeError: 'No se pudo cargar el horario de clases.',
  });

  const cargarTutorias = useCallback(() => tutoriasApi.listar(), []);
  const { data: tutorias, cargando: cargandoT, error: errorT } = useApiResource(cargarTutorias, {
    mensajeError: 'No se pudieron cargar las tutorías.',
  });

  const diaFecha = semana[diaIndice];
  const diaTxt = DIAS_MOSTRADOS[diaIndice];
  const fechaTxt = fechaISO(diaFecha);

  const bloques = useMemo(() => {
    const eventosClase = (horarios ?? [])
      .filter((h) => h.dia_semana === diaTxt && esDeMisParalelos(h, matriculas ?? []))
      .map((h) => ({
        tipo: 'CLASE',
        espacio: h.espacio?.nom_esp || `Aula #${h.id_esp}`,
        hora_ini: h.hora_ini,
        hora_fin: h.hora_fin,
        titulo: h.nombre_curso,
        docente: h.docente ? `${h.docente.nombres} ${h.docente.apellidos}` : '—',
      }));

    const eventosReserva = (tutorias ?? [])
      .filter((t) => mismaFecha(t.fecha, fechaTxt))
      .map((t) => ({
        tipo: 'RESERVA',
        espacio: t.aula,
        hora_ini: t.hora_ini,
        hora_fin: t.hora_fin,
        titulo: t.tema,
        docente: t.docente,
      }));

    return ordenarBloques([...eventosClase, ...eventosReserva]);
  }, [horarios, tutorias, matriculas, diaTxt, fechaTxt]);

  const cargando = cargandoM || cargandoH || cargandoT;
  const error = errorM || errorH || errorT;

  return (
    <Layout>
      <PageHeader titulo="Horarios" descripcion="Tu semana, día por día y en orden de hora: clases fijas y tutorías.">
        <Button as="a" href="/horario-fisei.pdf" target="_blank" rel="noreferrer" variant="secondary">
          Ver PDF oficial
        </Button>
      </PageHeader>

      <div className="mt-6 flex gap-1.5 max-w-md">
        {semana.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setDiaIndice(i)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-center transition-colors ${
              i === diaIndice
                ? 'bg-azul border-azul text-white'
                : 'bg-white border-line text-ink/70 hover:border-azul/40'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-80">{ABREV_DIA[DIAS_MOSTRADOS[i]]}</p>
            <p className="font-display text-sm leading-tight">{d.getDate()}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Clase (horario fijo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Reserva (tutoría)
        </span>
      </div>

      <div className="mt-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={bloques.length === 0}
          mensajeVacio={`No tienes clases ni tutorías el ${ETIQUETA_DIA[diaTxt]}.`}
        >
          <ol className="rounded-md border border-line bg-white divide-y divide-line overflow-hidden">
            {bloques.map((e, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="w-24 shrink-0 tabular-nums">
                  <p className="text-sm font-semibold text-ink">
                    {e.hora_ini} – {e.hora_fin}
                  </p>
                </div>
                <span
                  className={`w-1 self-stretch rounded-full shrink-0 ${
                    e.tipo === 'CLASE' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{e.titulo}</p>
                  <p className="text-xs text-ink/50">
                    {e.docente} · {e.espacios.join(' / ')}
                  </p>
                </div>
                <Badge
                  className={`shrink-0 ${
                    e.tipo === 'CLASE' ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'
                  }`}
                >
                  {e.tipo === 'CLASE' ? 'Clase' : 'Tutoría'}
                </Badge>
              </li>
            ))}
          </ol>
        </DataState>
      </div>
    </Layout>
  );
}
