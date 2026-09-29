import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { usePaginacion } from '../hooks/usePaginacion';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { reservasApi } from '../api/endpoints/reservas';
import { useToast } from '../context/ToastContext';
import { ETIQUETA_DIA, ETIQUETA_TIPO_ESPACIO, OPCIONES_BLOQUE, OPCIONES_TIPO_ESPACIO } from '../lib/constantes';
import { fechaISO, horaEnMinutos, mensajeDeError } from '../lib/formato';
import {
  Alert,
  Badge,
  Buscador,
  Card,
  ConfirmDialog,
  DataState,
  Input,
  PageHeader,
  Paginacion,
  Select,
  SkeletonCards,
  normalizarBusqueda,
} from '../components/ui';

// Jornada de la facultad: de 07:00 a 20:00, de lunes a viernes, con almuerzo de 13:00 a 14:00.
const INICIO_JORNADA = 7 * 60;
const FIN_JORNADA = 20 * 60;
const ALMUERZO = { ini: 13 * 60, fin: 14 * 60 };

const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Agenda completa del día para un espacio: las clases/reservas tal como vienen del backend,
 * más los huecos de la jornada marcados como LIBRE, partidos en bloques de una hora
 * (07:00-08:00, 08:00-09:00, ...) para que se lean igual que el horario de clases.
 * La hora de almuerzo nunca se ofrece como libre.
 */
function agendaDelDia(ocupaciones) {
  const ordenadas = ocupaciones
    .map((o) => ({ ...o, ini: horaEnMinutos(o.hora_ini), fin: horaEnMinutos(o.hora_fin) }))
    .sort((a, b) => a.ini - b.ini);

  const agenda = [];
  const agregarLibres = (desde, hasta) => {
    let ini = Math.max(desde, INICIO_JORNADA);
    const tope = Math.min(hasta, FIN_JORNADA);
    while (ini < tope) {
      if (ini >= ALMUERZO.ini && ini < ALMUERZO.fin) {
        ini = ALMUERZO.fin;
        continue;
      }
      const siguienteHora = Math.floor(ini / 60) * 60 + 60;
      const fin = Math.min(tope, siguienteHora, ini < ALMUERZO.ini ? ALMUERZO.ini : Infinity);
      agenda.push({ tipo: 'LIBRE', hora_ini: aHora(ini), hora_fin: aHora(fin), ini, fin });
      ini = fin;
    }
  };

  let cursor = INICIO_JORNADA;
  for (const o of ordenadas) {
    if (o.ini > cursor) agregarLibres(cursor, o.ini);
    agenda.push({ ...o, hora_ini: aHora(o.ini), hora_fin: aHora(o.fin) });
    cursor = Math.max(cursor, o.fin);
  }
  agregarLibres(cursor, FIN_JORNADA);
  return agenda;
}

const ESTILO_TIPO = {
  CLASE: { etiqueta: 'Clase', clase: 'text-celeste-dark font-medium' },
  RESERVA: { etiqueta: 'Reserva', clase: 'text-azul-dark font-medium' },
  LIBRE: { etiqueta: 'Libre', clase: 'text-success font-medium' },
};

// "10", "10:00" -> minutos; 1-6 se leen como de la tarde ("3" -> 15:00). Otro texto -> null.
function busquedaComoHora(q) {
  const m = q.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (h >= 1 && h < 7) h += 12;
  const min = Number(m[2] || 0);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

function esFinDeSemana(iso) {
  const dia = new Date(`${iso}T12:00:00`).getDay();
  return dia === 0 || dia === 6;
}

// Bloque de la agenda vigente en este instante (si `fecha` es hoy), o el primero
// del día si no hay uno "actual" (fecha futura, o ya se acabó la jornada). Es lo
// único que se ve con la tarjeta contraída.
function bloqueDestacado(agenda, fecha) {
  if (!agenda.length) return null;
  if (fecha === fechaISO(new Date())) {
    const ahora = new Date();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const actual = agenda.find((o) => o.ini <= minAhora && minAhora < o.fin);
    if (actual) return actual;
  }
  return agenda[0];
}

// Hoy; si cae en fin de semana, el lunes siguiente (sábado y domingo no hay clases).
function fechaInicial() {
  const d = new Date();
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FILTROS_INICIALES = { busqueda: '', tipo: '', bloque: '', estado: '' };

export default function Ocupacion() {
  const { usuario } = useAuth();
  const puedeCancelar = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'LABORATORISTA';
  const [fecha, setFecha] = useState(fechaInicial);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [aCancelar, setACancelar] = useState(null); // null | id_rev
  const [cancelando, setCancelando] = useState(false);
  const { mostrarToast } = useToast();

  const finDeSemana = esFinDeSemana(fecha);
  const cargar = useCallback(
    () => (esFinDeSemana(fecha) ? Promise.resolve(null) : disponibilidadApi.consultar({ fecha })),
    [fecha]
  );
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar la ocupación.',
  });

  async function confirmarCancelacion(razon) {
    if (!aCancelar) return;
    setCancelando(true);
    try {
      await reservasApi.cancelar(aCancelar, razon);
      await recargar();
      mostrarToast('Reserva cancelada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cancelar la reserva.'), 'error');
    } finally {
      setCancelando(false);
      setACancelar(null);
    }
  }

  const espacios = useMemo(() => data?.espacios ?? [], [data]);
  const hayFiltros = Object.values(filtros).some(Boolean);
  const cambiarFiltro = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  // El filtro de estado decide qué AULAS se muestran (libre/ocupada en el bloque
  // destacado, es decir, ahora mismo o el primer bloque del día); el buscador filtra
  // qué FILAS de cada tarjeta se ven. Las tarjetas sin filas visibles se ocultan.
  const tarjetas = useMemo(() => {
    const q = normalizarBusqueda(filtros.busqueda);
    const minuto = busquedaComoHora(q);

    return espacios
      .filter((esp) => !filtros.tipo || esp.tipo === filtros.tipo)
      .filter((esp) => !filtros.bloque || esp.bloque === filtros.bloque)
      .map((esp) => {
        const agenda = agendaDelDia(esp.ocupaciones);
        const horasLibres = agenda.filter((o) => o.tipo === 'LIBRE').reduce((t, o) => t + (o.fin - o.ini), 0) / 60;
        const nombreCoincide = Boolean(q) && minuto === null && normalizarBusqueda(esp.nom_esp).includes(q);

        const filas = agenda.filter((o) => {
          if (!q || nombreCoincide) return true;
          if (minuto !== null) return o.ini <= minuto && minuto < o.fin;
          return normalizarBusqueda(o.etiqueta || '').includes(q);
        });
        const destacado = bloqueDestacado(agenda, fecha);
        return { esp, filas, horasLibres, destacado };
      })
      .filter((t) => t.filas.length > 0)
      .filter((t) => {
        if (filtros.estado === 'LIBRE') return t.destacado?.tipo === 'LIBRE';
        if (filtros.estado === 'OCUPADO') return t.destacado && t.destacado.tipo !== 'LIBRE';
        return true;
      })
      .sort((a, b) => a.esp.nom_esp.localeCompare(b.esp.nom_esp, 'es', { numeric: true }));
  }, [espacios, filtros, fecha]);
  const paginacion = usePaginacion(tarjetas, 9);

  return (
    <Layout>
      <PageHeader
        titulo="Ocupación de aulas"
        descripcion="Qué aulas están en clase, reservadas o libres en la fecha elegida (lunes a viernes, 07:00 a 20:00)."
      />

      <div className="mt-6 flex items-end gap-3">
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-44"
        />
        {data && !finDeSemana && (
          <p className="text-sm text-ink/50 pb-2">{ETIQUETA_DIA[data.dia_semana] || data.dia_semana}</p>
        )}
      </div>

      {finDeSemana ? (
        <div className="mt-6">
          <Alert variant="info">
            Sábado y domingo no hay clases. Elige un día de lunes a viernes para ver la ocupación.
          </Alert>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-3">
            <Buscador
              className="col-span-2 lg:col-span-1"
              value={filtros.busqueda}
              onChange={(busqueda) => setFiltros((f) => ({ ...f, busqueda }))}
              placeholder="Buscar aula, curso, docente u hora (ej. 10)…"
            />
            <Select value={filtros.tipo} onChange={cambiarFiltro('tipo')}>
              <option value="">Aulas y laboratorios</option>
              {OPCIONES_TIPO_ESPACIO.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Select>
            <Select value={filtros.bloque} onChange={cambiarFiltro('bloque')}>
              <option value="">Todos los bloques</option>
              {OPCIONES_BLOQUE.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Select>
            <Select value={filtros.estado} onChange={cambiarFiltro('estado')}>
              <option value="">Todos los espacios</option>
              <option value="LIBRE">Disponibles ahora</option>
              <option value="OCUPADO">Ocupadas ahora</option>
            </Select>
          </div>

          {hayFiltros && !cargando && (
            <div className="mt-2 flex items-center gap-3 text-sm text-ink/50">
              <span>
                {tarjetas.length} de {espacios.length} espacio(s)
              </span>
              <button onClick={() => setFiltros(FILTROS_INICIALES)} className="text-azul font-medium hover:underline">
                Limpiar filtros
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <DataState
              cargando={cargando}
              error={error}
              vacio={tarjetas.length === 0}
              skeleton={<SkeletonCards count={6} />}
              mensajeVacio={
                espacios.length === 0 ? 'No hay aulas registradas.' : 'Ningún espacio coincide con los filtros.'
              }
            >
              {paginacion.visibles.map(({ esp, filas, horasLibres, destacado }) => (
                <Card key={esp.id_esp}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                        {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                      </span>
                      <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
                    </div>
                    {filtros.estado ? (
                      <Badge className={horasLibres === 0 ? 'bg-danger/10 text-danger' : 'bg-celeste/10 text-celeste-dark'}>
                        {horasLibres === 0 ? 'Sin horas libres' : `${horasLibres} h libre(s)`}
                      </Badge>
                    ) : (
                      <Badge className={destacado?.tipo === 'LIBRE' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}>
                        {destacado?.tipo === 'LIBRE' ? 'Disponible' : 'Ocupado'}
                      </Badge>
                    )}
                  </div>

                  <details className="mt-3 pt-3 border-t border-line group">
                    <summary className="flex items-center justify-between gap-2 cursor-pointer select-none list-none">
                      {destacado ? (
                        <FilaOcupacion
                          o={destacado}
                          puedeCancelar={puedeCancelar}
                          onCancelar={() => setACancelar(destacado.id_rev)}
                        />
                      ) : (
                        <span className="text-sm text-ink/50">Sin datos para hoy.</span>
                      )}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5 text-ink/40 shrink-0 transition-transform group-open:rotate-180"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {filas
                        .filter((o) => o !== destacado)
                        .map((o, i) => (
                          <li key={`${esp.id_esp}-${i}`}>
                            <FilaOcupacion
                              o={o}
                              puedeCancelar={puedeCancelar}
                              onCancelar={() => setACancelar(o.id_rev)}
                            />
                          </li>
                        ))}
                    </ul>
                  </details>
                </Card>
              ))}
            </DataState>
          </div>
          {!cargando && !error && <Paginacion {...paginacion} className="mt-4" />}
        </>
      )}

      <ConfirmDialog
        abierto={Boolean(aCancelar)}
        titulo="Cancelar reserva"
        mensaje="¿Cancelar esta reserva? El aula quedará libre en esa franja."
        textoConfirmar="Cancelar reserva"
        textoCargando="Cancelando…"
        pedirRazon
        labelRazon="Motivo de la cancelación"
        placeholderRazon="Ej: mantenimiento urgente del aula"
        cargando={cancelando}
        onConfirmar={confirmarCancelacion}
        onCancelar={() => setACancelar(null)}
      />
    </Layout>
  );
}

function FilaOcupacion({ o, puedeCancelar, onCancelar }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 text-sm w-full min-w-0 ${
        o.tipo === 'LIBRE' ? 'rounded bg-success/5 -mx-1.5 px-1.5 py-0.5' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="text-ink/70 tabular-nums">
          {o.hora_ini}–{o.hora_fin}
        </span>{' '}
        <span className={ESTILO_TIPO[o.tipo].clase}>{ESTILO_TIPO[o.tipo].etiqueta}</span>
        {o.etiqueta && <span className="text-ink/50"> · {o.etiqueta}</span>}
      </span>
      {o.tipo === 'RESERVA' && puedeCancelar && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancelar();
          }}
          title="Cancelar reserva"
          aria-label="Cancelar reserva"
          className="shrink-0 text-ink/30 hover:text-danger transition-colors"
        >
          <IconoCancelar />
        </button>
      )}
    </div>
  );
}

function IconoCancelar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}
