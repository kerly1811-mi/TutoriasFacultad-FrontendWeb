import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { carrerasApi } from '../api/endpoints/carreras';
import { matriculasApi } from '../api/endpoints/matriculas';
import { paralelosApi } from '../api/endpoints/paralelos';
import { ABREV_DIA_CORTA, primerChoque, textoHorario } from '../lib/horario';
import { mensajeDeError } from '../lib/formato';
import {
  Alert,
  Badge,
  Buscador,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  PageHeader,
  Select,
  Table,
  normalizarBusqueda,
} from '../components/ui';

// Debe coincidir con MAX_MATERIAS_POR_ESTUDIANTE del backend (routes/matriculas.js).
const MAX_MATERIAS = 5;

const COLUMNAS = [
  { clave: 'materia', titulo: 'Materia · Paralelo' },
  { clave: 'nivel', titulo: 'Nivel' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'accion', titulo: '', className: 'text-right' },
];

/**
 * Automatrícula del estudiante: ve la oferta de paralelos (de cualquier nivel de la
 * carrera elegida) y se inscribe. Puede mezclar niveles; el sistema solo impide
 * pasar de 5 materias, repetir una materia o que se crucen los horarios.
 */
export default function Matricula() {
  const { mostrarToast } = useToast();
  const [filtros, setFiltros] = useState({ id_car: '', id_niv: '', busqueda: '' });
  const [inscribiendo, setInscribiendo] = useState(null); // id_par en curso
  const [aRetirar, setARetirar] = useState(null);
  const [retirando, setRetirando] = useState(false);

  const cargar = useCallback(async () => {
    const [carreras, paralelos, matriculas] = await Promise.all([
      carrerasApi.listar(),
      paralelosApi.listar({ conHorarios: 1 }),
      matriculasApi.listar(),
    ]);
    return { carreras, paralelos, matriculas };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar la oferta de materias.',
  });

  const carreras = useMemo(() => data?.carreras ?? [], [data]);
  const paralelos = useMemo(() => data?.paralelos ?? [], [data]);
  const matriculas = useMemo(() => data?.matriculas ?? [], [data]);
  const paraleloPorId = useMemo(() => new Map(paralelos.map((p) => [p.id_par, p])), [paralelos]);

  // Mis materias, con el horario completo del paralelo (viene en la oferta).
  const misMaterias = useMemo(
    () => matriculas.map((m) => ({ ...m, paralelo: paraleloPorId.get(m.id_par) || m.paralelo })),
    [matriculas, paraleloPorId]
  );

  // Carrera por defecto: la de la mayoría de mis materias; si no tengo, la primera.
  const idCarreraPorDefecto = useMemo(() => {
    const conteo = new Map();
    misMaterias.forEach((m) => {
      const id = m.paralelo?.nivel?.carrera?.id_car;
      if (id) conteo.set(id, (conteo.get(id) || 0) + 1);
    });
    const masComun = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return String(masComun ?? carreras[0]?.id_car ?? '');
  }, [misMaterias, carreras]);
  const idCarrera = filtros.id_car || idCarreraPorDefecto;
  const niveles = carreras.find((c) => String(c.id_car) === idCarrera)?.niveles ?? [];

  // Motivo por el que no puede inscribirse en un paralelo (o null si puede).
  const motivoBloqueo = useCallback(
    (p) => {
      if (misMaterias.some((m) => m.id_par === p.id_par)) return { texto: 'Inscrito', tipo: 'ok' };
      if (misMaterias.length >= MAX_MATERIAS) return { texto: `Límite de ${MAX_MATERIAS} materias` };
      const misma = misMaterias.find((m) => m.paralelo?.materia?.id_mat === p.materia?.id_mat);
      if (misma) return { texto: `Ya tienes esta materia (paralelo ${misma.paralelo.nom_par})` };
      for (const m of misMaterias) {
        const choque = primerChoque(p.horarios, m.paralelo?.horarios);
        if (choque) {
          return {
            texto: `Choca con ${m.paralelo.materia?.nom_mat} (${ABREV_DIA_CORTA[choque.dia_semana]} ${choque.hora_ini})`,
          };
        }
      }
      return null;
    },
    [misMaterias]
  );

  const oferta = useMemo(() => {
    const palabras = normalizarBusqueda(filtros.busqueda).split(/\s+/).filter(Boolean);
    return paralelos
      .filter((p) => String(p.nivel?.carrera?.id_car) === idCarrera)
      .filter((p) => !filtros.id_niv || String(p.nivel?.id_niv) === filtros.id_niv)
      .filter((p) => {
        if (!palabras.length) return true;
        const texto = normalizarBusqueda(
          `${p.materia?.nom_mat} paralelo ${p.nom_par} ${p.nivel?.nom_niv} ${p.docente?.nombres} ${p.docente?.apellidos}`
        );
        return palabras.every((x) => texto.includes(x));
      })
      .sort(
        (a, b) =>
          (a.nivel?.id_niv ?? 0) - (b.nivel?.id_niv ?? 0) ||
          a.materia.nom_mat.localeCompare(b.materia.nom_mat) ||
          a.nom_par.localeCompare(b.nom_par)
      );
  }, [paralelos, idCarrera, filtros.id_niv, filtros.busqueda]);

  async function inscribirme(p) {
    setInscribiendo(p.id_par);
    try {
      await matriculasApi.inscribirme(p.id_par);
      mostrarToast(`Te inscribiste en ${p.materia?.nom_mat} · Paralelo ${p.nom_par}.`, 'exito');
      await recargar();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo completar la inscripción.'), 'error');
    } finally {
      setInscribiendo(null);
    }
  }

  async function confirmarRetiro() {
    if (!aRetirar) return;
    setRetirando(true);
    try {
      await matriculasApi.retirarme(aRetirar.id_matricula);
      mostrarToast('Te retiraste de la materia.', 'exito');
      await recargar();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo retirar la materia.'), 'error');
    } finally {
      setRetirando(false);
      setARetirar(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Matrícula"
        descripcion={`Inscríbete hasta en ${MAX_MATERIAS} materias. Puedes combinar materias de distintos niveles siempre que sus horarios no se crucen.`}
      />

      {/* Mis materias */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg text-ink">Mis materias</h2>
          <span className="text-sm text-ink/50">
            {misMaterias.length} de {MAX_MATERIAS}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <DataState
            cargando={cargando}
            error={error}
            vacio={misMaterias.length === 0}
            mensajeVacio="Todavía no estás inscrito en ninguna materia. Elige tus paralelos en la oferta de abajo."
          >
            {misMaterias.map((m) => (
              <Card key={m.id_matricula} padding="p-4">
                <p className="font-medium text-ink">{m.paralelo?.materia?.nom_mat}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Paralelo {m.paralelo?.nom_par} · {m.paralelo?.nivel?.nom_niv} · {m.paralelo?.nivel?.carrera?.nom_car}
                </p>
                <p className="text-sm text-ink/70 mt-2">
                  {m.paralelo?.docente?.nombres} {m.paralelo?.docente?.apellidos}
                </p>
                <p className="text-xs text-ink/60 mt-1 tabular-nums">{textoHorario(m.paralelo?.horarios)}</p>
                <div className="mt-3 pt-3 border-t border-line flex justify-end">
                  <button onClick={() => setARetirar(m)} className="text-sm text-danger font-medium hover:underline">
                    Retirarme
                  </button>
                </div>
              </Card>
            ))}
          </DataState>
        </div>
      </section>

      {/* Oferta */}
      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Oferta de paralelos</h2>
        {misMaterias.length >= MAX_MATERIAS && !cargando && (
          <div className="mt-3">
            <Alert variant="info">
              Ya tienes {MAX_MATERIAS} materias. Para inscribirte en otra, primero retírate de una.
            </Alert>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <Select
            value={idCarrera}
            onChange={(e) => setFiltros((f) => ({ ...f, id_car: e.target.value, id_niv: '' }))}
          >
            {carreras.map((c) => (
              <option key={c.id_car} value={c.id_car}>
                {c.nom_car}
              </option>
            ))}
          </Select>
          <Select value={filtros.id_niv} onChange={(e) => setFiltros((f) => ({ ...f, id_niv: e.target.value }))}>
            <option value="">Todos los niveles</option>
            {niveles.map((n) => (
              <option key={n.id_niv} value={n.id_niv}>
                {n.nom_niv}
              </option>
            ))}
          </Select>
          <Buscador
            className="sm:col-span-2 lg:col-span-1"
            value={filtros.busqueda}
            onChange={(busqueda) => setFiltros((f) => ({ ...f, busqueda }))}
            placeholder="Buscar materia o docente…"
          />
        </div>

        <div className="mt-3">
          <Table
            columnas={COLUMNAS}
            datos={oferta}
            cargando={cargando}
            error={error}
            porPagina={10}
            mensajeVacio="No hay paralelos que coincidan con los filtros."
            renderFila={(p) => {
              const bloqueo = motivoBloqueo(p);
              return (
                <tr key={p.id_par} className="border-b border-line last:border-0 align-top">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{p.materia?.nom_mat}</p>
                    <Badge className="mt-1 bg-celeste/10 text-celeste-dark">Paralelo {p.nom_par}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink/70 whitespace-nowrap">{p.nivel?.nom_niv}</td>
                  <td className="px-5 py-3 text-ink/70">
                    {p.docente?.nombres} {p.docente?.apellidos}
                  </td>
                  <td className="px-5 py-3 text-xs text-ink/60 tabular-nums max-w-72">{textoHorario(p.horarios)}</td>
                  <td className="px-5 py-3 text-right">
                    {bloqueo ? (
                      <span
                        className={`inline-block text-xs max-w-48 text-right ${
                          bloqueo.tipo === 'ok' ? 'text-success font-medium' : 'text-ink/50'
                        }`}
                      >
                        {bloqueo.texto}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => inscribirme(p)}
                        cargando={inscribiendo === p.id_par}
                        textoCargando="Inscribiendo…"
                        disabled={Boolean(inscribiendo)}
                      >
                        Inscribirme
                      </Button>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        </div>
      </section>

      <ConfirmDialog
        abierto={Boolean(aRetirar)}
        titulo="Retirarme de la materia"
        mensaje={
          aRetirar
            ? `¿Retirarte de "${aRetirar.paralelo?.materia?.nom_mat} · Paralelo ${aRetirar.paralelo?.nom_par}"? Dejarás de ver sus clases y tutorías.`
            : ''
        }
        textoConfirmar="Retirarme"
        textoCargando="Retirando…"
        cargando={retirando}
        onConfirmar={confirmarRetiro}
        onCancelar={() => setARetirar(null)}
      />
    </Layout>
  );
}
