import { useCallback, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { paralelosApi } from '../api/endpoints/paralelos';
import { ETIQUETA_DIA } from '../lib/constantes';
import { horaEnMinutos } from '../lib/formato';
import { resumirHorario } from '../lib/horario';
import { Badge, Card, DataState, PageHeader, SkeletonCards } from '../components/ui';

/**
 * "Mis clases" del docente: los paralelos que la facultad le asignó (Paralelos, admin),
 * con su horario semanal (Horarios, laboratorista/admin) y cuántos estudiantes tiene.
 * Es solo de consulta: la asignación la hace la facultad, no el docente.
 */
export default function MisClases() {
  const { usuario } = useAuth();
  const idDocente = usuario?.id;
  const cargar = useCallback(
    () => (idDocente ? paralelosApi.listar({ id_doc: idDocente, conHorarios: 1 }) : Promise.resolve([])),
    [idDocente]
  );
  const { data, cargando, error } = useApiResource(cargar, { mensajeError: 'No se pudieron cargar tus clases.' });

  const paralelos = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          (a.nivel?.carrera?.nom_car || '').localeCompare(b.nivel?.carrera?.nom_car || '') ||
          (a.nivel?.id_niv ?? 0) - (b.nivel?.id_niv ?? 0) ||
          a.materia.nom_mat.localeCompare(b.materia.nom_mat) ||
          a.nom_par.localeCompare(b.nom_par)
      ),
    [data]
  );
  // Horas reales por semana (sin contar dos veces una clase repetida en dos aulas).
  const totalHoras = paralelos.reduce(
    (t, p) =>
      t + resumirHorario(p.horarios).reduce((h, f) => h + (horaEnMinutos(f.fin) - horaEnMinutos(f.ini)) / 60, 0),
    0
  );
  const totalEstudiantes = paralelos.reduce((t, p) => t + (p._count?.matriculas ?? 0), 0);

  return (
    <Layout>
      <PageHeader
        titulo="Mis clases"
        descripcion="Las materias y paralelos que tienes asignados este periodo, con su horario y tus estudiantes."
      />

      {!cargando && !error && paralelos.length > 0 && (
        <p className="mt-4 text-sm text-ink/50">
          {paralelos.length} paralelo(s) · {totalHoras} hora(s) de clase por semana · {totalEstudiantes} estudiante(s)
          matriculado(s)
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={paralelos.length === 0}
          skeleton={<SkeletonCards count={3} />}
          mensajeVacio="Aún no tienes paralelos asignados. La facultad (administración) asigna las materias a cada docente."
        >
          {paralelos.map((p) => {
            const franjas = resumirHorario(p.horarios);
            return (
              <Card key={p.id_par}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base text-ink">{p.materia?.nom_mat}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {p.nivel?.nom_niv} · {p.nivel?.carrera?.nom_car}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-celeste/10 text-celeste-dark">Paralelo {p.nom_par}</Badge>
                </div>

                <ul className="mt-3 pt-3 border-t border-line space-y-1.5 text-sm">
                  {franjas.length === 0 ? (
                    <li className="text-ink/50">Sin horario cargado.</li>
                  ) : (
                    franjas.map((f, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3">
                        <span className="text-ink">
                          <span className="inline-block w-20 text-ink/60">{ETIQUETA_DIA[f.dia] || f.dia}</span>
                          <span className="tabular-nums font-medium">
                            {f.ini}–{f.fin}
                          </span>
                        </span>
                        <span className="text-xs text-ink/50 text-right">{f.espacios.join(' / ')}</span>
                      </li>
                    ))
                  )}
                </ul>

                <p className="mt-3 pt-3 border-t border-line text-sm text-ink/60">
                  <span className="font-medium text-ink">{p._count?.matriculas ?? 0}</span> estudiante(s) matriculado(s)
                </p>
              </Card>
            );
          })}
        </DataState>
      </div>
    </Layout>
  );
}
