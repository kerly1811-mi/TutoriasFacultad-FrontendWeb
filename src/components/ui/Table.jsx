/**
 * Tabla ligera con encabezados y estados integrados (cargando / error / vacío).
 * - columnas: [{ clave, titulo, className? }]
 * - datos: array de filas
 * - renderFila: (fila) => <tr> ... </tr>
 */
export default function Table({
  columnas,
  datos = [],
  renderFila,
  cargando = false,
  error = null,
  mensajeVacio = 'Sin registros.',
  filasCargando = 3,
}) {
  const totalColumnas = columnas.length;

  return (
    <div className="border border-line bg-white rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink/50 border-b border-line">
            {columnas.map((col) => (
              <th key={col.clave} className={['px-5 py-3 font-medium', col.className].filter(Boolean).join(' ')}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando &&
            Array.from({ length: filasCargando }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-line last:border-0">
                {columnas.map((col) => (
                  <td key={col.clave} className="px-5 py-3">
                    <div className="h-4 w-24 max-w-full animate-pulse rounded bg-line/70" />
                  </td>
                ))}
              </tr>
            ))}

          {!cargando && error && (
            <tr>
              <td colSpan={totalColumnas} className="px-5 py-6 text-ink/50">
                {error}
              </td>
            </tr>
          )}

          {!cargando && !error && datos.length === 0 && (
            <tr>
              <td colSpan={totalColumnas} className="px-5 py-6 text-ink/50">
                {mensajeVacio}
              </td>
            </tr>
          )}

          {!cargando && !error && datos.map((fila) => renderFila(fila))}
        </tbody>
      </table>
    </div>
  );
}
