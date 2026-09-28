import { useState } from 'react';
import { Card } from '../ui';

/**
 * Gráficos de los reportes, en HTML/CSS simple (sin librerías).
 * Reglas (guía de visualización): un solo tono para magnitudes (más = más oscuro),
 * sin barras "de relleno" para valores en cero, texto siempre en tinta (nunca del
 * color de la serie), y detalle al pasar el mouse o enfocar con teclado.
 *
 * Color categórico: paleta fija de 8 tonos, validada contra daltonismo (orden fijo,
 * nunca ciclado más allá de 8 -- lo que exceda se agrupa en "Otros"). Se usa para
 * identidad (carrera, nivel...); las magnitudes siguen usando un solo tono.
 */
export const CATEGORIAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
// Estado fijo (nunca para "serie 4"): siempre con ícono/etiqueta, nunca solo color.
export const ESTADO = { bueno: '#0ca30c', alerta: '#fab219', serio: '#ec835a', critico: '#d03b3b' };

// ---------- Tooltip compartido ----------
export function useTooltip() {
  const [tip, setTip] = useState(null); // { x, y, contenido }
  const mostrar = (e, contenido) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ?? r.left + r.width / 2;
    const y = e.clientY ?? r.top;
    setTip({ x, y, contenido });
  };
  const ocultar = () => setTip(null);
  const nodo = tip && (
    <div
      role="tooltip"
      style={{ left: Math.min(tip.x + 14, window.innerWidth - 260), top: tip.y + 14 }}
      className="fixed z-[80] pointer-events-none max-w-60 rounded-md border border-line bg-white px-3 py-2 text-xs text-ink shadow-lg"
    >
      {tip.contenido}
    </div>
  );
  return { mostrar, ocultar, nodo };
}

// ---------- Tarjeta de cifra ----------
// `tono`: 'bueno' | 'alerta' | 'serio' | 'critico' -- pinta un borde y un ícono de
// estado a la izquierda. Nunca es la única señal (siempre va con la etiqueta/valor).
const ICONO_TONO = { bueno: '●', alerta: '▲', serio: '▲', critico: '●' };
export function Cifra({ etiqueta, valor, detalle, tono }) {
  const color = tono && ESTADO[tono];
  return (
    <Card padding="p-4 sm:p-5" className={color ? 'border-l-[3px]' : ''} style={color ? { borderLeftColor: color } : undefined}>
      <div className="flex items-center gap-1.5">
        {color && (
          <span aria-hidden="true" className="text-[10px] leading-none" style={{ color }}>
            {ICONO_TONO[tono]}
          </span>
        )}
        <p className="text-xs uppercase tracking-wide text-ink/50 font-medium">{etiqueta}</p>
      </div>
      <p className="text-2xl sm:text-3xl text-ink font-semibold mt-1.5">{valor}</p>
      {detalle && <p className="text-xs text-ink/50 mt-1">{detalle}</p>}
    </Card>
  );
}

// ---------- Panel con título ----------
export function Panel({ titulo, descripcion, acciones, children }) {
  return (
    <Card padding="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-display text-base sm:text-lg text-ink font-semibold">{titulo}</p>
          {descripcion && <p className="text-xs text-ink/50 mt-0.5 max-w-xl">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </Card>
  );
}

/**
 * Barras horizontales ordenadas (comparar magnitudes).
 * filas: [{ id, etiqueta, valor, texto?, detalle? }]  (texto = cómo se muestra el valor)
 * Los valores en 0 no dibujan barra. `seleccionado` resalta una fila; `onSeleccionar` la hace clicable.
 */
export function BarrasHorizontales({
  filas,
  maximo,
  vacio = 'Sin datos.',
  limite = 10,
  seleccionado,
  onSeleccionar,
  color = '#2a78d6',
  colorActivo = '#184f95',
}) {
  const [verTodas, setVerTodas] = useState(false);
  const { mostrar, ocultar, nodo } = useTooltip();
  if (filas.length === 0) return <p className="text-sm text-ink/50">{vacio}</p>;

  const max = maximo ?? Math.max(...filas.map((f) => f.valor), 1);
  const visibles = verTodas ? filas : filas.slice(0, limite);

  return (
    <div>
      <ul className="space-y-1">
        {visibles.map((f) => {
          const pct = max > 0 ? (f.valor / max) * 100 : 0;
          const activo = seleccionado != null && seleccionado === f.id;
          const Etiqueta = onSeleccionar ? 'button' : 'div';
          return (
            <li key={f.id ?? f.etiqueta}>
              <Etiqueta
                {...(onSeleccionar && { type: 'button', onClick: () => onSeleccionar(activo ? null : f.id) })}
                onPointerMove={(e) => mostrar(e, <ContenidoTip valor={f.texto ?? f.valor} titulo={f.etiqueta} detalle={f.detalle} />)}
                onPointerLeave={ocultar}
                onFocus={(e) => mostrar(e, <ContenidoTip valor={f.texto ?? f.valor} titulo={f.etiqueta} detalle={f.detalle} />)}
                onBlur={ocultar}
                className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${
                  activo ? 'bg-azul/10' : onSeleccionar ? 'hover:bg-paper' : ''
                } ${onSeleccionar ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={`truncate ${activo ? 'font-semibold text-ink' : 'text-ink/80'}`}>{f.etiqueta}</span>
                  <span className="shrink-0 tabular-nums text-ink font-medium">{f.texto ?? f.valor}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-line/60 overflow-hidden">
                  {f.valor > 0 && (
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, background: activo ? colorActivo : color }}
                    />
                  )}
                </div>
              </Etiqueta>
            </li>
          );
        })}
      </ul>
      {filas.length > limite && (
        <button
          type="button"
          onClick={() => setVerTodas((v) => !v)}
          className="mt-3 text-sm text-azul font-medium hover:underline"
        >
          {verTodas ? 'Ver menos' : `Ver los ${filas.length}`}
        </button>
      )}
      {nodo}
    </div>
  );
}

/**
 * Dona (composición de un total en categorías fijas -- identidad, no magnitud).
 * segmentos: [{ clave, valor }]. Más de 7 categorías se agrupan en "Otros" (el
 * 8vo tono de la paleta) para no ciclar colores. Etiqueta directa en la leyenda
 * (nunca solo color) y total al centro.
 */
export function Dona({ segmentos, vacio = 'Sin datos.', etiquetaTotal = 'Total' }) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const total = segmentos.reduce((t, s) => t + s.valor, 0);
  if (segmentos.length === 0 || total === 0) return <p className="text-sm text-ink/50">{vacio}</p>;

  const ordenados = [...segmentos].sort((a, b) => b.valor - a.valor);
  const LIMITE = 7;
  const visibles = ordenados.length > LIMITE ? ordenados.slice(0, LIMITE) : ordenados;
  const resto = ordenados.length > LIMITE ? ordenados.slice(LIMITE).reduce((t, s) => t + s.valor, 0) : 0;
  const partes = resto > 0 ? [...visibles, { clave: 'Otros', valor: resto }] : visibles;
  const coloreadas = partes.map((s, i) => ({ ...s, color: CATEGORIAS[i % CATEGORIAS.length] }));

  let acumulado = 0;
  const paradas = coloreadas.map((s) => {
    const desde = (acumulado / total) * 360;
    acumulado += s.valor;
    const hasta = (acumulado / total) * 360;
    return `${s.color} ${desde}deg ${hasta}deg`;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="relative shrink-0 w-40 h-40 rounded-full"
        style={{ background: `conic-gradient(${paradas.join(', ')})` }}
        role="img"
        aria-label={`${etiquetaTotal}: ${total}`}
      >
        <div className="absolute inset-[14%] rounded-full bg-white flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-ink leading-none">{total}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink/50 mt-1">{etiquetaTotal}</p>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {coloreadas.map((s) => {
          const porcentaje = Math.round((s.valor / total) * 100);
          return (
            <li key={s.clave}>
              <button
                type="button"
                onPointerMove={(e) => mostrar(e, <ContenidoTip valor={`${s.valor} (${porcentaje}%)`} titulo={s.clave} />)}
                onPointerLeave={ocultar}
                onFocus={(e) => mostrar(e, <ContenidoTip valor={`${s.valor} (${porcentaje}%)`} titulo={s.clave} />)}
                onBlur={ocultar}
                className="w-full flex items-center gap-2 text-left rounded-md px-1.5 py-1 hover:bg-paper transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="flex-1 truncate text-sm text-ink/80">{s.clave}</span>
                <span className="shrink-0 tabular-nums text-sm font-medium text-ink">{s.valor}</span>
                <span className="shrink-0 tabular-nums text-xs text-ink/50 w-9 text-right">{porcentaje}%</span>
              </button>
            </li>
          );
        })}
      </ul>
      {nodo}
    </div>
  );
}

function ContenidoTip({ valor, titulo, detalle }) {
  return (
    <>
      <p className="text-sm font-semibold text-ink">{valor}</p>
      <p className="text-ink/70">{titulo}</p>
      {detalle && <p className="text-ink/50 mt-0.5">{detalle}</p>}
    </>
  );
}

/**
 * Columnas en el tiempo (p. ej. reservas por día). puntos: [{ etiqueta, valor, detalle? }]
 */
export function Columnas({ puntos, vacio = 'Sin datos.' }) {
  const { mostrar, ocultar, nodo } = useTooltip();
  const max = Math.max(...puntos.map((p) => p.valor), 0);
  if (puntos.length === 0 || max === 0) return <p className="text-sm text-ink/50">{vacio}</p>;
  const cadaCuanto = Math.ceil(puntos.length / 10); // etiquetas del eje sin amontonarse

  return (
    <div>
      <div className="flex items-end gap-0.5 h-44 border-b border-line">
        {puntos.map((p, i) => (
          <button
            key={p.etiqueta + i}
            type="button"
            aria-label={`${p.etiqueta}: ${p.valor}`}
            onPointerMove={(e) => mostrar(e, <ContenidoTip valor={p.valor} titulo={p.etiqueta} detalle={p.detalle} />)}
            onPointerLeave={ocultar}
            onFocus={(e) => mostrar(e, <ContenidoTip valor={p.valor} titulo={p.etiqueta} detalle={p.detalle} />)}
            onBlur={ocultar}
            className="group flex-1 h-full flex items-end min-w-1"
          >
            {p.valor > 0 && (
              <span
                className="w-full rounded-t bg-[#2a78d6] group-hover:bg-[#184f95] transition-colors"
                style={{ height: `${(p.valor / max) * 100}%` }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 mt-1">
        {puntos.map((p, i) => (
          <span key={i} className="flex-1 text-[10px] text-ink/50 text-center truncate">
            {i % cadaCuanto === 0 ? p.corto ?? p.etiqueta : ''}
          </span>
        ))}
      </div>
      {nodo}
    </div>
  );
}
