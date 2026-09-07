import { forwardRef, useState } from 'react';
import { CONTROL, CONTROL_ERROR, ETIQUETA_CAMPO } from './estilos';

/**
 * Campo de texto con etiqueta, ayuda y error opcionales.
 * Reemplaza el bloque repetido `<div><label/><input/></div>`.
 * Todas las props extra (type, value, onChange, required, maxLength...) van al <input>.
 * Si type="password", agrega un botón para mostrar/ocultar el valor.
 */
const Input = forwardRef(function Input(
  { label, error, hint, className = '', id, type, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name;
  const esPassword = type === 'password';
  const tipoReal = esPassword && visible ? 'text' : type;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={tipoReal}
          className={[
            CONTROL,
            esPassword ? 'pr-10' : '',
            error ? CONTROL_ERROR : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/40 hover:text-ink/70"
          >
            {visible ? <IconoOjoTachado /> : <IconoOjo />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

function IconoOjo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconoOjoTachado() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24" />
      <path d="M9.88 5.09A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.16 13.16 0 0 1-3.05 3.95M6.42 6.42C3.5 8.24 1.5 12 1.5 12s3.5 7 10.5 7a10.87 10.87 0 0 0 4.02-.75" />
    </svg>
  );
}

export default Input;
