import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { espaciosApi } from '../api/endpoints/espacios';
import { solicitudesApi } from '../api/endpoints/solicitudes';
import { ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { claveDia, fechaISO } from '../lib/formato';
import { Card, DataState, Input, PageHeader } from '../components/ui';

function inicioDeMes() {
  const d = new Date();
  return fechaISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export default function Reportes() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'DOCENTE';
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(fechaISO(new Date()));

  const cargar = useCallback(async () => {
    const [reservas, espacios, solicitudes] = await Promise.all([
      reservasApi.listar({ mias: esDocente }),
      espaciosApi.listar(),
      solicitudesApi.listar().catch(() => []), // ESTUDIANTE no tiene acceso a este reporte
    ]);
    return { reservas, espacios, solicitudes };
  }, [esDocente]);

  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo generar el reporte.' });

  const espacios = data?.espacios ?? [];
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

  const activas = reservas.filter((r) => r.estado === 'RESERVADA');
  const canceladas = reservas.filter((r) => r.estado === 'CANCELADA');
  const pctCancelacion = reservas.length ? Math.round((canceladas.length / reservas.length) * 100) : 0;
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const totalAsistencias = activas.reduce((acc, r) => acc + (r._count?.asistencias ?? 0), 0);
  const asistenciaPromedio = activas.length ? (totalAsistencias / activas.length).toFixed(1) : '0';

  // Reservas por espacio
  const porEspacio = espacios
    .map((esp) => ({
      espacio: esp,
      total: activas.filter((r) => r.id_esp === esp.id_esp).length,
    }))
    .sort((a, b) => b.total - a.total);
  const maxEsp = Math.max(1, ...porEspacio.map((f) => f.total));

  // Reservas por docente (solo tiene sentido para admin/laboratorista que ven todas)
  const porDocente = agrupar(activas, (r) =>
    r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : 'Sin docente'
  ).sort((a, b) => b.total - a.total);
  const maxDoc = Math.max(1, ...porDocente.map((f) => f.total));

  // Reservas por carrera / materia (según el paralelo asociado a la tutoría)
  const porCarrera = agrupar(activas, (r) => r.paralelo?.nivel?.carrera?.nom_car || 'Sin carrera').sort(
    (a, b) => b.total - a.total
  );
  const maxCarrera = Math.max(1, ...porCarrera.map((f) => f.total));

  const porMateria = agrupar(activas, (r) => r.paralelo?.materia?.nom_mat || 'Sin materia').sort(
    (a, b) => b.total - a.total
  );
  const maxMateria = Math.max(1, ...porMateria.map((f) => f.total));

  return (
    <Layout>
      <PageHeader
        titulo="Reportes"
        descripcion={
          esDocente
            ? 'Resumen de tus reservas.'
            : 'Ocupación de espacios, reservas por docente, carrera y materia.'
        }
      >
        <div className="flex items-end gap-3">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </PageHeader>

      <div className="mt-6">
        <DataState cargando={cargando} error={error} vacio={espacios.length === 0} mensajeVacio="No hay datos.">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Indicador etiqueta={esDocente ? 'Mis reservas activas' : 'Reservas activas'} valor={activas.length} />
            <Indicador etiqueta="Canceladas" valor={canceladas.length} />
            <Indicador etiqueta="% Cancelación" valor={`${pctCancelacion}%`} />
            <Indicador etiqueta="Solicitudes pendientes" valor={pendientes.length} />
            <Indicador etiqueta="Asistencia promedio" valor={asistenciaPromedio} />
          </div>

          <Barras
            titulo="Reservas por espacio"
            filas={porEspacio.map((f) => ({
              etiqueta: `${f.espacio.nom_esp} · ${ETIQUETA_TIPO_ESPACIO[f.espacio.tipo] || f.espacio.tipo}`,
              valor: f.total,
              max: maxEsp,
            }))}
          />

          {!esDocente && (
            <Barras
              titulo="Reservas por docente"
              filas={porDocente.map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxDoc }))}
              vacio="Todavía no hay reservas."
            />
          )}

          <Barras
            titulo="Reservas por carrera"
            filas={porCarrera.map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxCarrera }))}
            vacio="Todavía no hay reservas ligadas a un curso."
          />

          <Barras
            titulo="Reservas por materia"
            filas={porMateria.map((f) => ({ etiqueta: f.clave, valor: f.total, max: maxMateria }))}
            vacio="Todavía no hay reservas ligadas a un curso."
          />
        </DataState>
      </div>
    </Layout>
  );
}

function agrupar(items, claveFn) {
  const mapa = new Map();
  items.forEach((it) => {
    const k = claveFn(it);
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return [...mapa.entries()].map(([clave, total]) => ({ clave, total }));
}

function Indicador({ etiqueta, valor }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-ink/50">{etiqueta}</p>
      <p className="font-display text-3xl text-ink mt-2">{valor}</p>
    </Card>
  );
}

function Barras({ titulo, filas, vacio = 'Sin datos.' }) {
  return (
    <Card padding="p-6" className="mt-6">
      <p className="font-display text-lg text-ink mb-4">{titulo}</p>
      {filas.length === 0 ? (
        <p className="text-sm text-ink/50">{vacio}</p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f) => (
            <li key={f.etiqueta}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{f.etiqueta}</span>
                <span className="text-ink/60">{f.valor}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-line overflow-hidden">
                <div className="h-full bg-azul" style={{ width: `${(f.valor / f.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
