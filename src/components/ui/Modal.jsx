import { useEffect } from 'react';

/**
 * Diálogo modal reutilizable.
 * - abierto: controla la visibilidad
 * - onCerrar: se llama al pulsar la X, Escape o el fondo
 * - ancho: clase max-w-* del contenedor
 */
export default function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return undefined;

    function alPulsarTecla(evento) {
      if (evento.key === 'Escape') onCerrar();
    }

    document.addEventListener('keydown', alPulsarTecla);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6"
      onMouseDown={onCerrar}
    >
      <div
        className={['w-full max-h-[85vh] flex flex-col rounded-lg border border-line bg-white shadow-xl', ancho].join(
          ' '
        )}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-line px-6 py-4">
          <p className="font-display text-lg text-ink">{titulo}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-ink/40 hover:text-ink transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
