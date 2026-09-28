import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { espaciosApi } from '../api/endpoints/espacios';
import { solicitudesApi } from '../api/endpoints/solicitudes';
import { horariosApi } from '../api/endpoints/horarios';
import { paralelosApi } from '../api/endpoints/paralelos';
import { ETIQUETA_BLOQUE, ETIQUETA_TIPO_ESPACIO, OPCIONES_BLOQUE, OPCIONES_TIPO_ESPACIO } from '../lib/constantes';
import { claveDia, fechaISO, formatearFecha, formatearRango, horaEnMinutos } from '../lib/formato';
import { Badge, Button, Buscador, Card, DataState, Input, PageHeader, Select, Table, normalizarBusqueda } from '../components/ui';
import { BarrasHorizontales, Cifra, Columnas, Dona, Panel } from '../components/reportes/Graficos';

// ---------------- Jornada de la facultad ----------------
const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const DIA_CORTO = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie' };
const DIA_LARGO = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes' };
// 07:00 a 20:00 sin el almuerzo (13:00-14:00): 12 horas por día.
const HORAS = [7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
const HORAS_SEMANA = HORAS.length * DIAS.length; // 60 horas disponibles por espacio
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const pct = (x) => `${Math.round(x * 100)}%`;

// Cada bloque de HorarioClase -> las horas enteras que ocupa ("LUNES|10").
function horasDelBloque(h) {
  const ini = Math.floor(horaEnMinutos(h.hora_ini) / 60);
  const fin = Math.ceil(horaEnMinutos(h.hora_fin) / 60);
  const out = [];
  for (let x = ini; x < fin; x++) out.push(`${h.dia_semana}|${x}`);
  return out;
}

// ---------------- Rangos rápidos de fecha (reservas) ----------------
const hoyISO = () => fechaISO(new Date());
const inicioDeMes = () => {
  const d = new Date();
  return fechaISO(new Date(d.getFullYear(), d.getMonth(), 1));
};
const hace = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return fechaISO(d);
};

const COLUMNAS_DETALLE = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'curso', titulo: 'Curso / Materia' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'asistencias', titulo: 'Asistencias', className: 'text-right' },
];

function contarPor(items, claveFn) {
  const mapa = new Map();
  items.forEach((it) => {
    const k = claveFn(it);
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return [...mapa.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total);
}

function IconoDescarga() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function Reportes() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'DOCENTE';
  const pestanas = [
    { id: 'ocupacion', titulo: 'Ocupación de espacios' },
    ...(esDocente ? [] : [{ id: 'academico', titulo: 'Carga académica' }]),
    { id: 'reservas', titulo: esDocente ? 'Mis reservas' : 'Reservas y tutorías' },
    { id: 'detalle', titulo: 'Detalle de reservas' },
  ];
  const [pestana, setPestana] = useState('ocupacion');

  const cargar = useCallback(async () => {
    const [reservas, espacios, solicitudes, horarios, paralelos] = await Promise.all([
      reservasApi.listar({ mias: esDocente }),
      espaciosApi.listar(),
      solicitudesApi.listar().catch(() => []), // no todos los roles pueden ver solicitudes
      horariosApi.listar(),
      esDocente ? Promise.resolve([]) : paralelosApi.listar({ conHorarios: 1 }),
    ]);
    return { reservas, espacios, solicitudes, horarios, paralelos };
  }, [esDocente]);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo generar el reporte.',
  });

  const reservasTodas = useMemo(() => data?.reservas ?? [], [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reportes y estadísticas"
        descripcion={
          esDocente
            ? 'Ocupación de aulas y laboratorios, y el resumen de tus reservas y tutorías.'
            : 'Ocupación real de aulas y laboratorios según el horario de clases, carga académica y uso de reservas.'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => exportarCSV(reservasTodas)} disabled={reservasTodas.length === 0}>
            <span className="flex items-center gap-1.5">
              <IconoDescarga />
              <span>Exportar reservas (CSV)</span>
            </span>
          </Button>
          <Button variant="secondary" onClick={recargar}>
            Actualizar
          </Button>
        </div>
      </PageHeader>

      <div role="tablist" className="flex flex-wrap border-b border-line gap-x-5 text-sm font-medium">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            type="button"
            onClick={() => setPestana(p.id)}
            className={`pb-2.5 -mb-px transition-colors border-b-2 ${
              pestana === p.id ? 'border-azul text-azul font-semibold' : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      <DataState cargando={cargando} error={error} vacio={false}>
        {data && pestana === 'ocupacion' && <TabOcupacion horarios={data.horarios} espacios={data.espacios} />}
        {data && pestana === 'academico' && <TabAcademico horarios={data.horarios} paralelos={data.paralelos} />}
        {data && pestana === 'reservas' && (
          <TabReservas reservas={reservasTodas} solicitudes={data.solicitudes} esDocente={esDocente} />
        )}
        {data && pestana === 'detalle' && <TabDetalle reservas={reservasTodas} />}
      </DataState>
    </div>
  );
}

// =====================================================================
// 1. OCUPACIÓN DE ESPACIOS (horario de clases: se repite cada semana)
// =====================================================================
function TabOcupacion({ horarios, espacios }) {
  const [filtros, setFiltros] = useState({ tipo: '', bloque: '' });
  const [dia, setDia] = useState(() => DIAS[new Date().getDay() - 1] ?? 'LUNES'); // hoy, o lunes en fin de semana
  const [hora, setHora] = useState(null); // hora elegida para ver qué aulas están libres
  const [idEspacio, setIdEspacio] = useState(null); // espacio elegido para ver su semana

  const espaciosFiltrados = useMemo(
    () =>
      espacios.filter(
        (e) => (!filtros.tipo || e.tipo === filtros.tipo) && (!filtros.bloque || e.bloque === filtros.bloque)
      ),
    [espacios, filtros]
  );
  const idsFiltrados = useMemo(() => new Set(espaciosFiltrados.map((e) => e.id_esp)), [espaciosFiltrados]);

  // "LUNES|10" -> Map(id_esp -> curso) con lo que hay en cada espacio a esa hora.
  const ocupacion = useMemo(() => {
    const mapa = new Map();
    horarios.forEach((h) => {
      if (!idsFiltrados.has(h.id_esp)) return;
      horasDelBloque(h).forEach((k) => {
        if (!mapa.has(k)) mapa.set(k, new Map());
        if (!mapa.get(k).has(h.id_esp)) mapa.get(k).set(h.id_esp, h.nombre_curso);
      });
    });
    return mapa;
  }, [horarios, idsFiltrados]);

  const total = espaciosFiltrados.length;
  const enUsoA = (d, h) => ocupacion.get(`${d}|${h}`) ?? new Map();
  const ordenarEspacios = (a, b) => a.nom_esp.localeCompare(b.nom_esp, 'es', { numeric: true });

  // Horas de clase por semana de cada espacio.
  const horasPorEspacio = new Map(espaciosFiltrados.map((e) => [e.id_esp, 0]));
  DIAS.forEach((d) =>
    HORAS.forEach((h) => enUsoA(d, h).forEach((_, id) => horasPorEspacio.set(id, horasPorEspacio.get(id) + 1)))
  );
  const ranking = espaciosFiltrados
    .map((e) => ({ e, horas: horasPorEspacio.get(e.id_esp) || 0 }))
    .sort((a, b) => b.horas - a.horas || ordenarEspacios(a.e, b.e));

  // Cifras de la semana
  const horasUsadas = ranking.reduce((t, r) => t + r.horas, 0);
  let masLlena = null;
  let masLibre = null;
  DIAS.forEach((d) =>
    HORAS.forEach((h) => {
      const n = enUsoA(d, h).size;
      if (!masLlena || n > masLlena.n) masLlena = { n, texto: `${DIA_LARGO[d]} ${hh(h)}` };
      if (!masLibre || n < masLibre.n) masLibre = { n, texto: `${DIA_LARGO[d]} ${hh(h)}` };
    })
  );

  // Aulas libres a cada hora del día elegido.
  const filasDelDia = HORAS.map((h) => {
    const libres = total - enUsoA(dia, h).size;
    return {
      id: h,
      etiqueta: `${hh(h)} – ${hh(h + 1)}`,
      valor: libres,
      texto: `${libres} libre${libres === 1 ? '' : 's'}`,
      detalle: `${total - libres} en clase · pulsa para ver cuáles están libres`,
    };
  });
  const libresEnHora =
    hora != null && espaciosFiltrados.filter((e) => !enUsoA(dia, hora).has(e.id_esp)).sort(ordenarEspacios);

  // Semana del espacio elegido: por día, tramos seguidos de clase o libres.
  const espacioElegido = espaciosFiltrados.find((e) => e.id_esp === idEspacio) || null;
  const semanaEspacio =
    espacioElegido &&
    DIAS.map((d) => {
      const tramos = [];
      HORAS.forEach((h) => {
        const curso = enUsoA(d, h).get(espacioElegido.id_esp) || null;
        const previo = tramos.at(-1);
        if (previo && previo.curso === curso && previo.fin === h) previo.fin = h + 1;
        else tramos.push({ ini: h, fin: h + 1, curso });
      });
      return { d, tramos };
    });

  const cambiarFiltro = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setIdEspacio(null);
    setHora(null);
  };

  return (
    <div className="space-y-6">
      {/* Filtros: una fila, afectan a todo lo de abajo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select value={filtros.tipo} onChange={cambiarFiltro('tipo')}>
            <option value="">Aulas y laboratorios</option>
            {OPCIONES_TIPO_ESPACIO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={filtros.bloque} onChange={cambiarFiltro('bloque')}>
            <option value="">Todos los bloques</option>
            {OPCIONES_BLOQUE.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-ink/50">
          {total} espacio(s) · horario de clases de lunes a viernes, 07:00–20:00 (sin almuerzo)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Cifra
          etiqueta="Uso de las aulas"
          valor={pct(total ? horasUsadas / (total * HORAS_SEMANA) : 0)}
          detalle="de las horas de la semana tienen clase"
          tono={total && horasUsadas / (total * HORAS_SEMANA) > 0.75 ? 'alerta' : 'bueno'}
        />
        <Cifra
          etiqueta="Hora más llena"
          valor={masLlena?.n ? masLlena.texto : '—'}
          detalle={masLlena?.n ? `solo ${total - masLlena.n} de ${total} libres` : undefined}
          tono={masLlena?.n === total ? 'critico' : undefined}
        />
        <Cifra
          etiqueta="Mejor hora para reservar"
          valor={masLibre ? masLibre.texto : '—'}
          detalle={masLibre ? `${total - masLibre.n} de ${total} libres` : undefined}
          tono="bueno"
        />
        <Cifra
          etiqueta="Espacio más usado"
          valor={ranking[0]?.horas ? ranking[0].e.nom_esp : '—'}
          detalle={ranking[0]?.horas ? `${ranking[0].horas} de ${HORAS_SEMANA} horas con clase` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        {espacioElegido ? (
          <Panel
            titulo={`Horario de ${espacioElegido.nom_esp}`}
            descripcion="Sus clases de la semana y las horas en que está libre."
            acciones={
              <button type="button" onClick={() => setIdEspacio(null)} className="text-sm text-azul font-medium hover:underline">
                ← Volver a aulas libres por hora
              </button>
            }
          >
            <div className="space-y-4">
              {semanaEspacio.map(({ d, tramos }) => (
                <div key={d}>
                  <p className="text-sm font-semibold text-ink">{DIA_LARGO[d]}</p>
                  <ul className="mt-1 space-y-1">
                    {tramos.map((t) => (
                      <li key={t.ini} className="flex gap-3 text-sm">
                        <span className="w-28 shrink-0 tabular-nums text-ink/70">
                          {hh(t.ini)} – {hh(t.fin)}
                        </span>
                        {t.curso ? (
                          <span className="text-ink">{t.curso}</span>
                        ) : (
                          <span className="text-success font-medium">Libre</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel
            titulo="Aulas libres por hora"
            descripcion="Cuántos espacios no tienen clase en cada hora del día elegido. Pulsa una hora para ver cuáles son."
          >
            <div className="flex gap-1.5 mb-4">
              {DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDia(d);
                    setHora(null);
                  }}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                    d === dia ? 'bg-azul border-azul text-white font-medium' : 'bg-white border-line text-ink/70 hover:border-azul/40'
                  }`}
                >
                  {DIA_CORTO[d]}
                </button>
              ))}
            </div>

            <BarrasHorizontales
              filas={filasDelDia}
              maximo={total}
              limite={HORAS.length}
              seleccionado={hora}
              onSeleccionar={setHora}
              vacio="No hay espacios con esos filtros."
            />

            {libresEnHora && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-sm font-semibold text-ink">
                  Libres el {DIA_LARGO[dia].toLowerCase()} de {hh(hora)} a {hh(hora + 1)} ({libresEnHora.length})
                </p>
                {libresEnHora.length === 0 ? (
                  <p className="text-sm text-ink/50 mt-1">Todos los espacios tienen clase a esa hora.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {libresEnHora.map((e) => (
                      <li key={e.id_esp} className="rounded-md border border-line bg-paper/50 px-2.5 py-1 text-sm text-ink">
                        {e.nom_esp} <span className="text-ink/50">· {e.capacidad} personas</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
        )}

        <Panel titulo="Horas de clase por espacio" descripcion="De 60 horas por semana. Pulsa un espacio para ver su horario.">
          <BarrasHorizontales
            filas={ranking.map(({ e, horas }) => ({
              id: e.id_esp,
              etiqueta: e.nom_esp,
              valor: horas,
              texto: `${horas} h`,
              detalle: `${ETIQUETA_TIPO_ESPACIO[e.tipo] || e.tipo} · ${ETIQUETA_BLOQUE[e.bloque] || ''} · ${HORAS_SEMANA - horas} h libres`,
            }))}
            maximo={HORAS_SEMANA}
            limite={12}
            seleccionado={idEspacio}
            onSeleccionar={(id) => {
              setIdEspacio(id);
              setHora(null);
            }}
            vacio="No hay espacios con esos filtros."
            color="#1baf7a"
            colorActivo="#0d7a52"
          />
        </Panel>
      </div>
    </div>
  );
}

// =====================================================================
// 2. CARGA ACADÉMICA (paralelos, docentes, carreras, matrículas)
// =====================================================================
function TabAcademico({ horarios, paralelos }) {
  const [carrera, setCarrera] = useState('');

  // Una hora por (paralelo, día, hora): no contar dos veces una clase repetida en dos aulas.
  const horasPorParalelo = useMemo(() => {
    const vistas = new Map();
    horarios.forEach((h) => {
      if (!h.id_par) return;
      if (!vistas.has(h.id_par)) vistas.set(h.id_par, new Set());
      horasDelBloque(h).forEach((k) => vistas.get(h.id_par).add(k));
    });
    return new Map([...vistas].map(([id, s]) => [id, s.size]));
  }, [horarios]);

  const carreras = [...new Set(paralelos.map((p) => p.nivel?.carrera?.nom_car).filter(Boolean))].sort();
  const lista = paralelos.filter((p) => !carrera || p.nivel?.carrera?.nom_car === carrera);

  const sumarPor = (claveFn, valorFn) => {
    const m = new Map();
    lista.forEach((p) => {
      const k = claveFn(p);
      if (!m.has(k)) m.set(k, { valor: 0, paralelos: 0 });
      const x = m.get(k);
      x.valor += valorFn(p);
      x.paralelos += 1;
    });
    return [...m.entries()].map(([clave, x]) => ({ clave, ...x })).sort((a, b) => b.valor - a.valor);
  };

  const porCarrera = sumarPor((p) => p.nivel?.carrera?.nom_car || 'Sin carrera', (p) => horasPorParalelo.get(p.id_par) || 0);
  const porDocente = sumarPor(
    (p) => (p.docente ? `${p.docente.nombres} ${p.docente.apellidos}` : 'Sin docente'),
    (p) => horasPorParalelo.get(p.id_par) || 0
  );
  const matriculasPorCarrera = sumarPor((p) => p.nivel?.carrera?.nom_car || 'Sin carrera', (p) => p._count?.matriculas ?? 0);
  const porNivel = sumarPor((p) => p.nivel?.nom_niv || 'Sin nivel', (p) => p._count?.matriculas ?? 0);

  const totalHoras = lista.reduce((t, p) => t + (horasPorParalelo.get(p.id_par) || 0), 0);
  const docentes = new Set(lista.map((p) => p.docente?.id_usr)).size;
  const matriculas = lista.reduce((t, p) => t + (p._count?.matriculas ?? 0), 0);
  const sinEstudiantes = lista.filter((p) => !(p._count?.matriculas > 0)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Select value={carrera} onChange={(e) => setCarrera(e.target.value)}>
            <option value="">Todas las carreras</option>
            {carreras.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Cifra etiqueta="Paralelos" valor={lista.length} detalle={`${totalHoras} h de clase por semana`} />
        <Cifra etiqueta="Docentes con carga" valor={docentes} detalle={docentes ? `${(totalHoras / docentes).toFixed(1)} h/semana en promedio` : undefined} />
        <Cifra etiqueta="Matrículas" valor={matriculas} detalle="Inscripciones en paralelos" tono={matriculas > 0 ? 'bueno' : undefined} />
        <Cifra
          etiqueta="Paralelos sin estudiantes"
          valor={sinEstudiantes}
          detalle={lista.length ? `${pct(sinEstudiantes / lista.length)} del total` : undefined}
          tono={sinEstudiantes === 0 ? 'bueno' : sinEstudiantes / (lista.length || 1) > 0.5 ? 'critico' : 'alerta'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel titulo="Carga horaria por docente" descripcion="Horas de clase por semana según el horario.">
          <BarrasHorizontales
            filas={porDocente.map((x) => ({ id: x.clave, etiqueta: x.clave, valor: x.valor, texto: `${x.valor} h`, detalle: `${x.paralelos} paralelo(s)` }))}
            limite={10}
            vacio="No hay docentes con horario."
          />
        </Panel>
        <Panel titulo="Horas de clase por carrera" descripcion="Suma semanal de horas de todos sus paralelos.">
          <BarrasHorizontales
            filas={porCarrera.map((x) => ({ id: x.clave, etiqueta: x.clave, valor: x.valor, texto: `${x.valor} h`, detalle: `${x.paralelos} paralelo(s)` }))}
            vacio="Sin datos."
          />
        </Panel>
        <Panel titulo="Matrículas por carrera" descripcion="Estudiantes inscritos en los paralelos de cada carrera.">
          <Dona segmentos={matriculasPorCarrera.map((x) => ({ clave: x.clave, valor: x.valor }))} etiquetaTotal="Matrículas" />
          {matriculas === 0 && <p className="text-sm text-ink/50 mt-2">Aún no hay estudiantes matriculados.</p>}
        </Panel>
        <Panel titulo="Matrículas por nivel" descripcion="Útil para ver en qué semestres se concentran los estudiantes.">
          <Dona segmentos={porNivel.map((x) => ({ clave: x.clave, valor: x.valor }))} etiquetaTotal="Matrículas" />
        </Panel>
      </div>
    </div>
  );
}

// =====================================================================
// 3. RESERVAS Y TUTORÍAS (rango de fechas)
// =====================================================================
function TabReservas({ reservas: todas, solicitudes: todasSolicitudes, esDocente }) {
  const [desde, setDesde] = useState(hace(30));
  const [hasta, setHasta] = useState(hoyISO());

  const enRango = useCallback(
    (fecha) => {
      const dia = claveDia(fecha);
      return (!desde || dia >= desde) && (!hasta || dia <= hasta);
    },
    [desde, hasta]
  );
  const reservas = useMemo(() => todas.filter((r) => enRango(r.fecha)), [todas, enRango]);
  const solicitudes = useMemo(() => (todasSolicitudes ?? []).filter((s) => enRango(s.fecha)), [todasSolicitudes, enRango]);

  const activas = reservas.filter((r) => r.estado !== 'CANCELADA');
  const canceladas = reservas.filter((r) => r.estado === 'CANCELADA');
  const asistencias = activas.reduce((t, r) => t + (r._count?.asistencias ?? 0), 0);
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;

  // Reservas por día del rango (días sin reservas cuentan como 0).
  const porDia = useMemo(() => {
    const cuenta = new Map();
    activas.forEach((r) => cuenta.set(claveDia(r.fecha), (cuenta.get(claveDia(r.fecha)) || 0) + 1));
    const ini = desde || [...cuenta.keys()].sort()[0];
    const fin = hasta || [...cuenta.keys()].sort().at(-1);
    if (!ini || !fin) return [];
    const puntos = [];
    const d = new Date(`${ini}T12:00:00`);
    const tope = new Date(`${fin}T12:00:00`);
    for (let n = 0; d <= tope && n < 400; n++) {
      const k = fechaISO(d);
      puntos.push({ etiqueta: formatearFecha(k), corto: `${d.getDate()}/${d.getMonth() + 1}`, valor: cuenta.get(k) || 0 });
      d.setDate(d.getDate() + 1);
    }
    return puntos;
  }, [activas, desde, hasta]);

  const porEspacio = contarPor(activas, (r) => r.espacio?.nom_esp || 'Sin espacio');
  const porDocente = contarPor(activas, (r) => (r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : 'Sin docente'));
  const porMateria = contarPor(activas.filter((r) => r.paralelo), (r) => r.paralelo.materia?.nom_mat);

  const rangos = [
    ['Últimos 7 días', hace(7), hoyISO()],
    ['Últimos 30 días', hace(30), hoyISO()],
    ['Últimos 90 días', hace(90), hoyISO()],
    ['Este mes', inicioDeMes(), hoyISO()],
    ['Todo', '', ''],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="w-40">
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {rangos.map(([t, d, h]) => {
            const activo = desde === d && hasta === h;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setDesde(d);
                  setHasta(h);
                }}
                className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors ${
                  activo ? 'bg-azul border-azul text-white' : 'border-line text-ink hover:bg-paper'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Cifra etiqueta={esDocente ? 'Mis reservas' : 'Reservas'} valor={activas.length} detalle="No canceladas" tono="bueno" />
        <Cifra
          etiqueta="Canceladas"
          valor={canceladas.length}
          detalle={reservas.length ? `${pct(canceladas.length / reservas.length)} del total` : undefined}
          tono={canceladas.length === 0 ? undefined : reservas.length && canceladas.length / reservas.length > 0.3 ? 'critico' : 'alerta'}
        />
        <Cifra
          etiqueta="Asistencia promedio"
          valor={activas.length ? (asistencias / activas.length).toFixed(1) : '—'}
          detalle={`${asistencias} asistencia(s) registradas`}
        />
        <Cifra etiqueta="Solicitudes pendientes" valor={pendientes} detalle="En el rango elegido" tono={pendientes > 0 ? 'alerta' : 'bueno'} />
      </div>

      {reservas.length === 0 ? (
        <Card padding="p-8">
          <p className="font-display text-base text-ink text-center">No hay reservas en este rango de fechas</p>
          <p className="text-sm text-ink/50 text-center mt-1">
            Cuando los docentes reserven aulas o laboratorios para tutorías, aquí verás cuántas hay por día, por espacio
            y por materia. Prueba con “Todo” para ver todo el historial.
          </p>
        </Card>
      ) : (
        <>
          <Panel titulo="Reservas por día" descripcion="Reservas no canceladas en cada día del rango.">
            <Columnas puntos={porDia} vacio="Sin reservas en el rango." />
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel titulo="Espacios más reservados">
              <BarrasHorizontales
                filas={porEspacio.map((x) => ({ id: x.clave, etiqueta: x.clave, valor: x.total }))}
                limite={8}
                color="#1baf7a"
                colorActivo="#0d7a52"
              />
            </Panel>
            {esDocente ? (
              <Panel titulo="Reservas por materia">
                <BarrasHorizontales
                  filas={porMateria.map((x) => ({ id: x.clave, etiqueta: x.clave, valor: x.total }))}
                  limite={8}
                  vacio="Ninguna reserva está ligada a una materia."
                  color="#eda100"
                  colorActivo="#a87200"
                />
              </Panel>
            ) : (
              <Panel titulo="Docentes que más reservan">
                <BarrasHorizontales
                  filas={porDocente.map((x) => ({ id: x.clave, etiqueta: x.clave, valor: x.total }))}
                  limite={8}
                  color="#4a3aa7"
                  colorActivo="#33297a"
                />
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// 4. DETALLE DE RESERVAS (tabla auditable)
// =====================================================================
function TabDetalle({ reservas }) {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');

  const filtradas = useMemo(() => {
    const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean);
    return reservas
      .filter((r) => !estado || r.estado === estado)
      .filter((r) => {
        if (!palabras.length) return true;
        const texto = normalizarBusqueda(
          [r.espacio?.nom_esp, r.solicitante?.nombres, r.solicitante?.apellidos, r.paralelo?.materia?.nom_mat, r.motivo].join(' ')
        );
        return palabras.every((p) => texto.includes(p));
      })
      .sort((a, b) => claveDia(b.fecha).localeCompare(claveDia(a.fecha)));
  }, [reservas, busqueda, estado]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Buscador className="flex-1" value={busqueda} onChange={setBusqueda} placeholder="Buscar por espacio, docente, materia o motivo…" />
        <div className="sm:w-48">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="RESERVADA">Activas</option>
            <option value="CANCELADA">Canceladas</option>
          </Select>
        </div>
      </div>

      <Table
        columnas={COLUMNAS_DETALLE}
        datos={filtradas}
        mensajeVacio={reservas.length ? 'Ninguna reserva coincide con los filtros.' : 'Todavía no hay reservas registradas.'}
        renderFila={(r) => (
          <tr key={r.id_rev} className="border-b border-line last:border-0 hover:bg-paper/40 transition-colors">
            <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">{formatearFecha(r.fecha)}</td>
            <td className="px-5 py-3">
              <div className="font-medium text-ink">{r.espacio?.nom_esp || '—'}</div>
              <div className="text-xs text-ink/50">{ETIQUETA_TIPO_ESPACIO[r.espacio?.tipo] || r.espacio?.tipo}</div>
            </td>
            <td className="px-5 py-3">
              <div className="text-ink">{r.paralelo?.materia?.nom_mat || r.motivo || '—'}</div>
              {r.paralelo?.nom_par && <div className="text-xs text-ink/50">Paralelo {r.paralelo.nom_par}</div>}
            </td>
            <td className="px-5 py-3 text-ink/80 text-xs">
              {r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '—'}
            </td>
            <td className="px-5 py-3 text-ink/70 text-xs whitespace-nowrap">{formatearRango(r.hor_ini, r.hor_fin)}</td>
            <td className="px-5 py-3">
              <Badge estado={r.estado} />
            </td>
            <td className="px-5 py-3 text-right font-medium text-ink">{r._count?.asistencias ?? 0}</td>
          </tr>
        )}
      />
    </div>
  );
}

// ---------------- Exportar reservas a CSV ----------------
function exportarCSV(reservas) {
  if (reservas.length === 0) return;
  const q = (t) => `"${String(t ?? '').replace(/"/g, '""')}"`;
  const cabeceras = ['ID Reserva', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Espacio', 'Tipo de Espacio', 'Docente / Solicitante',
    'Carrera', 'Materia', 'Paralelo', 'Motivo', 'Estado', 'Asistencias Registradas'];
  const filas = reservas.map((r) => [
    r.id_rev,
    formatearFecha(r.fecha),
    r.hor_ini,
    r.hor_fin,
    q(r.espacio?.nom_esp),
    r.espacio?.tipo || '',
    q(r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : ''),
    q(r.paralelo?.nivel?.carrera?.nom_car || 'N/A'),
    q(r.paralelo?.materia?.nom_mat || 'N/A'),
    r.paralelo?.nom_par || 'N/A',
    q(r.motivo),
    r.estado,
    r._count?.asistencias ?? 0,
  ]);
  // BOM UTF-8 para que Excel abra bien las tildes.
  const contenido = '﻿' + [cabeceras.join(','), ...filas.map((f) => f.join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_reservas_${hoyISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
