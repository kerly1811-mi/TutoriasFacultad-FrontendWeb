import { useCallback, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { tutoriasApi } from '../api/endpoints/tutorias';
import { ETIQUETA_BLOQUE } from '../lib/constantes';
import { ahoraComoNaive, formatearFecha, formatearRango, instanteDeReserva } from '../lib/formato';
import { Card, DataState, PageHeader, SkeletonCards } from '../components/ui';

// Agrupa las tutorías por curso, en el orden en que aparece cada una por primera vez.
function agruparPorCurso(tutorias) {
  const mapa = new Map();
  tutorias.forEach((t) => {
    const clave = t.curso || 'Sin curso asignado';
    if (!mapa.has(clave)) mapa.set(clave, { curso: clave, docente: t.docente, items: [] });
    mapa.get(clave).items.push(t);
  });
  return [...mapa.values()];
}

export default function Tutorias() {
  const cargar = useCallback(() => tutoriasApi.listar(), []);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las tutorías.',
  });
  // Solo próximas o en curso: se excluyen las que ya concluyeron (hor_fin ya pasó).
  const tutorias = useMemo(
    () => (data ?? []).filter((t) => instanteDeReserva(t.fecha, t.hora_fin).getTime() >= ahoraComoNaive().getTime()),
    [data]
  );
  const grupos = useMemo(() => agruparPorCurso(tutorias), [tutorias]);

  return (
    <Layout>
      <PageHeader
        titulo="Cursos"
        descripcion="Tutorías programadas por curso: en qué aula y a qué hora."
      />

      <div className="mt-6">
        <DataState
          cargando={cargando}
          error={error}
          vacio={tutorias.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="No hay tutorías programadas por ahora."
        >
          {grupos.map((g, i) => (
            <section key={g.curso} className={i > 0 ? 'mt-8' : ''}>
              <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-line">
                <h2 className="font-display text-xl text-ink">{g.curso}</h2>
                <span className="text-sm text-ink/50 shrink-0">Docente: {g.docente}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((t) => (
                  <Card key={t.id_rev} padding="p-3">
                    <span className="text-[10px] uppercase tracking-wide text-celeste-dark font-medium">
                      {formatearFecha(t.fecha)} · {formatearRango(t.hora_ini, t.hora_fin)}
                    </span>
                    <p className="font-display text-base text-ink mt-0.5">{t.tema}</p>
                    <p className="text-sm text-ink/70 mt-1">{t.aula}</p>
                    {t.bloque && (
                      <p className="text-xs text-ink/50">
                        {ETIQUETA_BLOQUE[t.bloque] || t.bloque} · Piso {t.piso}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </DataState>
      </div>
    </Layout>
  );
}
