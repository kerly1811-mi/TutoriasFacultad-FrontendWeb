import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { paralelosApi } from '../api/endpoints/paralelos';
import { materiasApi } from '../api/endpoints/materias';
import { carrerasApi } from '../api/endpoints/carreras';
import { usuariosApi } from '../api/endpoints/usuarios';
import { mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, ConfirmDialog, Input, Modal, PageHeader, Select, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'materia', titulo: 'Materia · Paralelo' },
  { clave: 'nivel', titulo: 'Nivel / Carrera' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

function inicialesDe(nombre) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Paralelos() {
  const { mostrarToast } = useToast();
  const [modal, setModal] = useState(null); // null | { paralelo? }
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    const [paralelos, materias, carreras, docentes] = await Promise.all([
      paralelosApi.listar(),
      materiasApi.listar(),
      carrerasApi.listar(),
      usuariosApi.listar({ rol: 'DOCENTE' }),
    ]);
    return { paralelos, materias, carreras, docentes };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los paralelos.',
  });

  const paralelos = data?.paralelos ?? [];
  const materias = data?.materias ?? [];
  const carreras = data?.carreras ?? [];
  const docentes = data?.docentes ?? [];
  const puedeCrear = materias.length > 0 && carreras.some((c) => c.niveles.length > 0) && docentes.length > 0;

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await paralelosApi.eliminar(aEliminar.id_par);
      recargar();
      mostrarToast('Paralelo eliminado.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el paralelo.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Paralelos"
        descripcion="La materia dictada en un nivel concreto por un docente concreto. Es lo que ven los estudiantes matriculados."
      >
        <Button onClick={() => setModal({})} disabled={!puedeCrear}>
          Nuevo paralelo
        </Button>
      </PageHeader>

      {!cargando && !puedeCrear && (
        <div className="mt-4">
          <Alert>
            Necesitas al menos una materia, una carrera con un nivel, y un docente registrados antes de crear un
            paralelo.
          </Alert>
        </div>
      )}

      {!cargando && paralelos.length > 0 && (
        <p className="mt-4 text-sm text-ink/50">{paralelos.length} paralelo(s) registrados en total.</p>
      )}

      <div className="mt-4">
        <Table
          columnas={COLUMNAS}
          datos={paralelos}
          cargando={cargando}
          error={error}
          mensajeVacio="Aún no hay paralelos registrados."
          renderFila={(p) => (
            <tr key={p.id_par} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                <p className="font-medium text-ink">{p.materia?.nom_mat}</p>
                <Badge className="mt-1 bg-celeste/10 text-celeste-dark">Paralelo {p.nom_par}</Badge>
              </td>
              <td className="px-5 py-3 text-ink/70">
                <p className="text-ink">{p.nivel?.nom_niv}</p>
                <p className="text-xs text-ink/50">{p.nivel?.carrera?.nom_car}</p>
              </td>
              <td className="px-5 py-3">
                {p.docente ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-azul/10 text-azul-dark text-xs font-semibold shrink-0">
                      {inicialesDe(`${p.docente.nombres} ${p.docente.apellidos}`)}
                    </span>
                    <span className="text-ink/70">
                      {p.docente.nombres} {p.docente.apellidos}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink/50">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => setModal({ paralelo: p })}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => setAEliminar(p)}
                  className="ml-4 text-sm text-danger font-medium hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal
        abierto={Boolean(modal)}
        onCerrar={() => setModal(null)}
        titulo={modal?.paralelo ? 'Editar paralelo' : 'Nuevo paralelo'}
      >
        {modal && (
          <FormularioParalelo
            paralelo={modal.paralelo}
            materias={materias}
            carreras={carreras}
            docentes={docentes}
            onCancelar={() => setModal(null)}
            onListo={() => {
              setModal(null);
              recargar();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        abierto={Boolean(aEliminar)}
        titulo="Eliminar paralelo"
        mensaje={
          aEliminar
            ? `¿Eliminar "${aEliminar.materia?.nom_mat} · Paralelo ${aEliminar.nom_par}"? Debe no tener matrículas ni tutorías asociadas.`
            : ''
        }
        textoConfirmar="Eliminar"
        textoCargando="Eliminando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </Layout>
  );
}

function FormularioParalelo({ paralelo, materias, carreras, docentes, onCancelar, onListo }) {
  // Carrera/nivel inicial: si estamos editando, se deducen del paralelo; si no, la primera carrera con niveles.
  const idCarreraInicial = paralelo?.nivel?.carrera?.id_car
    ? String(paralelo.nivel.carrera.id_car)
    : carreras.find((c) => c.niveles.length > 0)
    ? String(carreras.find((c) => c.niveles.length > 0).id_car)
    : '';
  const nivelesDeCarreraInicial = carreras.find((c) => String(c.id_car) === idCarreraInicial)?.niveles ?? [];
  const idNivelInicial = paralelo?.nivel?.id_niv
    ? String(paralelo.nivel.id_niv)
    : nivelesDeCarreraInicial[0]
    ? String(nivelesDeCarreraInicial[0].id_niv)
    : '';

  const { valores, handleChange, setValores } = useForm({
    nom_par: paralelo?.nom_par || '',
    id_mat: paralelo?.materia?.id_mat ? String(paralelo.materia.id_mat) : materias[0] ? String(materias[0].id_mat) : '',
    id_car: idCarreraInicial,
    id_niv: idNivelInicial,
    id_doc: paralelo?.docente?.id_usr ? String(paralelo.docente.id_usr) : docentes[0] ? String(docentes[0].id_usr) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const nivelesDisponibles = useMemo(
    () => carreras.find((c) => String(c.id_car) === valores.id_car)?.niveles ?? [],
    [carreras, valores.id_car]
  );

  function manejarCambioCarrera(e) {
    const nuevaCarrera = e.target.value;
    const niveles = carreras.find((c) => String(c.id_car) === nuevaCarrera)?.niveles ?? [];
    setValores((v) => ({ ...v, id_car: nuevaCarrera, id_niv: niveles[0] ? String(niveles[0].id_niv) : '' }));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!valores.id_niv) {
      setError('Esa carrera todavía no tiene niveles. Crea uno en "Carreras" primero.');
      return;
    }
    setEnviando(true);
    setError(null);
    const payload = {
      nom_par: valores.nom_par,
      id_mat: Number(valores.id_mat),
      id_niv: Number(valores.id_niv),
      id_doc: Number(valores.id_doc),
    };
    try {
      if (paralelo) await paralelosApi.actualizar(paralelo.id_par, payload);
      else await paralelosApi.crear(payload);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el paralelo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Select label="Materia" name="id_mat" required value={valores.id_mat} onChange={handleChange}>
          {materias.map((m) => (
            <option key={m.id_mat} value={m.id_mat}>
              {m.nom_mat}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Paralelo"
        name="nom_par"
        required
        value={valores.nom_par}
        onChange={handleChange}
        placeholder="A"
      />

      <Select label="Docente" name="id_doc" required value={valores.id_doc} onChange={handleChange}>
        {docentes.map((d) => (
          <option key={d.id_usr} value={d.id_usr}>
            {d.nombres} {d.apellidos}
          </option>
        ))}
      </Select>

      <Select label="Carrera" name="id_car" required value={valores.id_car} onChange={manejarCambioCarrera}>
        {carreras.map((c) => (
          <option key={c.id_car} value={c.id_car}>
            {c.nom_car}
          </option>
        ))}
      </Select>

      <Select label="Nivel" name="id_niv" required value={valores.id_niv} onChange={handleChange}>
        {nivelesDisponibles.length === 0 && <option value="">Sin niveles</option>}
        {nivelesDisponibles.map((n) => (
          <option key={n.id_niv} value={n.id_niv}>
            {n.nom_niv}
          </option>
        ))}
      </Select>

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Guardando…">
          Guardar
        </Button>
      </div>
    </form>
  );
}
