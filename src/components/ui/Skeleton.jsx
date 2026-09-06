// Bloque gris animado para los estados de carga.
export function Skeleton({ className = '' }) {
  return <div className={['animate-pulse rounded bg-line/70', className].filter(Boolean).join(' ')} />;
}

// Rejilla de tarjetas "fantasma" para listas en grid (Espacios, Disponibilidad).
export function SkeletonCards({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={`sk-${i}`} className="rounded-lg border border-line bg-white p-5 space-y-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  ));
}
