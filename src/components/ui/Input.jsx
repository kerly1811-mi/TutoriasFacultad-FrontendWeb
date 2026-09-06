import { forwardRef } from 'react';
import { CONTROL, CONTROL_ERROR, ETIQUETA_CAMPO } from './estilos';

/**
 * Campo de texto con etiqueta, ayuda y error opcionales.
 * Reemplaza el bloque repetido `<div><label/><input/></div>`.
 * Todas las props extra (type, value, onChange, required, maxLength...) van al <input>.
 */
const Input = forwardRef(function Input(
  { label, error, hint, className = '', id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[CONTROL, error ? CONTROL_ERROR : '', className].filter(Boolean).join(' ')}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

export default Input;
