/**
 * Controles de paginación: "Mostrando 16–30 de 258" + botones de página.
 * Recibe directamente lo que devuelve `usePaginacion`. No se muestra si todo cabe en una página.
 */
export default function Paginacion({ pagina, setPagina, totalPaginas, desde, hasta, total, className = '' }) {
  if (totalPaginas <= 1) return null;

  const ir = (p) => {
    setPagina(Math.min(Math.max(1, p), totalPaginas));
  };

  return (
    <nav
      aria-label="Paginación"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-sm ${className}`}
    >
      <p className="text-ink/50">
        Mostrando <span className="font-medium text-ink/80">{desde}</span>–
        <span className="font-medium text-ink/80">{hasta}</span> de{' '}
        <span className="font-medium text-ink/80">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <BotonPagina onClick={() => ir(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
          ‹
        </BotonPagina>
        {numerosVisibles(pagina, totalPaginas).map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1.5 text-ink/40">
              …
            </span>
          ) : (
            <BotonPagina
              key={n}
              onClick={() => ir(n)}
              activo={n === pagina}
              aria-current={n === pagina ? 'page' : undefined}
            >
              {n}
            </BotonPagina>
          )
        )}
        <BotonPagina onClick={() => ir(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Página siguiente">
          ›
        </BotonPagina>
      </div>
    </nav>
  );
}

function BotonPagina({ activo, children, ...props }) {
  return (
    <button
      type="button"
      className={`min-w-8 h-8 px-2 rounded-md border text-sm tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        activo
          ? 'bg-azul border-azul text-white font-medium'
          : 'bg-white border-line text-ink/70 hover:border-azul/40 hover:text-ink'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

// 1 … 4 5 6 … 18  (siempre primera, última y vecinas de la actual)
function numerosVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const numeros = new Set([1, total, actual - 1, actual, actual + 1]);
  const lista = [...numeros].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultado = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) resultado.push('…');
    resultado.push(n);
  });
  return resultado;
}
