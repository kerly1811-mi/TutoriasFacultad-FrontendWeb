import { CONTROL, ETIQUETA_CAMPO } from './estilos';

/**
 * Campo de búsqueda con lupa y botón para limpiar.
 * `value` / `onChange(texto)` controlados desde la página.
 */
export default function Buscador({ label, value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={className}>
      {label && <label className={ETIQUETA_CAMPO}>{label}</label>}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${CONTROL} pl-9 pr-9`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpiar búsqueda"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/40 hover:text-ink/70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Normaliza para buscar sin importar mayúsculas ni tildes: "Programación" ~ "programacion".
export function normalizarBusqueda(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
