import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

/**
 * Mensajes de confirmación/error flotantes en la parte inferior de la pantalla.
 * Uso: const { mostrarToast } = useToast(); mostrarToast('Reserva creada.', 'exito');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const cerrarToast = useCallback((id) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (mensaje, tipo = 'exito', duracion = 4000) => {
      const id = ++idRef.current;
      setToasts((actuales) => [...actuales, { id, mensaje, tipo }]);
      if (duracion) {
        setTimeout(() => cerrarToast(id), duracion);
      }
      return id;
    },
    [cerrarToast]
  );

  return (
    <ToastContext.Provider value={{ mostrarToast, cerrarToast }}>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-6 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full max-w-md rounded-lg border px-4 py-3 shadow-lg text-sm font-medium flex items-start justify-between gap-3 animate-[toast-in_0.2s_ease-out] ${
              t.tipo === 'error'
                ? 'bg-danger text-white border-danger'
                : 'bg-success text-white border-success'
            }`}
          >
            <span>{t.mensaje}</span>
            <button
              type="button"
              onClick={() => cerrarToast(t.id)}
              aria-label="Cerrar mensaje"
              className="text-white/80 hover:text-white leading-none text-lg"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return ctx;
}
