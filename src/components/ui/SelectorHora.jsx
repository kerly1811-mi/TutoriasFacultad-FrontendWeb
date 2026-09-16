import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ETIQUETA_CAMPO } from './estilos';

const CX = 100;
const CY = 100;
const R_HORAS = 78;
const R_MINUTOS = 78;

const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function anguloDe(indice, total) {
  return (indice * 360) / total - 90; // grados; índice 0 apunta arriba
}

function puntoEn(radio, angulo) {
  const rad = (angulo * Math.PI) / 180;
  return { x: CX + radio * Math.cos(rad), y: CY + radio * Math.sin(rad) };
}

function rango(desde, hasta) {
  const out = [];
  for (let i = desde; i <= hasta; i++) out.push(i);
  return out;
}

// "14:05" -> { hora: '2', minuto: '05', ampm: 'PM' } (formato 12h para los segmentos escribibles)
function segmentosDesde24h(valor) {
  if (!/^\d{1,2}:\d{2}$/.test(valor || '')) return { hora: '', minuto: '', ampm: '' };
  const [h, m] = valor.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { hora: String(h12), minuto: String(m).padStart(2, '0'), ampm };
}

// (hora 1-12, minuto 0-59, 'AM'|'PM') -> "HH:MM" en 24h
function combinarA24h(hora12, minuto, ampm) {
  let h = Number(hora12) % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

/**
 * Selector de hora: los tres campos (hora, minuto, a.m./p.m.) se escriben como en el
 * input nativo del navegador -- se autoavanza al siguiente y "a"/"p" elige am/pm --,
 * y el botón del reloj abre una ruleta analógica para elegir con el mouse.
 * `horaMin`/`horaMax` (en formato 24h) acotan qué horas se pueden elegir en la ruleta.
 */
export default function SelectorHora({
  label,
  value,
  onChange,
  className = '',
  id,
  name,
  required,
  hint,
  error,
  horaMin = 0,
  horaMax = 23,
}) {
  const [segmentos, setSegmentos] = useState(() => segmentosDesde24h(value));
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState('hora'); // 'hora' | 'minuto'
  const [posicion, setPosicion] = useState(null);
  const contenedorRef = useRef(null);
  const popoverRef = useRef(null);
  const refHora = useRef(null);
  const refMinuto = useRef(null);
  const refAmPm = useRef(null);
  const campoId = id || name;
  const HORAS = rango(horaMin, horaMax);

  // Si el valor cambia desde afuera (p. ej. al elegir en la ruleta, o al editar un
  // registro existente), sincroniza los tres segmentos escribibles.
  useEffect(() => {
    setSegmentos(segmentosDesde24h(value));
  }, [value]);

  function emitir(nuevo) {
    setSegmentos(nuevo);
    if (nuevo.hora && nuevo.minuto.length === 2 && nuevo.ampm) {
      onChange(combinarA24h(nuevo.hora, nuevo.minuto, nuevo.ampm));
    } else if (!nuevo.hora && !nuevo.minuto && !nuevo.ampm) {
      onChange('');
    }
  }

  function manejarHora(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    if (raw === '') return emitir({ ...segmentos, hora: '' });
    if (raw.length === 1) {
      if (Number(raw) > 1) {
        emitir({ ...segmentos, hora: raw });
        refMinuto.current?.focus();
        refMinuto.current?.select();
        return;
      }
      return emitir({ ...segmentos, hora: raw });
    }
    const n = Math.min(12, Math.max(1, Number(raw)));
    emitir({ ...segmentos, hora: String(n) });
    refMinuto.current?.focus();
    refMinuto.current?.select();
  }

  function manejarMinuto(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    if (raw === '') return emitir({ ...segmentos, minuto: '' });
    if (raw.length === 1) {
      if (Number(raw) > 5) {
        emitir({ ...segmentos, minuto: raw.padStart(2, '0') });
        refAmPm.current?.focus();
        return;
      }
      return emitir({ ...segmentos, minuto: raw });
    }
    const n = Math.min(59, Number(raw));
    emitir({ ...segmentos, minuto: String(n).padStart(2, '0') });
    refAmPm.current?.focus();
  }

  function manejarTeclaAmPm(e) {
    const tecla = e.key.toLowerCase();
    if (tecla === 'a') {
      e.preventDefault();
      emitir({ ...segmentos, ampm: 'AM' });
    } else if (tecla === 'p') {
      e.preventDefault();
      emitir({ ...segmentos, ampm: 'PM' });
    } else if (tecla === 'backspace') {
      e.preventDefault();
      emitir({ ...segmentos, ampm: '' });
      refMinuto.current?.focus();
    } else if (tecla === 'arrowup' || tecla === 'arrowdown') {
      e.preventDefault();
      emitir({ ...segmentos, ampm: segmentos.ampm === 'AM' ? 'PM' : 'AM' });
    }
  }

  function manejarTeclaHora(e) {
    if (e.key === 'Backspace' && !e.target.value) {
      e.preventDefault();
    }
  }

  // --- Ruleta ---
  useEffect(() => {
    if (!abierto) return undefined;
    setModo('hora');

    function calcularPosicion() {
      const r = contenedorRef.current?.getBoundingClientRect();
      if (!r) return;
      const abajo = window.innerHeight - r.bottom > 260;
      setPosicion({ left: r.left, top: abajo ? r.bottom + 4 : r.top - 4, haciaArriba: !abajo });
    }
    calcularPosicion();

    function alClickFuera(e) {
      if (contenedorRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setAbierto(false);
    }
    function alPulsarTecla(e) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alClickFuera);
    document.addEventListener('keydown', alPulsarTecla);
    window.addEventListener('resize', calcularPosicion);
    window.addEventListener('scroll', calcularPosicion, true);
    return () => {
      document.removeEventListener('mousedown', alClickFuera);
      document.removeEventListener('keydown', alPulsarTecla);
      window.removeEventListener('resize', calcularPosicion);
      window.removeEventListener('scroll', calcularPosicion, true);
    };
  }, [abierto]);

  const horaActual24 = /^\d{1,2}:\d{2}$/.test(value || '') ? Number(value.split(':')[0]) : null;
  const minutoActual24 = /^\d{1,2}:\d{2}$/.test(value || '') ? Number(value.split(':')[1]) : null;

  function elegirHoraRuleta(hh) {
    const s = segmentosDesde24h(`${String(hh).padStart(2, '0')}:${segmentos.minuto || '00'}`);
    emitir(s);
    setModo('minuto');
  }

  function elegirMinutoRuleta(mm) {
    const baseHora = horaActual24 ?? horaMin;
    const s = segmentosDesde24h(`${String(baseHora).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    emitir(s);
    setAbierto(false);
  }

  return (
    <div className={`relative ${className}`} ref={contenedorRef}>
      {label && (
        <label htmlFor={campoId} className={ETIQUETA_CAMPO}>
          {label}
        </label>
      )}
      <div
        className={`flex items-stretch rounded-md border bg-white overflow-hidden focus-within:ring-2 focus-within:ring-azul/40 focus-within:border-azul ${
          error ? 'border-danger' : 'border-line'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 pl-3 pr-1 py-2 text-sm">
          <input
            ref={refHora}
            id={campoId}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="--"
            maxLength={2}
            required={required}
            value={segmentos.hora}
            onChange={manejarHora}
            onKeyDown={manejarTeclaHora}
            onFocus={(e) => e.target.select()}
            className="w-6 shrink-0 bg-transparent outline-none text-center"
          />
          <span className="text-ink/30">:</span>
          <input
            ref={refMinuto}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="--"
            maxLength={2}
            value={segmentos.minuto}
            onChange={manejarMinuto}
            onFocus={(e) => e.target.select()}
            className="w-6 shrink-0 bg-transparent outline-none text-center"
          />
          <input
            ref={refAmPm}
            type="text"
            readOnly
            autoComplete="off"
            placeholder="--"
            value={segmentos.ampm === 'AM' ? 'a. m.' : segmentos.ampm === 'PM' ? 'p. m.' : ''}
            onKeyDown={manejarTeclaAmPm}
            onFocus={(e) => e.target.select()}
            className="w-11 shrink-0 bg-transparent outline-none text-center text-xs cursor-default caret-transparent"
          />
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Elegir hora"
          title="Elegir hora"
          className="shrink-0 border-l border-line px-2.5 text-ink/40 hover:text-azul hover:bg-paper transition-colors"
        >
          <IconoReloj />
        </button>
      </div>

      {hint && !error && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}

      {abierto &&
        posicion &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: posicion.top,
              left: posicion.left,
              transform: posicion.haciaArriba ? 'translateY(-100%)' : undefined,
            }}
            className="z-[100] w-56 rounded-lg border border-line bg-white shadow-xl p-4"
          >
            <div className="flex items-center justify-center gap-1 mb-3 relative">
              {modo === 'minuto' && (
                <button
                  type="button"
                  onClick={() => setModo('hora')}
                  aria-label="Volver a elegir la hora"
                  title="Volver a elegir la hora"
                  className="absolute left-0 text-ink/40 hover:text-azul transition-colors p-1"
                >
                  <IconoFlechaVolver />
                </button>
              )}
              <div className="font-display text-2xl text-ink select-none flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setModo('hora')}
                  className={`rounded px-2 ${modo === 'hora' ? 'bg-azul/10 text-azul' : 'text-ink/40 hover:text-ink'}`}
                >
                  {horaActual24 !== null ? String(horaActual24).padStart(2, '0') : '--'}
                </button>
                <span className="text-ink/30">:</span>
                <button
                  type="button"
                  onClick={() => setModo('minuto')}
                  className={`rounded px-2 ${modo === 'minuto' ? 'bg-azul/10 text-azul' : 'text-ink/40 hover:text-ink'}`}
                >
                  {minutoActual24 !== null ? String(minutoActual24).padStart(2, '0') : '--'}
                </button>
              </div>
            </div>

            {modo === 'hora' ? (
              <DialHora horas={HORAS} horaActual={horaActual24} onElegir={elegirHoraRuleta} />
            ) : (
              <DialMinuto minutoActual={minutoActual24} onElegir={elegirMinutoRuleta} />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function Mano({ angulo, radio }) {
  const punta = puntoEn(radio, angulo);
  return (
    <>
      <line x1={CX} y1={CY} x2={punta.x} y2={punta.y} stroke="#00529B" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="3" fill="#00529B" />
    </>
  );
}

function DialHora({ horas, horaActual, onElegir }) {
  const indiceActivo = horaActual !== null ? horas.indexOf(horaActual) : -1;
  const angulo = indiceActivo >= 0 ? anguloDe(indiceActivo, horas.length) : null;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto select-none">
      <circle cx={CX} cy={CY} r={R_HORAS + 14} fill="#EDF3FA" />
      {angulo !== null && <Mano angulo={angulo} radio={R_HORAS} />}
      {horas.map((h, i) => {
        const { x, y } = puntoEn(R_HORAS, anguloDe(i, horas.length));
        const activo = horaActual === h;
        return (
          <g key={h} onClick={() => onElegir(h)} className="cursor-pointer">
            <circle cx={x} cy={y} r="13" fill={activo ? '#00529B' : 'transparent'} />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[13px]"
              fill={activo ? '#fff' : '#0F243A'}
            >
              {String(h).padStart(2, '0')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DialMinuto({ minutoActual, onElegir }) {
  const indiceActivo = minutoActual !== null && minutoActual % 5 === 0 ? minutoActual / 5 : null;
  const angulo = indiceActivo !== null ? anguloDe(indiceActivo, MINUTOS.length) : null;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto select-none">
      <circle cx={CX} cy={CY} r={R_MINUTOS + 14} fill="#EDF3FA" />
      {angulo !== null && <Mano angulo={angulo} radio={R_MINUTOS} />}
      {MINUTOS.map((m, i) => {
        const { x, y } = puntoEn(R_MINUTOS, anguloDe(i, MINUTOS.length));
        const activo = minutoActual === m;
        return (
          <g key={m} onClick={() => onElegir(m)} className="cursor-pointer">
            <circle cx={x} cy={y} r="13" fill={activo ? '#00529B' : 'transparent'} />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[13px]"
              fill={activo ? '#fff' : '#0F243A'}
            >
              {String(m).padStart(2, '0')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function IconoFlechaVolver() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
