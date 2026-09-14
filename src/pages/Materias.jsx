import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { materiasApi } from '../api/endpoints/materias';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, ConfirmDialog, Input, Modal, PageHeader, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'materia', titulo: 'Materia' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function Materias() {
  const { mostrarToast } = useToast();
  const [modal, setModal] = useState(null); // null | { materia? }
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(() => materiasApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las materias.',
  });
  const materias = data ?? [];

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await materiasApi.eliminar(aEliminar.id_mat);
      recargar();
      mostrarToast(`Materia "${aEliminar.nom_mat}" eliminada.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la materia.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Materias"
        descripcion="Materias de la facultad. Una misma materia puede dictarse en varias carreras y niveles como distintos paralelos."
      >
        <Button onClick={() => setModal({})}>Nueva materia</Button>
      </PageHeader>

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={materias}
          cargando={cargando}
          error={error}
          mensajeVacio="Aún no hay materias registradas."
          renderFila={(m) => (
            <tr key={m.id_mat} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium text-ink">{m.nom_mat}</td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => setModal({ materia: m })}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => setAEliminar(m)}
                  className="ml-4 text-sm text-danger font-medium hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal abierto={Boolean(modal)} onCerrar={() => setModal(null)} titulo={modal?.materia ? 'Editar materia' : 'Nueva materia'}>
        {modal && (
          <FormularioMateria
            materia={modal.materia}
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
        titulo="Eliminar materia"
        mensaje={aEliminar ? `¿Eliminar "${aEliminar.nom_mat}"? Debe no tener paralelos asociados.` : ''}
        textoConfirmar="Eliminar"
        textoCargando="Eliminando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </Layout>
  );
}

function FormularioMateria({ materia, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({ nom_mat: materia?.nom_mat || '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (materia) await materiasApi.actualizar(materia.id_mat, valores);
      else await materiasApi.crear(valores);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la materia.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Input
        label="Nombre de la materia"
        name="nom_mat"
        required
        value={valores.nom_mat}
        onChange={handleChange}
        placeholder="Física B"
      />
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
