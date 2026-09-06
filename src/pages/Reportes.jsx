import { useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { espaciosApi } from '../api/endpoints/espacios';
import { ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { Card, DataState, PageHeader } from '../components/ui';

export default function Reportes() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'DOCENTE';

  const cargar = useCallback(async () => {
    const [reservas, espacios] = await Promise.all([
      reservasApi.listar({ mias: esDocente }),
      espaciosApi.listar(),
    ]);
    return { reservas, espacios };
  }, [esDocente]);

  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudo generar el reporte.' });

  const reservas = data?.reservas ?? [];
  const espacios = data?.espacios ?? [];
  const activas = reservas.filter((r) => r.estado === 'RESERVADA');
  const canceladas = reservas.filter((r) => r.estado === 'CANCELADA');

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

  return (
    <Layout>
      <PageHeader
        titulo="Reportes"
        descripcion={
          esDocente
            ? 'Resumen de tus reservas.'
            : 'Ocupación de espacios y reservas por docente.'
        }
      />

      <div className="mt-6">
        <DataState cargando={cargando} error={error} vacio={espacios.length === 0} mensajeVacio="No hay datos.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Indicador etiqueta={esDocente ? 'Mis reservas activas' : 'Reservas activas'} valor={activas.length} />
            <Indicador etiqueta="Canceladas" valor={canceladas.length} />
            <Indicador etiqueta="Aulas registradas" valor={espacios.length} />
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
