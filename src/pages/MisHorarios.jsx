import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { horariosApi } from '../api/endpoints/horarios';
import { matriculasApi } from '../api/endpoints/matriculas';
import { tutoriasApi } from '../api/endpoints/tutorias';
import { DIAS_SEMANA, ETIQUETA_DIA } from '../lib/constantes';
import { esHoy, fechaISO, mismaFecha, semanaActual } from '../lib/formato';
import { Badge, Button, DataState, PageHeader } from '../components/ui';

const DIAS_MOSTRADOS = DIAS_SEMANA.slice(0, 5); // Lunes a Viernes, como en el horario de clases
const ABREV_DIA = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie' };

/**
 * Horario semanal de los cursos del estudiante: pestañas por día (con fecha real) y,
 * debajo, las aulas con actividad ese día -- cada una desplegable con sus bloques,
 * distinguiendo el horario fijo de clase (se repite cada semana) de las tutorías
 * puntuales que reserva el docente.
 */
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

  const idsDocentes = useMemo(
    () => new Set((matriculas ?? []).map((m) => m.paralelo?.docente?.id_usr).filter(Boolean)),
    [matriculas]
  );

  const diaFecha = semana[diaIndice];
  const diaTxt = DIAS_MOSTRADOS[diaIndice];
  const fechaTxt = fechaISO(diaFecha);

  const grupos = useMemo(() => {
    const eventosClase = (horarios ?? [])
      .filter((h) => idsDocentes.has(h.id_doc) && h.dia_semana === diaTxt)
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

    const mapa = new Map();
    [...eventosClase, ...eventosReserva].forEach((e) => {
      if (!mapa.has(e.espacio)) mapa.set(e.espacio, []);
      mapa.get(e.espacio).push(e);
    });

    return [...mapa.entries()]
      .map(([espacio, items]) => ({ espacio, items: items.sort((a, b) => a.hora_ini.localeCompare(b.hora_ini)) }))
      .sort((a, b) => a.espacio.localeCompare(b.espacio));
  }, [horarios, tutorias, idsDocentes, diaTxt, fechaTxt]);

  const cargando = cargandoM || cargandoH || cargandoT;
  const error = errorM || errorH || errorT;

  return (
    <Layout>
      <PageHeader titulo="Horarios" descripcion="Tu semana, organizada por aula: clase fija o tutoría puntual.">
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

      <div className="mt-4 space-y-2">
        <DataState
          cargando={cargando}
          error={error}
          vacio={grupos.length === 0}
          mensajeVacio={`No tienes clases ni tutorías el ${ETIQUETA_DIA[diaTxt]}.`}
        >
          {grupos.map((g) => (
            <details key={g.espacio} className="rounded-md border border-line bg-white overflow-hidden group">
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none list-none">
                <span className="font-display text-sm text-ink">{g.espacio}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink/50">{g.items.length} bloque(s)</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-ink/40 transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-line divide-y divide-line">
                {g.items.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5">
                    <div className="w-14 shrink-0 text-xs text-ink/70">
                      <p className="font-medium text-ink">{e.hora_ini}</p>
                      <p>{e.hora_fin}</p>
                    </div>
                    <Badge className={`shrink-0 ${e.tipo === 'CLASE' ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                      {e.tipo === 'CLASE' ? 'Clase' : 'Reserva'}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{e.titulo}</p>
                      <p className="text-xs text-ink/50 truncate">{e.docente}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </DataState>
      </div>
    </Layout>
  );
}
