/**
 * PLANTILLA DE EJEMPLO PARA NUEVAS FUNCIONALIDADES DEL MÓDULO DE ADMINISTRADOR
 *
 * Podés duplicar este archivo como base para cualquier nueva sección de administración
 * (ej: Auditoría, Equipamiento, Configuración, Catálogo, etc.)
 */
import { useCallback, useMemo, useState } from 'react';
import { AdminPageTemplate } from './index';
import { useApiResource } from '../../hooks/useApiResource';
import { useToast } from '../../context/ToastContext';
import { Button, Table, Modal, ConfirmDialog, Input, Select, Badge } from '../ui';

// 1. Columnas de la tabla
const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre / Recurso' },
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function PlantillaFuncionalidadAdmin() {
  const { mostrarToast } = useToast();

  // Estados de interfaz y filtrado
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [elementoAEliminar, setElementoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // 2. Carga de datos asíncrona con el hook existente
  // (Reemplazá `miApi.listar` por el endpoint real)
  const cargar = useCallback(async () => {
    // Simulación: await miApi.listar();
    return [
      { id: 1, nombre: 'Laboratorio de Redes', codigo: 'LAB-RED-01', estado: 'ACTIVO' },
      { id: 2, nombre: 'Aula Magna 301', codigo: 'AUL-301', estado: 'ACTIVO' },
      { id: 3, nombre: 'Sala de Servidores', codigo: 'SRV-001', estado: 'MANTENIMIENTO' },
    ];
  }, []);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los registros.',
  });

  const items = data ?? [];

  // 3. Filtrado reactivo en memoria (o server-side)
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((item) => {
      const coincideBusqueda = !q || item.nombre.toLowerCase().includes(q) || item.codigo.toLowerCase().includes(q);
      const coincideEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [items, busqueda, filtroEstado]);

  // 4. Métricas / KPIs calculados para la barra superior
  const metricas = useMemo(
    () => [
      { etiqueta: 'Total registros', valor: items.length, tono: 'azul' },
      { etiqueta: 'Activos', valor: items.filter((i) => i.estado === 'ACTIVO').length, tono: 'success' },
      { etiqueta: 'En mantenimiento', valor: items.filter((i) => i.estado === 'MANTENIMIENTO').length, tono: 'amber' },
    ],
    [items]
  );

  // 5. Manejadores de acciones
  async function confirmarEliminar() {
    if (!elementoAEliminar) return;
    setEliminando(true);
    try {
      // await miApi.eliminar(elementoAEliminar.id);
      recargar();
      mostrarToast('Registro eliminado con éxito.', 'exito');
    } catch {
      mostrarToast('Error al eliminar el registro.', 'error');
    } finally {
      setEliminando(false);
      setElementoAEliminar(null);
    }
  }

  return (
    <AdminPageTemplate
      titulo="Nueva Funcionalidad"
      descripcion="Gestión integral de este nuevo recurso o módulo de la facultad."
      breadcrumbs={[
        { etiqueta: 'Administración', to: '/dashboard' },
        { etiqueta: 'Nueva Funcionalidad' },
      ]}
      acciones={<Button onClick={() => setModalAbierto(true)}>Nuevo registro</Button>}
      metricas={metricas}
      busqueda={busqueda}
      onBusquedaChange={setBusqueda}
      placeholderBusqueda="Buscar por nombre o código…"
      filtros={
        <div className="w-44">
          <Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            opciones={[
              { valor: 'TODOS', etiqueta: 'Todos los estados' },
              { valor: 'ACTIVO', etiqueta: 'Activos' },
              { valor: 'MANTENIMIENTO', etiqueta: 'En mantenimiento' },
            ]}
          />
        </div>
      }
      totalResultados={filtrados.length}
      totalTotal={items.length}
      onLimpiarFiltros={() => {
        setBusqueda('');
        setFiltroEstado('TODOS');
      }}
      cargando={cargando}
      error={error}
      onReintentar={recargar}
      vacio={filtrados.length === 0}
      mensajeVacio="No se encontraron registros"
      descripcionVacio="Probá cambiando el criterio de búsqueda o el filtro de estado."
      modales={
        <>
          {/* Modal Crear / Editar */}
          <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Crear nuevo registro">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mostrarToast('Guardado simulado.', 'exito');
                setModalAbierto(false);
              }}
              className="space-y-4"
            >
              <Input label="Nombre del recurso" placeholder="Ej: Laboratorio 4" required />
              <Input label="Código institucional" placeholder="Ej: LAB-04" required />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </Modal>

          {/* Diálogo de Confirmación */}
          <ConfirmDialog
            abierto={Boolean(elementoAEliminar)}
            onCerrar={() => setElementoAEliminar(null)}
            onConfirmar={confirmarEliminar}
            titulo="Eliminar registro"
            mensaje={`¿Estás seguro de eliminar "${elementoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
            cargando={eliminando}
            peligro
          />
        </>
      }
    >
      {/* 6. Tabla o Grid de resultados */}
      <Table
        columnas={COLUMNAS}
        datos={filtrados}
        renderFila={(item) => (
          <tr key={item.id} className="border-b border-line hover:bg-paper/40 transition-colors">
            <td className="px-5 py-3 font-medium text-ink">{item.nombre}</td>
            <td className="px-5 py-3 text-ink/70 font-mono text-xs">{item.codigo}</td>
            <td className="px-5 py-3">
              <Badge estado={item.estado === 'ACTIVO' ? 'ACTIVO' : 'CANCELADA'} />
            </td>
            <td className="px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setElementoAEliminar(item)}
                className="text-xs text-danger hover:underline font-medium"
              >
                Eliminar
              </button>
            </td>
          </tr>
        )}
      />
    </AdminPageTemplate>
  );
}
