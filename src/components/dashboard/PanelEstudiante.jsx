import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../../hooks/useApiResource';
import { tutoriasApi } from '../../api/endpoints/tutorias';
import { matriculasApi } from '../../api/endpoints/matriculas';
import { ahoraComoNaive, claveDia, formatearFecha, formatearRango, instanteDeReserva } from '../../lib/formato';
import { Card, DataState } from '../ui';
import { IconoNav } from '../layout/IconosNav';
import MiniCalendario from './MiniCalendario';

const ACCESOS = [
  { to: '/tutorias', etiqueta: 'Cursos', tono: 'bg-azul' },
  { to: '/mis-horarios', etiqueta: 'Mis horarios', tono: 'bg-purple-500' },
  { to: '/mis-tutorias', etiqueta: 'Mis tutorías', tono: 'bg-success' },
  { to: '/solicitudes', etiqueta: 'Solicitudes', tono: 'bg-orange-500' },
];

export default function PanelEstudiante() {
  const cargar = useCallback(async () => {
    const [tutorias, matriculas] = await Promise.all([tutoriasApi.listar(), matriculasApi.listar()]);
    return { tutorias, matriculas };
  }, []);
  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo cargar el panel.' });

  const matriculas = data?.matriculas ?? [];
  const proximas = useMemo(() => {
    const todas = data?.tutorias ?? [];
    return todas
      .filter((t) => instanteDeReserva(t.fecha, t.hora_fin).getTime() >= ahoraComoNaive().getTime())
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_ini.localeCompare(b.hora_ini));
  }, [data]);

  const diasConEventos = useMemo(() => new Set(proximas.map((t) => claveDia(t.fecha))), [proximas]);

  return (
    <DataState cargando={cargando} error={error} vacio={false}>
      <div className="mt-8">
        <p className="font-display text-base text-ink mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ACCESOS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 rounded-lg border border-line bg-white px-3 py-5 text-center hover:border-azul/40 hover:bg-paper/60 transition-colors"
            >
              <span className={`flex items-center justify-center w-10 h-10 rounded-lg text-white ${a.tono}`}>
                <IconoNav ruta={a.to} />
              </span>
              <span className="text-sm font-medium text-ink/80">{a.etiqueta}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card padding="p-5" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base text-ink">Próximas tutorías</p>
            <Link to="/tutorias" className="text-sm text-azul font-medium hover:underline">
              Ver todas →
            </Link>
          </div>
          {proximas.length === 0 ? (
            <p className="text-sm text-ink/50">No tienes tutorías programadas por ahora.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximas.slice(0, 4).map((t) => (
                <li key={t.id_rev} className="py-2.5">
                  <p className="text-sm font-medium text-ink truncate">{t.tema || t.curso}</p>
                  <p className="text-xs text-ink/50">
                    {t.aula} · {formatearFecha(t.fecha)} · {formatearRango(t.hora_ini, t.hora_fin)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card padding="p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50">Mis cursos</p>
            <p className="font-display text-2xl text-ink mt-1.5">{matriculas.length}</p>
            <p className="text-xs text-ink/40 mt-1">cursos matriculados</p>
          </Card>

          <MiniCalendario titulo="Mis próximas tutorías" diasConEventos={diasConEventos} />
        </div>
      </div>
    </DataState>
  );
}
