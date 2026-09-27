import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { espaciosApi } from '../api/endpoints/espacios';
import { solicitudesApi } from '../api/endpoints/solicitudes';
import { ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { claveDia, fechaISO, formatearFecha, formatearRango } from '../lib/formato';
import { Badge, Button, Card, DataState, Input, PageHeader, Select, Table } from '../components/ui';

// Utilidades para rangos rápidos de fecha
function inicioDeMes() {
  const d = new Date();
  return fechaISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

function inicioMesAnterior() {
  const d = new Date();
  return fechaISO(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

function finMesAnterior() {
  const d = new Date();
  return fechaISO(new Date(d.getFullYear(), d.getMonth(), 0));
}

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return fechaISO(d);
}

function hoyISO() {
  return fechaISO(new Date());
}

const COLUMNAS_DETALLE = [
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'curso', titulo: 'Curso / Materia' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'asistencias', titulo: 'Asistencias', className: 'text-right' },
];

function agrupar(items, claveFn) {
  const mapa = new Map();
  items.forEach((it) => {
    const k = claveFn(it);
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return [...mapa.entries()].map(([clave, total]) => ({ clave, total }));
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

  // Rango de fechas
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(hoyISO());

  // Navegación por pestañas: 'general' | 'academico' | 'detalle'
  const [pestaña, setPestaña] = useState('general');

  // Filtros del detalle
  const [busquedaDetalle, setBusquedaDetalle] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroTipoEspacio, setFiltroTipoEspacio] = useState('TODOS');

  // Carga de datos
  const cargar = useCallback(async () => {
    const [reservas, espacios, solicitudes] = await Promise.all([
      reservasApi.listar({ mias: esDocente }),
      espaciosApi.listar(),
      solicitudesApi.listar().catch(() => []),
    ]);
    return { reservas, espacios, solicitudes };
  }, [esDocente]);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo generar el reporte.',
  });

  const espacios = data?.espacios ?? [];

  // Filtrado temporal
  const reservas = useMemo(() => {
    const todas = data?.reservas ?? [];
    if (!desde && !hasta) return todas;
    return todas.filter((r) => {
      const dia = claveDia(r.fecha);
      return (!desde || dia >= desde) && (!hasta || dia <= hasta);
    });
  }, [data, desde, hasta]);

  const solicitudes = useMemo(() => {
    const todas = data?.solicitudes ?? [];
    if (!desde && !hasta) return todas;
    return todas.filter((s) => {
      const dia = claveDia(s.fecha);
      return (!desde || dia >= desde) && (!hasta || dia <= hasta);
    });
  }, [data, desde, hasta]);

  // Cálculos estadísticos
  const activas = useMemo(() => reservas.filter((r) => r.estado === 'RESERVADA'), [reservas]);
  const canceladas = useMemo(() => reservas.filter((r) => r.estado === 'CANCELADA'), [reservas]);
  const pctCancelacion = reservas.length ? Math.round((canceladas.length / reservas.length) * 100) : 0;
  const pendientes = useMemo(() => solicitudes.filter((s) => s.estado === 'PENDIENTE'), [solicitudes]);
  const totalAsistencias = useMemo(
    () => activas.reduce((acc, r) => acc + (r._count?.asistencias ?? 0), 0),
    [activas]
  );
  const asistenciaPromedio = activas.length ? (totalAsistencias / activas.length).toFixed(1) : '0';

  // Reservas por espacio (filtradas por tipo si aplica)
  const porEspacio = useMemo(() => {
    return espacios
      .filter((esp) => filtroTipoEspacio === 'TODOS' || esp.tipo === filtroTipoEspacio)
      .map((esp) => ({
        espacio: esp,
        total: activas.filter((r) => r.id_esp === esp.id_esp).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [espacios, activas, filtroTipoEspacio]);

  const maxEsp = Math.max(1, ...porEspacio.map((f) => f.total));

  // Reservas por docente
  const porDocente = useMemo(() => {
    return agrupar(activas, (r) =>
      r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : 'Sin docente'
    ).sort((a, b) => b.total - a.total);
  }, [activas]);
  const maxDoc = Math.max(1, ...porDocente.map((f) => f.total));

  // Reservas por carrera
  const porCarrera = useMemo(() => {
    return agrupar(activas, (r) => r.paralelo?.nivel?.carrera?.nom_car || 'Sin carrera').sort(
      (a, b) => b.total - a.total
    );
  }, [activas]);
  const maxCarrera = Math.max(1, ...porCarrera.map((f) => f.total));

  // Reservas por materia
  const porMateria = useMemo(() => {
    return agrupar(activas, (r) => r.paralelo?.materia?.nom_mat || 'Sin materia').sort(
      (a, b) => b.total - a.total
    );
  }, [activas]);
  const maxMateria = Math.max(1, ...porMateria.map((f) => f.total));

  // Detalle de reservas para tabla de auditoría
  const detalleFiltrado = useMemo(() => {
    const q = busquedaDetalle.trim().toLowerCase();
    return reservas.filter((r) => {
      const texto = [
        r.espacio?.nom_esp,
        r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '',
        r.paralelo?.materia?.nom_mat,
        r.paralelo?.nom_par,
        r.motivo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const coincideBusqueda = !q || texto.includes(q);
      const coincideEstado = filtroEstado === 'TODOS' || r.estado === filtroEstado;
      const coincideTipo = filtroTipoEspacio === 'TODOS' || r.espacio?.tipo === filtroTipoEspacio;
      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  }, [reservas, busquedaDetalle, filtroEstado, filtroTipoEspacio]);

  // Exportar reporte a CSV
  function exportarCSV() {
    if (reservas.length === 0) return;

    const cabeceras = [
      'ID Reserva',
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Espacio',
      'Tipo de Espacio',
      'Docente / Solicitante',
      'Carrera',
      'Materia',
      'Paralelo',
      'Motivo',
      'Estado',
      'Asistencias Registradas',
    ];

    const filasCSV = reservas.map((r) => [
      r.id_rev,
      formatearFecha(r.fecha),
      r.hor_ini,
      r.hor_fin,
      `"${(r.espacio?.nom_esp || '').replace(/"/g, '""')}"`,
      r.espacio?.tipo || '',
      `"${(r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '').replace(/"/g, '""')}"`,
      `"${(r.paralelo?.nivel?.carrera?.nom_car || 'N/A').replace(/"/g, '""')}"`,
      `"${(r.paralelo?.materia?.nom_mat || 'N/A').replace(/"/g, '""')}"`,
      r.paralelo?.nom_par || 'N/A',
      `"${(r.motivo || '').replace(/"/g, '""')}"`,
      r.estado,
      r._count?.asistencias ?? 0,
    ]);

    // UTF-8 BOM para que Excel abra acentos correctamente
    const contenidoCSV = '\uFEFF' + [cabeceras.join(','), ...filasCSV.map((f) => f.join(','))].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_reservas_${desde || 'inicio'}_al_${hasta || 'fin'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Atajos de fecha
  function aplicarRango(d, h) {
    setDesde(d);
    setHasta(h);
  }

  return (
    <div className="space-y-6">
      {/* 1. Encabezado principal */}
      <PageHeader
        titulo="Reportes y Estadísticas"
        descripcion={
          esDocente
            ? 'Resumen y estadísticas de tus reservas de espacios y tutorías.'
            : 'Métricas de ocupación de espacios, reservas por docente, carreras, materias y auditoría general.'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportarCSV} disabled={reservas.length === 0}>
            <span className="flex items-center gap-1.5">
              <IconoDescarga />
              <span>Exportar CSV</span>
            </span>
          </Button>
          <Button variant="secondary" onClick={recargar}>
            Actualizar
          </Button>
        </div>
      </PageHeader>

      {/* 2. Filtros de Fecha y Presets */}
      <Card padding="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Input
                label="Desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="Hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Botones de rango rápido */}
          <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center">
            <span className="text-xs text-ink/50 mr-1">Rango rápido:</span>
            <button
              type="button"
              onClick={() => aplicarRango(hoyISO(), hoyISO())}
              className="text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-paper font-medium text-ink transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => aplicarRango(hace30Dias(), hoyISO())}
              className="text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-paper font-medium text-ink transition-colors"
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => aplicarRango(inicioDeMes(), hoyISO())}
              className="text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-paper font-medium text-ink transition-colors"
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => aplicarRango(inicioMesAnterior(), finMesAnterior())}
              className="text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-paper font-medium text-ink transition-colors"
            >
              Mes pasado
            </button>
            <button
              type="button"
              onClick={() => aplicarRango('', '')}
              className="text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-paper font-medium text-ink transition-colors"
            >
              Todo
            </button>
          </div>
        </div>
      </Card>

      {/* 3. Métricas clave (KPIs) */}
      <DataState cargando={cargando} error={error} vacio={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">
              {esDocente ? 'Mis reservas activas' : 'Reservas activas'}
            </p>
            <p className="font-display text-2xl sm:text-3xl text-ink font-semibold mt-1.5 text-azul">
              {activas.length}
            </p>
          </Card>

          <Card padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">Canceladas</p>
            <p className="font-display text-2xl sm:text-3xl text-ink font-semibold mt-1.5 text-danger">
              {canceladas.length}
            </p>
          </Card>

          <Card padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">% Cancelación</p>
            <p className="font-display text-2xl sm:text-3xl text-ink font-semibold mt-1.5 text-orange-600">
              {pctCancelacion}%
            </p>
          </Card>

          <Card padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">Solicitudes pendientes</p>
            <p className="font-display text-2xl sm:text-3xl text-ink font-semibold mt-1.5 text-purple-600">
              {pendientes.length}
            </p>
          </Card>

          <Card padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">Asistencia promedio</p>
            <p className="font-display text-2xl sm:text-3xl text-ink font-semibold mt-1.5 text-success">
              {asistenciaPromedio} <span className="text-xs font-normal text-ink/50">estudiantes</span>
            </p>
          </Card>
        </div>

        {/* 4. Navegación por pestañas */}
        <div className="flex border-b border-line gap-4 text-sm font-medium pt-2">
          <button
            type="button"
            onClick={() => setPestaña('general')}
            className={`pb-2.5 transition-colors border-b-2 ${
              pestaña === 'general'
                ? 'border-azul text-azul font-semibold'
                : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            Ocupación de Espacios
          </button>
          <button
            type="button"
            onClick={() => setPestaña('academico')}
            className={`pb-2.5 transition-colors border-b-2 ${
              pestaña === 'academico'
                ? 'border-azul text-azul font-semibold'
                : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            Métricas Académicas
          </button>
          <button
            type="button"
            onClick={() => setPestaña('detalle')}
            className={`pb-2.5 transition-colors border-b-2 ${
              pestaña === 'detalle'
                ? 'border-azul text-azul font-semibold'
                : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            Detalle de Reservas ({reservas.length})
          </button>
        </div>

        {/* 5. Contenido según pestaña */}
        {pestaña === 'general' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Distribución de reservas por espacio</p>
              <div className="w-44">
                <Select
                  value={filtroTipoEspacio}
                  onChange={(e) => setFiltroTipoEspacio(e.target.value)}
                  opciones={[
                    { valor: 'TODOS', etiqueta: 'Todos los espacios' },
                    { valor: 'AULA', etiqueta: 'Solo Aulas' },
                    { valor: 'LABORATORIO', etiqueta: 'Solo Laboratorios' },
                  ]}
                />
              </div>
            </div>

            <Barras
              titulo="Ocupación por Espacio Físico"
              filas={porEspacio.map((f) => ({
                etiqueta: `${f.espacio.nom_esp} · ${ETIQUETA_TIPO_ESPACIO[f.espacio.tipo] || f.espacio.tipo}`,
                valor: f.total,
                max: maxEsp,
              }))}
              vacio="No hay reservas en los espacios seleccionados para este período."
            />

            {!esDocente && (
              <Barras
                titulo="Top Docentes con más Reservas"
                filas={porDocente.slice(0, 10).map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxDoc }))}
                vacio="Todavía no hay reservas registradas por docentes."
              />
            )}
          </div>
        )}

        {pestaña === 'academico' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Barras
              titulo="Reservas por Carrera"
              filas={porCarrera.map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxCarrera }))}
              vacio="Todavía no hay reservas ligadas a carreras."
            />

            <Barras
              titulo="Reservas por Materia"
              filas={porMateria.map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxMateria }))}
              vacio="Todavía no hay reservas ligadas a materias."
            />
          </div>
        )}

        {pestaña === 'detalle' && (
          <div className="space-y-4">
            {/* Barra de filtrado del detalle */}
            <Card padding="p-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Buscar por espacio, docente, materia o motivo…"
                    value={busquedaDetalle}
                    onChange={(e) => setBusquedaDetalle(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    opciones={[
                      { valor: 'TODOS', etiqueta: 'Todos los estados' },
                      { valor: 'RESERVADA', etiqueta: 'Activas' },
                      { valor: 'CANCELADA', etiqueta: 'Canceladas' },
                    ]}
                  />
                </div>
              </div>
            </Card>

            {/* Tabla de detalle */}
            <Table
              columnas={COLUMNAS_DETALLE}
              datos={detalleFiltrado}
              mensajeVacio="No hay reservas registradas para los filtros seleccionados."
              renderFila={(r) => (
                <tr key={r.id_rev} className="border-b border-line hover:bg-paper/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink whitespace-nowrap">
                    {formatearFecha(r.fecha)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{r.espacio?.nom_esp || '—'}</div>
                    <div className="text-xs text-ink/50">{ETIQUETA_TIPO_ESPACIO[r.espacio?.tipo] || r.espacio?.tipo}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-ink">{r.paralelo?.materia?.nom_mat || r.motivo || '—'}</div>
                    {r.paralelo?.nom_par && (
                      <div className="text-xs text-ink/50">Paralelo {r.paralelo.nom_par}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/80 text-xs">
                    {r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-ink/70 text-xs whitespace-nowrap">
                    {formatearRango(r.hor_ini, r.hor_fin)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge estado={r.estado} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-ink">
                    {r._count?.asistencias ?? 0}
                  </td>
                </tr>
              )}
            />
          </div>
        )}
      </DataState>
    </div>
  );
}

function Barras({ titulo, filas, vacio = 'Sin datos.' }) {
  return (
    <Card padding="p-5 sm:p-6">
      <p className="font-display text-base sm:text-lg text-ink font-semibold mb-4">{titulo}</p>
      {filas.length === 0 ? (
        <p className="text-sm text-ink/50">{vacio}</p>
      ) : (
        <ul className="space-y-3.5">
          {filas.map((f) => (
            <li key={f.etiqueta}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink font-medium truncate pr-2">{f.etiqueta}</span>
                <span className="text-ink/60 font-semibold shrink-0">{f.valor}</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-azul rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, (f.valor / f.max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
