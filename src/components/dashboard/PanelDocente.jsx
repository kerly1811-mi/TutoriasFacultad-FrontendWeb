import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../../hooks/useApiResource';
import { reservasApi } from '../../api/endpoints/reservas';
import { estadoReserva, formatearFechaLarga, formatearRango } from '../../lib/formato';
import { Badge, Card, DataState } from '../ui';
import { IconoNav } from '../layout/IconosNav';
import StatTile from './StatTile';

const ACCESOS = [
  { to: '/reservas', etiqueta: 'Reservar espacio', tono: 'bg-azul' },
  { to: '/control-acceso', etiqueta: 'Control de asistencia', tono: 'bg-purple-500' },
  { to: '/solicitudes', etiqueta: 'Mis solicitudes', tono: 'bg-success' },
  { to: '/reportes', etiqueta: 'Reportes', tono: 'bg-orange-500' },
];

const ETIQUETA_ESTADO = { PENDIENTE: 'Pendiente', ACTIVA: 'En curso' };
const ESTILO_ESTADO = {
  PENDIENTE: 'bg-celeste/15 text-celeste-dark',
  ACTIVA: 'bg-success/15 text-success',
};

export default function PanelDocente() {
  const cargar = useCallback(() => reservasApi.listar({ mias: true }), []);
  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo cargar el panel.' });

  const reservas = data ?? [];
  const conEstado = useMemo(() => reservas.map((r) => ({ ...r, _estado: estadoReserva(r) })), [reservas]);

  const proximas = conEstado
    .filter((r) => r._estado === 'PENDIENTE' || r._estado === 'ACTIVA')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hor_ini.localeCompare(b.hor_ini));

  const materiales = reservas.reduce((acc, r) => acc + (r._count?.documentos ?? 0), 0);
  const asistencias = reservas.reduce((acc, r) => acc + (r._count?.asistencias ?? 0), 0);

  return (
    <DataState cargando={cargando} error={error} vacio={false}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatTile etiqueta="Mis tutorías" valor={proximas.length} subvalor="próximas" tono="azul" icono={<IconoNav ruta="/reservas" />} />
        <StatTile etiqueta="Reservas realizadas" valor={reservas.length} subvalor="en total" tono="success" icono={<IconoNav ruta="/reportes" />} />
        <StatTile etiqueta="Materiales compartidos" valor={materiales} tono="purpura" icono={<IconoNav ruta="/control-acceso" />} />
        <StatTile etiqueta="Asistencias registradas" valor={asistencias} tono="amber" icono={<IconoNav ruta="/control-acceso" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card padding="p-5" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base text-ink">Próximas tutorías</p>
            <Link to="/control-acceso" className="text-sm text-azul font-medium hover:underline">
              Ver todas →
            </Link>
          </div>
          {proximas.length === 0 ? (
            <p className="text-sm text-ink/50">No tienes tutorías próximas.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximas.slice(0, 4).map((r) => (
                <li key={r.id_rev} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {r.paralelo?.materia?.nom_mat || r.motivo || 'Tutoría'}
                    </p>
                    <p className="text-xs text-ink/50">
                      {r.espacio?.nom_esp} · {formatearFechaLarga(r.fecha)} · {formatearRango(r.hor_ini, r.hor_fin)}
                    </p>
                  </div>
                  <Badge className={ESTILO_ESTADO[r._estado]}>{ETIQUETA_ESTADO[r._estado]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="p-5">
          <p className="font-display text-base text-ink mb-3">Acceso rápido</p>
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
      </div>
    </DataState>
  );
}
