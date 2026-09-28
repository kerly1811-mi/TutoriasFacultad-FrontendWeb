import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONTROL, ETIQUETA_CAMPO } from './estilos';
import { normalizarBusqueda } from './Buscador';

/**
 * Lista desplegable con búsqueda, para catálogos grandes (paralelos, materias, docentes…)
 * donde un <select> nativo abre cientos de opciones a pantalla completa.
 * Se escribe para filtrar (sin importar tildes, varias palabras) y la lista muestra
 * unas 4 opciones a la vez con scroll. Teclado: ↑ ↓ para moverse, Enter elige, Esc cierra.
 * La lista se dibuja en <body> (portal) pegada al campo, para que no la recorte un
 * contenedor con scroll (p. ej. el cuerpo de un Modal); si no cabe debajo, se abre hacia arriba.
 *
 * - opciones: [{ value, label, detalle? }]  (detalle = texto secundario, también se busca)
 * - value / onChange(value): valor elegido (string)
 */
// Alto máximo de la lista: ~4 opciones con su línea de detalle.
const ALTO_LISTA = 216;

export default function SelectBuscable({
  label,
  opciones = [],
  value,
  onChange,
  placeholder = 'Escribe para buscar…',
  mensajeVacio = 'Ninguna opción coincide.',
  required = false,
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const [posicion, setPosicion] = useState(null); // { top, left, width, arriba }
  const contenedorRef = useRef(null);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  const seleccionada = opciones.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!abierto) return undefined;
    function alClicFuera(e) {
      if (!contenedorRef.current?.contains(e.target) && !listaRef.current?.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  const palabras = normalizarBusqueda(query).split(/\s+/).filter(Boolean);
  const filtradas = palabras.length
    ? opciones.filter((o) => {
        const texto = normalizarBusqueda(`${o.label} ${o.detalle || ''}`);
        return palabras.every((p) => texto.includes(p));
      })
    : opciones;

  // Posición de la lista flotante: debajo del campo, o encima si no hay espacio.
  // Se recalcula si la página o el modal se desplazan (salvo el scroll de la propia lista).
  useLayoutEffect(() => {
    if (!abierto) return undefined;
    function ubicar() {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const espacioAbajo = window.innerHeight - r.bottom;
      const arriba = espacioAbajo < ALTO_LISTA + 8 && r.top > espacioAbajo;
      setPosicion({ left: r.left, width: r.width, top: arriba ? r.top - 4 : r.bottom + 4, arriba });
    }
    function alDesplazar(e) {
      if (listaRef.current?.contains(e.target)) return;
      ubicar();
    }
    ubicar();
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', alDesplazar, true);
    return () => {
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', alDesplazar, true);
    };
  }, [abierto]);

  // Mantener visible la opción resaltada al moverse con el teclado.
  useEffect(() => {
    listaRef.current?.children[resaltado]?.scrollIntoView({ block: 'nearest' });
  }, [resaltado]);

  function abrir() {
    setQuery('');
    const i = opciones.findIndex((o) => String(o.value) === String(value));
    setResaltado(Math.max(i, 0));
    setAbierto(true);
  }

  function elegir(o) {
    onChange(String(o.value));
    setQuery('');
    setAbierto(false);
  }

  function alPulsarTecla(e) {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      abrir();
      return;
    }
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtradas[resaltado]) elegir(filtradas[resaltado]);
    } else if (e.key === 'Escape') {
      // Solo cierra la lista, no el Modal que la contiene.
      e.nativeEvent.stopPropagation();
      setAbierto(false);
    } else if (e.key === 'Tab') {
      setAbierto(false);
    }
  }

  const textoSeleccion = seleccionada
    ? `${seleccionada.label}${seleccionada.detalle ? ` · ${seleccionada.detalle}` : ''}`
    : '';

  return (
    <div className="relative" ref={contenedorRef}>
      {label && (
        <label htmlFor={id} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          autoComplete="off"
          required={required && !seleccionada}
          value={abierto ? query : textoSeleccion}
          onFocus={abrir}
          onClick={() => !abierto && abrir()}
          onChange={(e) => {
            setQuery(e.target.value);
            setResaltado(0);
            if (!abierto) setAbierto(true);
          }}
          onKeyDown={alPulsarTecla}
          placeholder={abierto && textoSeleccion ? textoSeleccion : placeholder}
          title={textoSeleccion || undefined}
          className={`${CONTROL} pr-8 truncate`}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 transition-transform ${
            abierto ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {abierto &&
        posicion &&
        createPortal(
          <ul
            ref={listaRef}
            role="listbox"
            style={{
              left: posicion.left,
              width: posicion.width,
              maxHeight: ALTO_LISTA,
              ...(posicion.arriba
                ? { bottom: window.innerHeight - posicion.top }
                : { top: posicion.top }),
            }}
            className="fixed z-[70] overflow-y-auto rounded-md border border-line bg-white shadow-lg"
          >
            {filtradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink/50">{mensajeVacio}</li>
            ) : (
              filtradas.map((o, i) => {
                const elegida = String(o.value) === String(value);
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={elegida}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(o)}
                    onMouseEnter={() => setResaltado(i)}
                    className={`px-3 py-2 text-sm cursor-pointer border-b border-line/60 last:border-0 ${
                      i === resaltado ? 'bg-paper' : ''
                    } ${elegida ? 'text-celeste-dark font-medium' : 'text-ink'}`}
                  >
                    <p className="truncate">{o.label}</p>
                    {o.detalle && <p className="text-xs text-ink/50 truncate">{o.detalle}</p>}
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )}
      {abierto && filtradas.length > 0 && (
        <p className="sr-only" aria-live="polite">
          {filtradas.length} resultado(s)
        </p>
      )}
    </div>
  );
}
