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
  { to: '/carreras', etiqueta: 'Cursos', tono: 'bg-success' },
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
  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo cargar el panel.' });

  const usuarios = data?.usuarios ?? [];
  const espacios = data?.espacios ?? [];
  const reservas = data?.reservas ?? [];
  const solicitudes = data?.solicitudes ?? [];

  const activas = reservas.filter((r) => r.estado === 'RESERVADA');
  const aulas = espacios.filter((e) => e.activo && e.tipo === 'AULA');
  const labs = espacios.filter((e) => e.activo && e.tipo === 'LABORATORIO');
  const usuariosActivos = usuarios.filter((u) => u.activo);
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const recientes = [...reservas].sort((a, b) => b.id_rev - a.id_rev).slice(0, 4);

  const semana = useMemo(() => semanaCompleta(), []);
  const datosAulas = semana.map(
    (dia) => activas.filter((r) => r.espacio?.tipo === 'AULA' && claveDia(r.fecha) === dia).length
  );
  const datosLabs = semana.map(
    (dia) => activas.filter((r) => r.espacio?.tipo === 'LABORATORIO' && claveDia(r.fecha) === dia).length
  );

  const diasConEventos = useMemo(() => new Set(activas.map((r) => claveDia(r.fecha))), [activas]);

  return (
    <DataState cargando={cargando} error={error} vacio={false}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatTile etiqueta="Reservas activas" valor={activas.length} tono="azul" icono={<IconoNav ruta="/reservas" />} />
        <StatTile
          etiqueta="Aulas disponibles"
          valor={aulas.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${aulas.length}`}
          tono="success"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile
          etiqueta="Laboratorios disponibles"
          valor={labs.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${labs.length}`}
          tono="purpura"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile
          etiqueta="Usuarios activos"
          valor={usuariosActivos.length}
          subvalor={`de ${usuarios.length}`}
          tono="amber"
          icono={<IconoNav ruta="/usuarios" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-base text-ink">Reservas recientes</p>
              <Link to="/reportes" className="text-sm text-azul font-medium hover:underline">
                Ver todas →
              </Link>
            </div>
            {recientes.length === 0 ? (
              <p className="text-sm text-ink/50">Todavía no hay reservas.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recientes.map((r) => (
                  <li key={r.id_rev} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.espacio?.nom_esp || 'Espacio'}</p>
                      <p className="text-xs text-ink/50">
                        {formatearFecha(r.fecha)} · {formatearRango(r.hor_ini, r.hor_fin)}
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
              <p className="font-display text-base text-ink">Solicitudes pendientes</p>
              <span className="text-xs text-ink/50">{pendientes.length}</span>
            </div>
            {pendientes.length === 0 ? (
              <p className="text-sm text-ink/50">No hay solicitudes pendientes.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pendientes.slice(0, 3).map((s) => (
                  <li key={s.id_sol} className="py-2.5">
                    <p className="text-sm font-medium text-ink truncate">
                      {s.estudiante?.nombres} {s.estudiante?.apellidos} · {s.paralelo?.materia?.nom_mat}
                    </p>
                    <p className="text-xs text-ink/50">{formatearFecha(s.fecha)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="p-5">
            <p className="font-display text-base text-ink mb-3">Accesos rápidos</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCESOS.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 rounded-md border border-line px-2 py-3 text-center hover:border-azul/40 hover:bg-paper/60 transition-colors"
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-md text-white ${a.tono}`}>
                    <IconoNav ruta={a.to} />
                  </span>
                  <span className="text-xs font-medium text-ink/80">{a.etiqueta}</span>
                </Link>
              ))}
            </div>
          </Card>

          <MiniCalendario titulo="Actividad del mes" diasConEventos={diasConEventos} />
        </div>
      </div>
    </DataState>
  );
}
