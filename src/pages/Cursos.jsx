import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { cursosApi } from '../api/endpoints/cursos';
import { usuariosApi } from '../api/endpoints/usuarios';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, ConfirmDialog, Input, Modal, PageHeader, Select, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'curso', titulo: 'Curso' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function Cursos() {
  const { mostrarToast } = useToast();
  const [modal, setModal] = useState(null); // null | { curso? }
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    const [cursos, docentes] = await Promise.all([cursosApi.listar(), usuariosApi.listar('DOCENTE')]);
    return { cursos, docentes };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los cursos.',
  });

  const cursos = data?.cursos ?? [];
  const docentes = data?.docentes ?? [];

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await cursosApi.eliminar(aEliminar.id_cur);
      recargar();
      mostrarToast(`Curso "${aEliminar.nom_cur}" eliminado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el curso.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Layout>
      <PageHeader titulo="Cursos" descripcion="Crea cursos y asígnales un docente.">
        <Button onClick={() => setModal({})} disabled={docentes.length === 0}>
          Nuevo curso
        </Button>
      </PageHeader>

      {!cargando && docentes.length === 0 && (
        <div className="mt-4">
          <Alert>No hay docentes registrados todavía. Da de alta uno en "Usuarios" antes de crear un curso.</Alert>
        </div>
      )}

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={cursos}
          cargando={cargando}
          error={error}
          mensajeVacio="Aún no hay cursos registrados."
          renderFila={(c) => (
            <tr key={c.id_cur} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium text-ink">{c.nom_cur}</td>
              <td className="px-5 py-3 text-ink/70">
                {c.docente ? `${c.docente.nombres} ${c.docente.apellidos}` : '—'}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => setModal({ curso: c })}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => setAEliminar(c)}
                  className="ml-4 text-sm text-danger font-medium hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal abierto={Boolean(modal)} onCerrar={() => setModal(null)} titulo={modal?.curso ? 'Editar curso' : 'Nuevo curso'}>
        {modal && (
          <FormularioCurso
            curso={modal.curso}
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
        titulo="Eliminar curso"
        mensaje={
          aEliminar
            ? `¿Eliminar "${aEliminar.nom_cur}"? Los estudiantes matriculados perderán acceso a sus tutorías.`
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

function FormularioCurso({ curso, docentes, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
    nom_cur: curso?.nom_cur || '',
    id_doc: curso?.id_doc ? String(curso.id_doc) : docentes[0] ? String(docentes[0].id_usr) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const payload = { nom_cur: valores.nom_cur, id_doc: Number(valores.id_doc) };
    try {
      if (curso) await cursosApi.actualizar(curso.id_cur, payload);
      else await cursosApi.crear(payload);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el curso.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Input
        label="Nombre del curso"
        name="nom_cur"
        required
        value={valores.nom_cur}
        onChange={handleChange}
        placeholder="Física B"
      />
      <Select label="Docente" name="id_doc" required value={valores.id_doc} onChange={handleChange}>
        {docentes.map((d) => (
          <option key={d.id_usr} value={d.id_usr}>
            {d.nombres} {d.apellidos}
          </option>
        ))}
      </Select>

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
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
