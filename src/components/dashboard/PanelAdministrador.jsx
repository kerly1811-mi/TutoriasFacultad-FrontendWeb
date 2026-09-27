import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../../hooks/useApiResource';
import { usuariosApi } from '../../api/endpoints/usuarios';
import { espaciosApi } from '../../api/endpoints/espacios';
import { reservasApi } from '../../api/endpoints/reservas';
import { solicitudesApi } from '../../api/endpoints/solicitudes';
import { formatearFecha, formatearRango, claveDia, fechaISO } from '../../lib/formato';
import { Badge, Card, DataState } from '../ui';
import { IconoNav } from '../layout/IconosNav';
import StatTile from './StatTile';
import BarrasSemana from './BarrasSemana';
import MiniCalendario from './MiniCalendario';

const ACCESOS = [
  { to: '/usuarios', etiqueta: 'Gestionar usuarios', tono: 'bg-azul' },
  { to: '/reportes', etiqueta: 'Ver reportes', tono: 'bg-purple-500' },
  { to: '/carreras', etiqueta: 'Cursos y Carreras', tono: 'bg-success' },
  { to: '/matriculas', etiqueta: 'Matrículas', tono: 'bg-orange-500' },
];

function semanaCompleta() {
  const hoy = new Date();
  const diaJs = hoy.getDay();
  const offsetLunes = diaJs === 0 ? -6 : 1 - diaJs;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offsetLunes);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return fechaISO(d);
  });
}

export default function PanelAdministrador() {
  const cargar = useCallback(async () => {
    const [usuarios, espacios, reservas, solicitudes] = await Promise.all([
      usuariosApi.listar({ incluirInactivos: true }),
      espaciosApi.listar({ incluirInactivos: true }),
      reservasApi.listar(),
      solicitudesApi.listar().catch(() => []),
    ]);
    return { usuarios, espacios, reservas, solicitudes };
  }, []);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar el panel de administración.',
  });

  const usuarios = data?.usuarios ?? [];
  const espacios = data?.espacios ?? [];
  const reservas = data?.reservas ?? [];
  const solicitudes = data?.solicitudes ?? [];

  // Memoización limpia para evitar re-cálculos innecesarios
  const activas = useMemo(() => reservas.filter((r) => r.estado === 'RESERVADA'), [reservas]);
  const aulas = useMemo(() => espacios.filter((e) => e.activo && e.tipo === 'AULA'), [espacios]);
  const labs = useMemo(() => espacios.filter((e) => e.activo && e.tipo === 'LABORATORIO'), [espacios]);
  const usuariosActivos = useMemo(() => usuarios.filter((u) => u.activo), [usuarios]);
  const pendientes = useMemo(() => solicitudes.filter((s) => s.estado === 'PENDIENTE'), [solicitudes]);
  const recientes = useMemo(() => [...reservas].sort((a, b) => b.id_rev - a.id_rev).slice(0, 5), [reservas]);

  const semana = useMemo(() => semanaCompleta(), []);
  const datosAulas = useMemo(
    () => semana.map((dia) => activas.filter((r) => r.espacio?.tipo === 'AULA' && claveDia(r.fecha) === dia).length),
    [semana, activas]
  );
  const datosLabs = useMemo(
    () => semana.map((dia) => activas.filter((r) => r.espacio?.tipo === 'LABORATORIO' && claveDia(r.fecha) === dia).length),
    [semana, activas]
  );

  const diasConEventos = useMemo(() => new Set(activas.map((r) => claveDia(r.fecha))), [activas]);

  return (
    <DataState cargando={cargando} error={error} vacio={false} onReintentar={recargar}>
      {/* 1. Métricas / StatTiles clickeables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <StatTile
          etiqueta="Reservas activas"
          valor={activas.length}
          tono="azul"
          to="/reportes"
          icono={<IconoNav ruta="/reservas" />}
        />
        <StatTile
          etiqueta="Aulas disponibles"
          valor={aulas.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${aulas.length}`}
          tono="success"
          to="/espacios"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile
          etiqueta="Laboratorios disponibles"
          valor={labs.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${labs.length}`}
          tono="purpura"
          to="/espacios"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile
          etiqueta="Usuarios activos"
          valor={usuariosActivos.length}
          subvalor={`de ${usuarios.length}`}
          tono="amber"
          to="/usuarios"
          icono={<IconoNav ruta="/usuarios" />}
        />
      </div>

      {/* 2. Sección central: Gráfico + Recientes + Calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display text-base text-ink font-semibold">Reservas recientes</p>
                <p className="text-xs text-ink/50 mt-0.5">Últimos registros en la facultad</p>
              </div>
              <Link to="/reportes" className="text-xs text-azul font-medium hover:underline">
                Ver todas →
              </Link>
            </div>
            {recientes.length === 0 ? (
              <p className="text-sm text-ink/50 py-4 text-center">Todavía no hay reservas registradas.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recientes.map((r) => (
                  <li key={r.id_rev} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.espacio?.nom_esp || 'Espacio'}</p>
                      <p className="text-xs text-ink/50">
                        {formatearFecha(r.fecha)} · {formatearRango(r.hor_ini, r.hor_fin)}
                        {r.solicitante && ` · ${r.solicitante.nombres} ${r.solicitante.apellidos}`}
                      </p>
                    </div>
                    <Badge estado={r.estado} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <BarrasSemana
            titulo="Uso de espacios (esta semana)"
            series={[
              { nombre: 'Aulas', color: 'bg-azul', datos: datosAulas },
              { nombre: 'Laboratorios', color: 'bg-celeste', datos: datosLabs },
            ]}
          />

          <Card padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display text-base text-ink font-semibold">Solicitudes pendientes</p>
                <p className="text-xs text-ink/50 mt-0.5">Estudiantes en espera de confirmación</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-paper rounded-full text-ink/60 border border-line">
                {pendientes.length}
              </span>
            </div>
            {pendientes.length === 0 ? (
              <p className="text-sm text-ink/50 py-3 text-center">No hay solicitudes pendientes.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pendientes.slice(0, 4).map((s) => (
                  <li key={s.id_sol} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {s.estudiante?.nombres} {s.estudiante?.apellidos}
                      </p>
                      <p className="text-xs text-ink/50">
                        {s.paralelo?.materia?.nom_mat} · {formatearFecha(s.fecha)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 3. Columna lateral: Accesos directos y Calendario */}
        <div className="space-y-4">
          <Card padding="p-5">
            <p className="font-display text-base text-ink font-semibold mb-3">Accesos rápidos</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ACCESOS.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 rounded-lg border border-line p-3 text-center hover:border-azul/40 hover:bg-paper/60 transition-all hover:shadow-xs group"
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-lg text-white shadow-xs group-hover:scale-105 transition-transform ${a.tono}`}
                  >
                    <IconoNav ruta={a.to} />
                  </span>
                  <span className="text-xs font-medium text-ink/80 group-hover:text-azul transition-colors">
                    {a.etiqueta}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <MiniCalendario titulo="Actividad de reservas del mes" diasConEventos={diasConEventos} />
        </div>
      </div>
    </DataState>
  );
}
