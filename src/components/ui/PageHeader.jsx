/**
 * Encabezado de página: título + descripción y un espacio a la derecha para acciones.
 * Reemplaza el bloque repetido en Espacios y Reservas.
 */
export default function PageHeader({ titulo, descripcion, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-ink">{titulo}</h1>
        {descripcion && <p className="text-ink/60 mt-1">{descripcion}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
