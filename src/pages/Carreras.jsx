import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { carrerasApi } from '../api/endpoints/carreras';
import { nivelesApi } from '../api/endpoints/niveles';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, SkeletonCards } from '../components/ui';

export default function Carreras() {
  const { mostrarToast } = useToast();
  const [modalCarrera, setModalCarrera] = useState(false);
  const [modalNivel, setModalNivel] = useState(null); // null | { carrera }
  const [aEliminarCarrera, setAEliminarCarrera] = useState(null);
  const [aEliminarNivel, setAEliminarNivel] = useState(null); // { id_niv, nom_niv, carrera }
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(() => carrerasApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las carreras.',
  });
  const carreras = data ?? [];

  async function confirmarEliminarCarrera() {
    if (!aEliminarCarrera) return;
    setEliminando(true);
    try {
      await carrerasApi.eliminar(aEliminarCarrera.id_car);
      recargar();
      mostrarToast(`Carrera "${aEliminarCarrera.nom_car}" eliminada.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la carrera.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminarCarrera(null);
    }
  }

  async function confirmarEliminarNivel() {
    if (!aEliminarNivel) return;
    setEliminando(true);
    try {
      await nivelesApi.eliminar(aEliminarNivel.id_niv);
      recargar();
      mostrarToast(`Nivel "${aEliminarNivel.nom_niv}" eliminado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el nivel.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminarNivel(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Carreras"
        descripcion="Carreras de la facultad y sus niveles (semestres)."
      >
        <Button onClick={() => setModalCarrera(true)}>Nueva carrera</Button>
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={carreras.length === 0}
          skeleton={<SkeletonCards count={4} />}
          mensajeVacio="Aún no hay carreras registradas."
        >
          {carreras.map((car) => (
            <Card key={car.id_car}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-ink">{car.nom_car}</p>
                <button
                  onClick={() => setAEliminarCarrera(car)}
                  className="text-sm text-danger font-medium hover:underline shrink-0"
                >
                  Eliminar
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Niveles</p>
                {car.niveles.length === 0 ? (
                  <p className="text-sm text-ink/50">Sin niveles todavía.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {car.niveles.map((niv) => (
                      <span
                        key={niv.id_niv}
                        className="inline-flex items-center gap-1.5 rounded-full bg-celeste/10 text-celeste-dark text-xs font-medium pl-3 pr-2 py-1"
                      >
                        {niv.nom_niv}
                        <button
                          onClick={() => setAEliminarNivel({ ...niv, carrera: car })}
                          aria-label={`Eliminar nivel ${niv.nom_niv}`}
                          className="text-celeste-dark/60 hover:text-danger leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setModalNivel({ carrera: car })}
                  className="mt-3 text-sm text-azul font-medium hover:underline"
                >
                  + Agregar nivel
                </button>
              </div>
            </Card>
          ))}
        </DataState>
      </div>

      <Modal abierto={modalCarrera} onCerrar={() => setModalCarrera(false)} titulo="Nueva carrera">
        <FormularioCarrera
          onCancelar={() => setModalCarrera(false)}
          onListo={() => {
            setModalCarrera(false);
            recargar();
          }}
        />
      </Modal>

      <Modal
        abierto={Boolean(modalNivel)}
        onCerrar={() => setModalNivel(null)}
        titulo={modalNivel ? `Nuevo nivel en ${modalNivel.carrera.nom_car}` : ''}
      >
        {modalNivel && (
          <FormularioNivel
            carrera={modalNivel.carrera}
            onCancelar={() => setModalNivel(null)}
            onListo={() => {
              setModalNivel(null);
              recargar();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        abierto={Boolean(aEliminarCarrera)}
        titulo="Eliminar carrera"
        mensaje={
          aEliminarCarrera
            ? `¿Eliminar "${aEliminarCarrera.nom_car}"? Debe no tener niveles asociados.`
            : ''
        }
        textoConfirmar="Eliminar"
        textoCargando="Eliminando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminarCarrera}
        onCancelar={() => setAEliminarCarrera(null)}
      />

      <ConfirmDialog
        abierto={Boolean(aEliminarNivel)}
        titulo="Eliminar nivel"
        mensaje={
          aEliminarNivel
            ? `¿Eliminar "${aEliminarNivel.nom_niv}" de ${aEliminarNivel.carrera.nom_car}? Debe no tener paralelos asociados.`
            : ''
        }
        textoConfirmar="Eliminar"
        textoCargando="Eliminando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminarNivel}
        onCancelar={() => setAEliminarNivel(null)}
      />
    </Layout>
  );
}

function FormularioCarrera({ onCancelar, onListo }) {
  const { valores, handleChange } = useForm({ nom_car: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await carrerasApi.crear(valores);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la carrera.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Input
        label="Nombre de la carrera"
        name="nom_car"
        required
        value={valores.nom_car}
        onChange={handleChange}
        placeholder="Ingeniería en Sistemas"
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

function FormularioNivel({ carrera, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({ nom_niv: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await nivelesApi.crear({ nom_niv: valores.nom_niv, id_car: carrera.id_car });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear el nivel.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Input
        label="Nombre del nivel"
        name="nom_niv"
        required
        value={valores.nom_niv}
        onChange={handleChange}
        placeholder="Sexto semestre"
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
