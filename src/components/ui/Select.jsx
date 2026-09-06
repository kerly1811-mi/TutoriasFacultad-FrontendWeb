import { forwardRef } from 'react';
import { CONTROL, CONTROL_ERROR, ETIQUETA_CAMPO } from './estilos';

/**
 * Lista desplegable con etiqueta y error opcionales.
 * Acepta `options={[{ value, label }]}` o children con <option> propios.
 */
const Select = forwardRef(function Select(
  { label, error, hint, options, children, className = '', id, ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={[CONTROL, 'bg-white', error ? CONTROL_ERROR : '', className].filter(Boolean).join(' ')}
        {...props}
      >
        {options
          ? options.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))
          : children}
      </select>
      {hint && !error && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

export default Select;
