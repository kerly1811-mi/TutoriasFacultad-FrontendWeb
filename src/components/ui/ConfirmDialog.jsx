import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Textarea from './Textarea';

/**
 * Modal de confirmación para acciones destructivas o irreversibles.
 * Reemplaza `window.confirm(...)`.
 *
 * Con `pedirRazon`, agrega un campo de texto obligatorio y llama
 * `onConfirmar(razon)` en vez de `onConfirmar()`.
 */
export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar acción',
  mensaje,
  variant = 'danger',
  textoConfirmar = 'Confirmar',
  textoCargando = 'Procesando…',
  cargando = false,
  pedirRazon = false,
  labelRazon = 'Motivo',
  placeholderRazon = 'Explica brevemente el motivo…',
  onConfirmar,
  onCancelar,
}) {
  const [razon, setRazon] = useState('');

  // Limpia el campo cada vez que se abre el diálogo.
  useEffect(() => {
    if (abierto) setRazon('');
  }, [abierto]);

  const bloqueadoPorRazon = pedirRazon && !razon.trim();

  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="max-w-sm">
      <p className="text-sm text-ink/70">{mensaje}</p>

      {pedirRazon && (
        <div className="mt-4">
          <Textarea
            label={labelRazon}
            required
            rows={3}
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            placeholder={placeholderRazon}
          />
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={variant}
          onClick={() => onConfirmar(razon)}
          disabled={bloqueadoPorRazon}
          cargando={cargando}
          textoCargando={textoCargando}
        >
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
