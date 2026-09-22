import { useCallback, useMemo, useState } from 'react';
import { useApiResource } from '../../hooks/useApiResource';
import { espaciosApi } from '../../api/endpoints/espacios';
import { reservasApi } from '../../api/endpoints/reservas';
import { solicitudesApi } from '../../api/endpoints/solicitudes';
import { disponibilidadApi } from '../../api/endpoints/disponibilidad';
import { claveDia, fechaISO, horaEnMinutos } from '../../lib/formato';
import { ETIQUETA_BLOQUE, ETIQUETA_TIPO_ESPACIO } from '../../lib/constantes';
import { Badge, Card, DataState, Input, Table } from '../ui';
import { IconoNav } from '../layout/IconosNav';
import StatTile from './StatTile';
import MiniCalendario from './MiniCalendario';

const PESTANAS = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'AULA', etiqueta: 'Aulas' },
  { clave: 'LABORATORIO', etiqueta: 'Laboratorios' },
];

const COLUMNAS = [
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'tipo', titulo: 'Tipo' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'ubicacion', titulo: 'Ubicación' },
];

const ESTILO_ESTADO_VIVO = {
  Disponible: 'bg-success/10 text-success',
  Ocupado: 'bg-amber-500/10 text-amber-700',
  Mantenimiento: 'bg-danger/10 text-danger',
};

export default function PanelLaboratorista() {
  const [pestana, setPestana] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const hoyISO = useMemo(() => fechaISO(new Date()), []);

  const cargar = useCallback(async () => {
    const [espacios, reservas, solicitudes, disponibilidad] = await Promise.all([
      espaciosApi.listar({ incluirInactivos: true }),
      reservasApi.listar(),
      solicitudesApi.listar().catch(() => []),
      disponibilidadApi.consultar({ fecha: hoyISO }),
    ]);
    return { espacios, reservas, solicitudes, disponibilidad };
  }, [hoyISO]);
  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo cargar el panel.' });

  const espacios = data?.espacios ?? [];
  const reservas = data?.reservas ?? [];
  const solicitudes = data?.solicitudes ?? [];
  const disponibilidadHoy = data?.disponibilidad?.espacios ?? [];

  const activas = reservas.filter((r) => r.estado === 'RESERVADA');
  const reservasHoy = activas.filter((r) => claveDia(r.fecha) === hoyISO);
  const aulas = espacios.filter((e) => e.activo && e.tipo === 'AULA');
  const labs = espacios.filter((e) => e.activo && e.tipo === 'LABORATORIO');
  const enMantenimiento = espacios.filter((e) => e.activo && e.estado === 'MANTENIMIENTO');
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');

  const minutosAhora = useMemo(() => {
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes();
  }, []);

  const mapaOcupacion = useMemo(() => {
    const mapa = new Map();
    disponibilidadHoy.forEach((e) => {
      const ocupadoAhora = (e.ocupaciones || []).some(
        (o) => horaEnMinutos(o.hora_ini) <= minutosAhora && minutosAhora < horaEnMinutos(o.hora_fin)
      );
      mapa.set(e.id_esp, ocupadoAhora);
    });
    return mapa;
  }, [disponibilidadHoy, minutosAhora]);

  function estadoVivo(esp) {
    if (esp.estado === 'MANTENIMIENTO') return 'Mantenimiento';
    return mapaOcupacion.get(esp.id_esp) ? 'Ocupado' : 'Disponible';
  }

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return espacios
      .filter((e) => e.activo)
      .filter((e) => pestana === 'todos' || e.tipo === pestana)
      .filter((e) => !q || e.nom_esp.toLowerCase().includes(q))
      .sort((a, b) => a.nom_esp.localeCompare(b.nom_esp));
  }, [espacios, pestana, busqueda]);

  const diasConEventos = useMemo(() => new Set(activas.map((r) => claveDia(r.fecha))), [activas]);

  return (
    <DataState cargando={cargando} error={error} vacio={false}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatTile
          etiqueta="Laboratorios disponibles"
          valor={labs.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${labs.length}`}
          tono="azul"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile
          etiqueta="Aulas disponibles"
          valor={aulas.filter((e) => e.estado === 'DISPONIBLE').length}
          subvalor={`de ${aulas.length}`}
          tono="success"
          icono={<IconoNav ruta="/espacios" />}
        />
        <StatTile etiqueta="Reservas hoy" valor={reservasHoy.length} tono="purpura" icono={<IconoNav ruta="/ocupacion" />} />
        <StatTile
          etiqueta="En mantenimiento"
          valor={enMantenimiento.length}
          tono="danger"
          icono={<IconoNav ruta="/espacios" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="font-display text-base text-ink">Estado de aulas y laboratorios</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
                  {PESTANAS.map((p) => (
                    <button
                      key={p.clave}
                      type="button"
                      onClick={() => setPestana(p.clave)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        pestana === p.clave ? 'bg-azul text-white' : 'text-ink/60 hover:bg-paper'
                      }`}
                    >
                      {p.etiqueta}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Buscar espacio…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            <Table
              columnas={COLUMNAS}
              datos={filas}
              mensajeVacio="Ningún espacio coincide."
              renderFila={(e) => (
                <tr key={e.id_esp} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{e.nom_esp}</td>
                  <td className="px-5 py-3 text-ink/70">{ETIQUETA_TIPO_ESPACIO[e.tipo] || e.tipo}</td>
                  <td className="px-5 py-3">
                    <Badge className={ESTILO_ESTADO_VIVO[estadoVivo(e)]}>{estadoVivo(e)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink/60">
                    {e.bloque ? `${ETIQUETA_BLOQUE[e.bloque] || e.bloque} · Piso ${e.piso}` : '—'}
                  </td>
                </tr>
              )}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <MiniCalendario titulo="Calendario de reservas" diasConEventos={diasConEventos} />

          <Card padding="p-5">
            <p className="font-display text-base text-ink mb-3">Resumen rápido</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-ink/60">Reservas activas</span>
                <span className="font-medium text-ink">{activas.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink/60">Pendientes de confirmación</span>
                <span className="font-medium text-ink">{pendientes.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink/60">En mantenimiento</span>
                <span className="font-medium text-ink">{enMantenimiento.length}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </DataState>
  );
}
