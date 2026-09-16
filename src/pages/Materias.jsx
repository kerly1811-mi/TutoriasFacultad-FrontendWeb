import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { materiasApi } from '../api/endpoints/materias';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, SkeletonCards } from '../components/ui';

function IconoMateria() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6.5a2.5 2.5 0 0 0 0 5H19" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}

export default function Materias() {
  const { mostrarToast } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null); // null | { materia? }
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(() => materiasApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las materias.',
  });
  const materias = data ?? [];

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter((m) => m.nom_mat.toLowerCase().includes(q));
  }, [materias, busqueda]);

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

      <div className="mt-6 flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar materia…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64"
        />
        <p className="text-sm text-ink/50 shrink-0">{materias.length} materia(s) en total</p>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={filtradas.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio={busqueda ? 'Ninguna materia coincide con la búsqueda.' : 'Aún no hay materias registradas.'}
        >
          {filtradas.map((m) => (
            <Card key={m.id_mat} padding="p-4">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-celeste/10 text-celeste-dark shrink-0">
                  <IconoMateria />
                </span>
                <p className="font-display text-base text-ink mt-1.5 min-w-0 flex-1 truncate">{m.nom_mat}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-line flex justify-end gap-4">
                <button
                  onClick={() => setModal({ materia: m })}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => setAEliminar(m)}
                  className="text-sm text-danger font-medium hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </DataState>
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
