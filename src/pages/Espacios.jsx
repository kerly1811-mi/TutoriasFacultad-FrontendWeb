import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { espaciosApi } from '../api/endpoints/espacios';
import {
  ETIQUETA_ESTADO_ESPACIO,
  ETIQUETA_TIPO_ESPACIO,
  ESTILO_ESTADO_ESPACIO,
  OPCIONES_ESTADO_ESPACIO,
  OPCIONES_TIPO_ESPACIO,
} from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, Card, DataState, Input, Modal, PageHeader, Select, SkeletonCards } from '../components/ui';

export default function Espacios() {
  const [modal, setModal] = useState(null); // null | { espacio? }
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(() => espaciosApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los espacios.',
  });
  const espacios = data ?? [];

  async function eliminar(esp) {
    if (!window.confirm(`¿Eliminar "${esp.nom_esp}"?`)) return;
    setErrorAccion(null);
    try {
      await espaciosApi.eliminar(esp.id_esp);
      recargar();
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo eliminar el espacio.'));
    }
  }

  async function alternarMantenimiento(esp) {
    setErrorAccion(null);
    const nuevo = esp.estado === 'MANTENIMIENTO' ? 'DISPONIBLE' : 'MANTENIMIENTO';
    try {
      await espaciosApi.actualizar(esp.id_esp, { estado: nuevo });
      recargar();
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo cambiar el estado.'));
    }
  }

  return (
    <Layout>
      <PageHeader titulo="Espacios" descripcion="Aulas y laboratorios del edificio de la FISEI.">
        <Button onClick={() => setModal({})}>Nuevo espacio</Button>
      </PageHeader>

      {errorAccion && (
        <div className="mt-4">
          <Alert>{errorAccion}</Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={espacios.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="Aún no hay espacios registrados."
        >
          {espacios.map((esp) => (
            <Card key={esp.id_esp}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                  {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                </span>
                <Badge className={ESTILO_ESTADO_ESPACIO[esp.estado] || ''}>
                  {ETIQUETA_ESTADO_ESPACIO[esp.estado] || esp.estado}
                </Badge>
              </div>
              <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
              <p className="text-sm text-ink/60 mt-1">{esp.ubicacion || 'Ubicación no especificada'}</p>
              <p className="text-sm text-ink/60 mt-3 pt-3 border-t border-line">
                Capacidad: <span className="font-medium text-ink">{esp.capacidad}</span> personas
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <button onClick={() => setModal({ espacio: esp })} className="text-azul font-medium hover:underline">
                  Editar
                </button>
                <button onClick={() => alternarMantenimiento(esp)} className="text-ink/70 font-medium hover:underline">
                  {esp.estado === 'MANTENIMIENTO' ? 'Marcar disponible' : 'Poner en mantenimiento'}
                </button>
                <button onClick={() => eliminar(esp)} className="text-danger font-medium hover:underline">
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </DataState>
      </div>

      <Modal
        abierto={Boolean(modal)}
        onCerrar={() => setModal(null)}
        titulo={modal?.espacio ? 'Editar espacio' : 'Nuevo espacio'}
      >
        {modal && (
          <FormularioEspacio
            espacio={modal.espacio}
            onCancelar={() => setModal(null)}
            onListo={() => {
              setModal(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </Layout>
  );
}

function FormularioEspacio({ espacio, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
    nom_esp: espacio?.nom_esp || '',
    tipo: espacio?.tipo || 'AULA',
    capacidad: espacio?.capacidad ? String(espacio.capacidad) : '',
    ubicacion: espacio?.ubicacion || '',
    estado: espacio?.estado || 'DISPONIBLE',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const payload = { ...valores, capacidad: Number(valores.capacidad) };
    try {
      if (espacio) await espaciosApi.actualizar(espacio.id_esp, payload);
      else await espaciosApi.crear(payload);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el espacio.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Input
          label="Nombre del espacio"
          name="nom_esp"
          required
          value={valores.nom_esp}
          onChange={handleChange}
          placeholder="Laboratorio de Redes"
        />
      </div>
      <Select label="Tipo" name="tipo" value={valores.tipo} onChange={handleChange} options={OPCIONES_TIPO_ESPACIO} />
      <Input
        label="Capacidad"
        type="number"
        name="capacidad"
        min="1"
        required
        value={valores.capacidad}
        onChange={handleChange}
      />
      <div className="col-span-2">
        <Input
          label="Ubicación"
          name="ubicacion"
          value={valores.ubicacion}
          onChange={handleChange}
          placeholder="Bloque B - Piso 1"
        />
      </div>
      <Select
        label="Estado"
        name="estado"
        value={valores.estado}
        onChange={handleChange}
        options={OPCIONES_ESTADO_ESPACIO}
      />

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
