import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { ETIQUETA_DIA, ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { Badge, Card, DataState, Input, PageHeader, SkeletonCards } from '../components/ui';

const HOY = new Date().toISOString().slice(0, 10);

export default function Ocupacion() {
  const [fecha, setFecha] = useState(HOY);

  const cargar = useCallback(() => disponibilidadApi.consultar({ fecha }), [fecha]);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar la ocupación.',
  });

  const espacios = data?.espacios ?? [];

  return (
    <Layout>
      <PageHeader
        titulo="Ocupación de aulas"
        descripcion="Qué aulas están en clase, reservadas o libres en la fecha elegida."
      />

      <div className="mt-6 flex items-end gap-3">
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-44"
        />
        {data && (
          <p className="text-sm text-ink/50 pb-2">{ETIQUETA_DIA[data.dia_semana] || data.dia_semana}</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={espacios.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="No hay aulas registradas."
        >
          {espacios.map((esp) => (
            <Card key={esp.id_esp}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                    {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                  </span>
                  <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
                </div>
                <Badge
                  className={
                    esp.ocupaciones.length === 0
                      ? 'bg-success/10 text-success'
                      : 'bg-celeste/10 text-celeste-dark'
                  }
                >
                  {esp.ocupaciones.length === 0 ? 'Libre todo el día' : `${esp.ocupaciones.length} bloque(s)`}
                </Badge>
              </div>

              {esp.ocupaciones.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-line space-y-1.5">
                  {esp.ocupaciones.map((o, i) => (
                    <li key={`${esp.id_esp}-${i}`} className="text-sm">
                      <span className="text-ink/70">
                        {o.hora_ini}–{o.hora_fin}
                      </span>{' '}
                      <span
                        className={
                          o.tipo === 'CLASE' ? 'text-celeste-dark font-medium' : 'text-azul-dark font-medium'
                        }
                      >
                        {o.tipo === 'CLASE' ? 'Clase' : 'Reserva'}
                      </span>{' '}
                      <span className="text-ink/50">· {o.etiqueta}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </DataState>
      </div>
    </Layout>
  );
}
