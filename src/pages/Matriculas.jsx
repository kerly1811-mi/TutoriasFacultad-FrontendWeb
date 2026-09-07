import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { matriculasApi } from '../api/endpoints/matriculas';
import { cursosApi } from '../api/endpoints/cursos';
import { usuariosApi } from '../api/endpoints/usuarios';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, ConfirmDialog, Modal, PageHeader, Select, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'curso', titulo: 'Curso' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function Matriculas() {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    const [matriculas, cursos, estudiantes] = await Promise.all([
      matriculasApi.listar(),
      cursosApi.listar(),
      usuariosApi.listar('ESTUDIANTE'),
    ]);
    return { matriculas, cursos, estudiantes };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las matrículas.',
  });

  const matriculas = data?.matriculas ?? [];
  const cursos = data?.cursos ?? [];
  const estudiantes = data?.estudiantes ?? [];
  const puedeMatricular = cursos.length > 0 && estudiantes.length > 0;

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
      <PageHeader titulo="Matrículas" descripcion="Matricula estudiantes en un curso.">
        <Button onClick={() => setModalAbierto(true)} disabled={!puedeMatricular}>
          Nueva matrícula
        </Button>
      </PageHeader>

      {!cargando && !puedeMatricular && (
        <div className="mt-4">
          <Alert>
            {cursos.length === 0
              ? 'No hay cursos registrados todavía. Crea uno en "Cursos" antes de matricular.'
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
              <td className="px-5 py-3">{m.curso?.nom_cur || '—'}</td>
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
          cursos={cursos}
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
            ? `¿Quitar a "${aEliminar.estudiante?.nombres} ${aEliminar.estudiante?.apellidos}" del curso "${aEliminar.curso?.nom_cur}"?`
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

function FormularioMatricula({ cursos, estudiantes, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
    id_est: estudiantes[0] ? String(estudiantes[0].id_usr) : '',
    id_cur: cursos[0] ? String(cursos[0].id_cur) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await matriculasApi.crear({ id_est: Number(valores.id_est), id_cur: Number(valores.id_cur) });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo matricular al estudiante.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Select label="Estudiante" name="id_est" required value={valores.id_est} onChange={handleChange}>
        {estudiantes.map((e) => (
          <option key={e.id_usr} value={e.id_usr}>
            {e.nombres} {e.apellidos} · {e.cedula}
          </option>
        ))}
      </Select>
      <Select label="Curso" name="id_cur" required value={valores.id_cur} onChange={handleChange}>
        {cursos.map((c) => (
          <option key={c.id_cur} value={c.id_cur}>
            {c.nom_cur}
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
