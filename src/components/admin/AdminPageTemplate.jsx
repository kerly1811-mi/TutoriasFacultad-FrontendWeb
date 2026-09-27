import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Alert from '../ui/Alert';

/**
 * Ícono de lupa para el campo de búsqueda
 */
function IconoBuscar() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink/40 shrink-0"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Ícono para limpiar la búsqueda
 */
function IconoLimpiar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Ícono de caja vacía
 */
function IconoVacio() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink/30"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

const TONOS_METRICAS = {
  azul: 'bg-azul text-white',
  celeste: 'bg-sky-500 text-white',
  success: 'bg-success text-white',
  amber: 'bg-orange-500 text-white',
  danger: 'bg-danger text-white',
  purpura: 'bg-purple-500 text-white',
};

/**
 * Plantilla arquitectónica estándar para módulos y vistas de administración.
 *
 * Estandariza:
 * - Breadcrumbs y cabecera con acciones principales
 * - Bloque de métricas / KPIs rápidos (opcional)
 * - Barra de herramientas con búsqueda y filtros
 * - Manejo de estados: cargando (skeleton), error (reintentar), vacío y contenido
 * - Contenedor para modales y diálogos de confirmación
 */
export default function AdminPageTemplate({
  titulo,
  descripcion,
  icono,
  badge,
  breadcrumbs = [],
  acciones,
  metricas = [],
  busqueda,
  onBusquedaChange,
  placeholderBusqueda = 'Buscar registros…',
  filtros,
  totalResultados,
  totalTotal,
  onLimpiarFiltros,
  hayFiltrosActivos,
  accionesBarra,
  cargando = false,
  error = null,
  onReintentar,
  vacio = false,
  mensajeVacio = 'No se encontraron registros.',
  descripcionVacio,
  skeleton,
  modales,
  children,
}) {
  // Por defecto solo cuenta la búsqueda; la página puede avisar si además hay filtros (selects) activos.
  const tieneFiltrosActivos = hayFiltrosActivos ?? Boolean(busqueda?.trim());

  return (
    <div className="space-y-6">
      {/* 1. Miga de pan / Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink/50">
          {breadcrumbs.map((crumb, idx) => {
            const esUltimo = idx === breadcrumbs.length - 1;
            return (
              <span key={crumb.etiqueta} className="flex items-center gap-1.5">
                {idx > 0 && <span>/</span>}
                {crumb.to && !esUltimo ? (
                  <Link to={crumb.to} className="hover:text-azul hover:underline transition-colors">
                    {crumb.etiqueta}
                  </Link>
                ) : (
                  <span className={esUltimo ? 'text-ink/80 font-medium' : ''}>{crumb.etiqueta}</span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* 2. Cabecera de la sección */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {icono && (
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-azul/10 text-azul shrink-0 mt-0.5">
              {icono}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl text-ink font-semibold tracking-tight">{titulo}</h1>
              {badge && <div>{badge}</div>}
            </div>
            {descripcion && <p className="text-sm text-ink/60 mt-1 max-w-2xl leading-relaxed">{descripcion}</p>}
          </div>
        </div>

        {acciones && <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">{acciones}</div>}
      </header>

      {/* 3. Métricas rápidas (KPIs) opcionales */}
      {metricas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {metricas.map((m, i) => (
            <Card key={m.etiqueta || i} padding="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">{m.etiqueta}</p>
                  <p className="font-display text-xl sm:text-2xl text-ink font-semibold mt-1">
                    {m.valor}
                    {m.subvalor && <span className="text-xs font-sans font-normal text-ink/40 ml-1"> {m.subvalor}</span>}
                  </p>
                </div>
                {m.icono && (
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                      TONOS_METRICAS[m.tono] || TONOS_METRICAS.azul
                    }`}
                  >
                    {m.icono}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 4. Barra de herramientas y filtros */}
      {(onBusquedaChange || filtros || accionesBarra) && (
        <Card padding="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Lado izquierdo: Búsqueda y filtros */}
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 min-w-0">
              {onBusquedaChange && (
                <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconoBuscar />
                  </div>
                  <input
                    type="text"
                    value={busqueda || ''}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    placeholder={placeholderBusqueda}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-paper/50 border border-line rounded-lg text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul transition-all"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => onBusquedaChange('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink/40 hover:text-ink transition-colors"
                    >
                      <IconoLimpiar />
                    </button>
                  )}
                </div>
              )}

              {/* Filtros personalizados (Selects, Toggles, etc.) */}
              {filtros && <div className="flex flex-wrap items-center gap-2">{filtros}</div>}

              {/* Botón para resetear filtros si hay búsqueda activa o filtros */}
              {onLimpiarFiltros && tieneFiltrosActivos && (
                <button
                  type="button"
                  onClick={onLimpiarFiltros}
                  className="text-xs text-azul hover:text-azul-dark hover:underline font-medium self-center py-1 px-1.5 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Lado derecho: Contador y acciones adicionales */}
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line/60">
              {totalResultados !== undefined && (
                <p className="text-xs text-ink/50 whitespace-nowrap">
                  Mostrando <span className="font-semibold text-ink/80">{totalResultados}</span>
                  {totalTotal !== undefined && <span> de {totalTotal}</span>} registros
                </p>
              )}
              {accionesBarra && <div className="flex items-center gap-2">{accionesBarra}</div>}
            </div>
          </div>
        </Card>
      )}

      {/* 5. Área de contenido principal / Manejo de estados */}
      <div>
        {cargando ? (
          skeleton || (
            <Card padding="p-8">
              <div className="space-y-4">
                <div className="h-5 w-48 bg-line/60 rounded animate-pulse" />
                <div className="space-y-2.5">
                  <div className="h-10 bg-line/40 rounded animate-pulse" />
                  <div className="h-10 bg-line/40 rounded animate-pulse" />
                  <div className="h-10 bg-line/40 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          )
        ) : error ? (
          <Alert variant="error">
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              {onReintentar && (
                <Button variant="secondary" size="sm" onClick={onReintentar}>
                  Reintentar
                </Button>
              )}
            </div>
          </Alert>
        ) : vacio ? (
          <Card padding="p-10">
            <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-paper flex items-center justify-center mb-3.5 border border-line/60">
                <IconoVacio />
              </div>
              <p className="font-display text-base font-medium text-ink">{mensajeVacio}</p>
              {descripcionVacio && <p className="text-xs text-ink/50 mt-1 leading-relaxed">{descripcionVacio}</p>}
              {onLimpiarFiltros && tieneFiltrosActivos && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={onLimpiarFiltros}>
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </Card>
        ) : (
          children
        )}
      </div>

      {/* 6. Slot de Modales y Diálogos */}
      {modales}
    </div>
  );
}
