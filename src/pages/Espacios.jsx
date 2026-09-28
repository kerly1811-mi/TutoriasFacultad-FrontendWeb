import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { usePaginacion } from '../hooks/usePaginacion';
import { useForm } from '../hooks/useForm';
import { espaciosApi } from '../api/endpoints/espacios';
import {
  ETIQUETA_ESTADO_ACTIVO,
  ETIQUETA_ESTADO_ESPACIO,
  ETIQUETA_TIPO_ESPACIO,
  ESTILO_ESTADO_ACTIVO,
  ESTILO_ESTADO_ESPACIO,
  OPCIONES_BLOQUE,
  OPCIONES_ESTADO_ESPACIO,
  OPCIONES_TIPO_ESPACIO,
  opcionesPisoPara,
  ubicacionEspacio,
} from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import {
  Alert,
  Badge,
  Buscador,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  Input,
  Modal,
  PageHeader,
  Paginacion,
  Select,
  SkeletonCards,
  normalizarBusqueda,
} from '../components/ui';

const FILTROS_INICIALES = { busqueda: '', tipo: '', bloque: '', piso: '' };

export default function Espacios() {
  const { mostrarToast } = useToast();
  const [modal, setModal] = useState(null); // null | { espacio? }
  const [aDeshabilitar, setADeshabilitar] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const cargar = useCallback(() => espaciosApi.listar({ incluirInactivos: true }), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los espacios.',
  });
  const espacios = data ?? [];

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const hayFiltros = Object.values(filtros).some(Boolean);
  const cambiarFiltro = (campo) => (e) => {
    const valor = e.target.value;
    // Al cambiar de bloque, el piso elegido puede no existir en el nuevo bloque.
    setFiltros((f) => ({ ...f, [campo]: valor, ...(campo === 'bloque' ? { piso: '' } : {}) }));
  };

  // Pisos del bloque elegido; sin bloque, los pisos que realmente tienen espacios.
  const opcionesPiso = useMemo(() => {
    if (filtros.bloque) return opcionesPisoPara(filtros.bloque);
    const pisos = [...new Set(espacios.map((e) => e.piso).filter(Boolean))];
    return pisos.sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).map((p) => ({ value: p, label: p }));
  }, [filtros.bloque, espacios]);

  const espaciosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(filtros.busqueda);
    return espacios.filter(
      (e) =>
        (!q || normalizarBusqueda(e.nom_esp).includes(q)) &&
        (!filtros.tipo || e.tipo === filtros.tipo) &&
        (!filtros.bloque || e.bloque === filtros.bloque) &&
        (!filtros.piso || e.piso === filtros.piso)
    );
  }, [espacios, filtros]);
  const paginacion = usePaginacion(espaciosFiltrados, 12);

  async function confirmarDeshabilitar() {
    if (!aDeshabilitar) return;
    setCambiandoEstado(true);
    try {
      await espaciosApi.cambiarEstado(aDeshabilitar.id_esp, false);
      recargar();
      mostrarToast(`Espacio "${aDeshabilitar.nom_esp}" deshabilitado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo deshabilitar el espacio.'), 'error');
    } finally {
      setCambiandoEstado(false);
      setADeshabilitar(null);
    }
  }

  async function habilitar(esp) {
    try {
      await espaciosApi.cambiarEstado(esp.id_esp, true);
      recargar();
      mostrarToast(`Espacio "${esp.nom_esp}" habilitado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo habilitar el espacio.'), 'error');
    }
  }

  async function alternarMantenimiento(esp) {
    const nuevo = esp.estado === 'MANTENIMIENTO' ? 'DISPONIBLE' : 'MANTENIMIENTO';
    try {
      await espaciosApi.actualizar(esp.id_esp, { estado: nuevo });
      recargar();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cambiar el estado.'), 'error');
    }
  }

  return (
    <Layout>
      <PageHeader titulo="Espacios" descripcion="Aulas y laboratorios del edificio de la FISEI.">
        <Button onClick={() => setModal({})}>Nuevo espacio</Button>
      </PageHeader>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-3">
        <Buscador
          className="col-span-2 lg:col-span-1"
          value={filtros.busqueda}
          onChange={(busqueda) => setFiltros((f) => ({ ...f, busqueda }))}
          placeholder="Buscar aula o laboratorio…"
        />
        <Select value={filtros.tipo} onChange={cambiarFiltro('tipo')}>
          <option value="">Aulas y laboratorios</option>
          {OPCIONES_TIPO_ESPACIO.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </Select>
        <Select value={filtros.bloque} onChange={cambiarFiltro('bloque')}>
          <option value="">Todos los bloques</option>
          {OPCIONES_BLOQUE.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </Select>
        <Select value={filtros.piso} onChange={cambiarFiltro('piso')} className="col-span-2 lg:col-span-1">
          <option value="">Todos los pisos</option>
          {opcionesPiso.map((op) => (
            <option key={op.value} value={op.value}>
              Piso {op.label}
            </option>
          ))}
        </Select>
      </div>

      {!cargando && espacios.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-sm text-ink/50">
          <span>
            {hayFiltros
              ? `Mostrando ${espaciosFiltrados.length} de ${espacios.length} espacio(s).`
              : `${espacios.length} espacio(s) registrados.`}
          </span>
          {hayFiltros && (
            <button onClick={() => setFiltros(FILTROS_INICIALES)} className="text-azul font-medium hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={espaciosFiltrados.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio={
            espacios.length === 0 ? 'Aún no hay espacios registrados.' : 'Ningún espacio coincide con los filtros.'
          }
        >
          {paginacion.visibles.map((esp) => (
            <Card key={esp.id_esp} className={esp.activo ? '' : 'opacity-60'}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-semibold">
                  {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                </span>
                <div className="flex gap-1 shrink-0">
                  {!esp.activo && (
                    <Badge className={ESTILO_ESTADO_ACTIVO.false}>{ETIQUETA_ESTADO_ACTIVO.false}</Badge>
                  )}
                  <Badge className={ESTILO_ESTADO_ESPACIO[esp.estado] || ''}>
                    {ETIQUETA_ESTADO_ESPACIO[esp.estado] || esp.estado}
                  </Badge>
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="font-display text-lg text-ink truncate" title={esp.nom_esp}>
                  {esp.nom_esp}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal({ espacio: esp })}
                    title="Editar"
                    aria-label="Editar"
                    className="p-1.5 rounded-md text-azul/60 hover:text-azul hover:bg-azul/10 transition-colors"
                  >
                    <IconoEditar />
                  </button>
                  <button
                    onClick={() => alternarMantenimiento(esp)}
                    title={esp.estado === 'MANTENIMIENTO' ? 'Marcar disponible' : 'Poner en mantenimiento'}
                    aria-label={esp.estado === 'MANTENIMIENTO' ? 'Marcar disponible' : 'Poner en mantenimiento'}
                    className="p-1.5 rounded-md text-ink/50 hover:text-ink/80 hover:bg-ink/5 transition-colors"
                  >
                    <IconoMantenimiento />
                  </button>
                  {esp.activo ? (
                    <button
                      onClick={() => setADeshabilitar(esp)}
                      title="Deshabilitar"
                      aria-label="Deshabilitar"
                      className="p-1.5 rounded-md text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <IconoDeshabilitar />
                    </button>
                  ) : (
                    <button
                      onClick={() => habilitar(esp)}
                      title="Habilitar"
                      aria-label="Habilitar"
                      className="p-1.5 rounded-md text-success/60 hover:text-success hover:bg-success/10 transition-colors"
                    >
                      <IconoHabilitar />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-4 text-sm text-ink/60">
                <span className="flex items-center gap-1 truncate">
                  <IconoUbicacion />
                  <span className="truncate">{ubicacionEspacio(esp)}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <IconoCapacidad />
                  <span className="font-medium text-ink">{esp.capacidad}</span>
                </span>
              </div>
            </Card>
          ))}
        </DataState>
      </div>
      {!cargando && !error && <Paginacion {...paginacion} className="mt-4" />}

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

      <ConfirmDialog
        abierto={Boolean(aDeshabilitar)}
        titulo="Deshabilitar espacio"
        mensaje={
          aDeshabilitar
            ? `¿Deshabilitar "${aDeshabilitar.nom_esp}"? Dejará de ofrecerse para reservar. Puedes volver a habilitarlo cuando quieras.`
            : ''
        }
        textoConfirmar="Deshabilitar"
        textoCargando="Deshabilitando…"
        cargando={cambiandoEstado}
        onConfirmar={confirmarDeshabilitar}
        onCancelar={() => setADeshabilitar(null)}
      />
    </Layout>
  );
}

function FormularioEspacio({ espacio, onCancelar, onListo }) {
  const { valores, handleChange, setValores } = useForm({
    nom_esp: espacio?.nom_esp || '',
    tipo: espacio?.tipo || 'AULA',
    capacidad: espacio?.capacidad ? String(espacio.capacidad) : '',
    bloque: espacio?.bloque || 'BLOQUE_1',
    piso: espacio?.piso || '',
    estado: espacio?.estado || 'DISPONIBLE',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const opcionesPiso = opcionesPisoPara(valores.bloque);

  function manejarCambioBloque(e) {
    const nuevoBloque = e.target.value;
    setValores((v) => ({ ...v, bloque: nuevoBloque, piso: '' }));
  }

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
          maxLength={100}
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
      <Select
        label="Bloque"
        name="bloque"
        required
        value={valores.bloque}
        onChange={manejarCambioBloque}
        options={OPCIONES_BLOQUE}
      />
      <Select label="Piso" name="piso" required value={valores.piso} onChange={handleChange}>
        <option value="">Selecciona un piso</option>
        {opcionesPiso.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Select>
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

function IconoUbicacion() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconoCapacidad() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="7" r="3.5" />
      <path d="M20 20v-1a4 4 0 0 0-2.6-3.75" />
      <path d="M14 3.6a3.5 3.5 0 0 1 0 6.8" />
    </svg>
  );
}

function IconoEditar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconoMantenimiento() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4l-5.6 5.6a1.5 1.5 0 0 0 2.12 2.12l5.6-5.6a4 4 0 0 1 5.4-5.4l-2.3 2.3-1.7-1.7Z" />
    </svg>
  );
}

function IconoDeshabilitar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

function IconoHabilitar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
