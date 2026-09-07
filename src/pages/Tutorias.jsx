import { useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { tutoriasApi } from '../api/endpoints/tutorias';
import { ETIQUETA_BLOQUE, ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { formatearFecha, formatearRango } from '../lib/formato';
import { Card, DataState, PageHeader, SkeletonCards } from '../components/ui';

export default function Tutorias() {
  const cargar = useCallback(() => tutoriasApi.listar(), []);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las tutorías.',
  });
  const tutorias = data ?? [];

  return (
    <Layout>
      <PageHeader
        titulo="Tutorías habilitadas por curso"
        descripcion="Tutorías programadas: en qué aula, a qué hora y con qué docente."
      />

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={tutorias.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="No hay tutorías programadas por ahora."
        >
          {tutorias.map((t) => (
            <Card key={t.id_rev}>
              <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                {formatearFecha(t.fecha)} · {formatearRango(t.hora_ini, t.hora_fin)}
              </span>
              <p className="font-display text-lg text-ink mt-1">{t.tema}</p>
              {t.curso && <p className="text-sm text-celeste-dark font-medium">{t.curso}</p>}
              <p className="text-sm text-ink/70 mt-2">
                {t.aula}
                <span className="text-ink/40"> · {ETIQUETA_TIPO_ESPACIO[t.tipo] || t.tipo}</span>
              </p>
              {t.bloque && (
                <p className="text-sm text-ink/50">
                  {ETIQUETA_BLOQUE[t.bloque] || t.bloque} · Piso {t.piso}
                </p>
              )}
              <p className="text-sm text-ink/60 mt-3 pt-3 border-t border-line">
                Docente: <span className="font-medium text-ink">{t.docente}</span>
              </p>
            </Card>
          ))}
        </DataState>
      </div>
    </Layout>
  );
}
