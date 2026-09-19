import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { matriculasApi } from '../api/endpoints/matriculas';
import { paralelosApi } from '../api/endpoints/paralelos';
import { usuariosApi } from '../api/endpoints/usuarios';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, ConfirmDialog, Modal, PageHeader, Select, Table } from '../components/ui';
import { ETIQUETA_CAMPO } from '../components/ui/estilos';

const COLUMNAS = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'paralelo', titulo: 'Materia · Paralelo' },
  { clave: 'nivel', titulo: 'Nivel / Carrera' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

function etiquetaParalelo(p) {
  if (!p) return '—';
  return `${p.materia?.nom_mat || ''} · Paralelo ${p.nom_par}`;
}

export default function Matriculas() {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    const [matriculas, paralelos, estudiantes] = await Promise.all([
      matriculasApi.listar(),
      paralelosApi.listar(),
      usuariosApi.listar('ESTUDIANTE'),
    ]);
    return { matriculas, paralelos, estudiantes };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las matrículas.',
  });

  const matriculas = data?.matriculas ?? [];
  const paralelos = data?.paralelos ?? [];
  const estudiantes = data?.estudiantes ?? [];
  const puedeMatricular = paralelos.length > 0 && estudiantes.length > 0;

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await matriculasApi.eliminar(aEliminar.id_matricula);
      recargar();
      mostrarToast('Matrícula eliminada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la matrícula.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Layout>
      <PageHeader titulo="Matrículas" descripcion="Matricula estudiantes en un paralelo.">
        <Button onClick={() => setModalAbierto(true)} disabled={!puedeMatricular}>
          Nueva matrícula
        </Button>
      </PageHeader>

      {!cargando && !puedeMatricular && (
        <div className="mt-4">
          <Alert>
            {paralelos.length === 0
              ? 'No hay paralelos registrados todavía. Crea uno en "Paralelos" antes de matricular.'
              : 'No hay estudiantes registrados todavía.'}
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={matriculas}
          cargando={cargando}
          error={error}
          mensajeVacio="Aún no hay matrículas registradas."
          renderFila={(m) => (
            <tr key={m.id_matricula} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                {m.estudiante ? `${m.estudiante.nombres} ${m.estudiante.apellidos}` : '—'}
              </td>
              <td className="px-5 py-3 text-ink/70">{m.estudiante?.cedula || '—'}</td>
              <td className="px-5 py-3">{etiquetaParalelo(m.paralelo)}</td>
              <td className="px-5 py-3 text-ink/70">
                {m.paralelo?.nivel?.nom_niv} · {m.paralelo?.nivel?.carrera?.nom_car}
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => setAEliminar(m)}
                  className="text-sm text-danger font-medium hover:underline"
                >
                  Quitar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nueva matrícula">
        <FormularioMatricula
          paralelos={paralelos}
          estudiantes={estudiantes}
          onCancelar={() => setModalAbierto(false)}
          onListo={() => {
            setModalAbierto(false);
            recargar();
          }}
        />
      </Modal>

      <ConfirmDialog
        abierto={Boolean(aEliminar)}
        titulo="Quitar matrícula"
        mensaje={
          aEliminar
            ? `¿Quitar a "${aEliminar.estudiante?.nombres} ${aEliminar.estudiante?.apellidos}" de "${etiquetaParalelo(aEliminar.paralelo)}"?`
            : ''
        }
        textoConfirmar="Quitar"
        textoCargando="Quitando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </Layout>
  );
}

function FormularioMatricula({ paralelos, estudiantes, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_est: '',
    id_par: paralelos[0] ? String(paralelos[0].id_par) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.id_est) return setError('Selecciona un estudiante de la lista.');
    setEnviando(true);
    try {
      await matriculasApi.crear({ id_est: Number(valores.id_est), id_par: Number(valores.id_par) });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo matricular al estudiante.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <SelectorEstudianteBuscable
        estudiantes={estudiantes}
        value={valores.id_est}
        onChange={(id) => setCampo('id_est', id)}
      />
      <Select label="Paralelo" name="id_par" required value={valores.id_par} onChange={handleChange}>
        {paralelos.map((p) => (
          <option key={p.id_par} value={p.id_par}>
            {etiquetaParalelo(p)} · {p.nivel?.nom_niv} ({p.nivel?.carrera?.nom_car})
          </option>
        ))}
      </Select>

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Matriculando…">
          Matricular
        </Button>
      </div>
    </form>
  );
}

// Combo de estudiante con búsqueda: se escribe nombre o cédula y filtra la
// lista en vez de desplazarse por un <select> con decenas de estudiantes.
// El texto que se escribe (`query`) es independiente de la etiqueta del
// estudiante ya elegido: al enfocar, siempre arranca vacío mostrando la
// lista completa, en vez de "filtrarse" contra el nombre ya seleccionado.
function SelectorEstudianteBuscable({ estudiantes, value, onChange }) {
  const seleccionado = estudiantes.find((e) => String(e.id_usr) === String(value));
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    function alClicFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  const q = query.trim().toLowerCase();
  const filtrados = q
    ? estudiantes.filter((e) => `${e.nombres} ${e.apellidos} ${e.cedula}`.toLowerCase().includes(q))
    : estudiantes;

  function elegir(e) {
    onChange(String(e.id_usr));
    setQuery('');
    setAbierto(false);
  }

  const valorMostrado = abierto
    ? query
    : seleccionado
    ? `${seleccionado.nombres} ${seleccionado.apellidos} · ${seleccionado.cedula}`
    : '';

  return (
    <div className="relative" ref={contenedorRef}>
      <label className={ETIQUETA_CAMPO}>Estudiante</label>
      <input
        type="text"
        value={valorMostrado}
        onFocus={() => {
          setQuery('');
          setAbierto(true);
        }}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Escribe nombre o cédula…"
        className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/40 focus:border-azul"
      />
      {abierto && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-line bg-white shadow-lg">
          {filtrados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink/50">Ningún estudiante coincide.</li>
          ) : (
            filtrados.map((e) => (
              <li key={e.id_usr}>
                <button
                  type="button"
                  onClick={() => elegir(e)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-paper/60 transition-colors ${
                    String(e.id_usr) === String(value) ? 'bg-celeste/10 text-celeste-dark font-medium' : ''
                  }`}
                >
                  {e.nombres} {e.apellidos} <span className="text-ink/50">· {e.cedula}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
