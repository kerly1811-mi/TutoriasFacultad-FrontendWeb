import Alert from './Alert';

/**
 * Renderiza el estado de una carga de datos en listas/grids:
 * cargando -> `skeleton` (o texto), error -> Alert, vacío -> mensaje, y si no, los children.
 * Evita repetir `cargando && ...` / `length === 0 && ...` en cada página.
 */
export default function DataState({
  cargando,
  error,
  vacio,
  textoCargando = 'Cargando…',
  mensajeVacio = 'No hay registros.',
  skeleton,
  children,
}) {
  if (cargando) return skeleton || <p className="text-sm text-ink/50">{textoCargando}</p>;
  if (error) return <Alert inline>{error}</Alert>;
  if (vacio) return <p className="text-sm text-ink/50">{mensajeVacio}</p>;
  return children;
}
