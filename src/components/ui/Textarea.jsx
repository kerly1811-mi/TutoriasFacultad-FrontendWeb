import { forwardRef } from 'react';
import { CONTROL, CONTROL_ERROR, ETIQUETA_CAMPO } from './estilos';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, rows = 3, className = '', id, ...props },
  ref
) {
  const areaId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={areaId} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        className={[CONTROL, error ? CONTROL_ERROR : '', className].filter(Boolean).join(' ')}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

export default Textarea;
