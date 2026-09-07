import Modal from './Modal';
import Button from './Button';

/**
 * Modal de confirmación para acciones destructivas o irreversibles.
 * Reemplaza `window.confirm(...)`.
 */
export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar acción',
  mensaje,
  variant = 'danger',
  textoConfirmar = 'Confirmar',
  textoCargando = 'Procesando…',
  cargando = false,
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="max-w-sm">
      <p className="text-sm text-ink/70">{mensaje}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </Button>
        <Button type="button" variant={variant} onClick={onConfirmar} cargando={cargando} textoCargando={textoCargando}>
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
