import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ETIQUETA_CAMPO } from './estilos';

const CX = 100;
const CY = 100;
const R_EXTERIOR = 78;
const R_INTERIOR = 48;
const R_MINUTOS = 78;

// Aro exterior del reloj de horas: 12, 1, 2 ... 11 (índice 0 = arriba = 12).
const HORAS_EXTERIOR = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Aro interior: 0, 13, 14 ... 23 (formato 24h).
const HORAS_INTERIOR = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function anguloDe(indice) {
  return indice * 30 - 90; // grados; índice 0 apunta arriba
}

function puntoEn(radio, angulo) {
  const rad = (angulo * Math.PI) / 180;
  return { x: CX + radio * Math.cos(rad), y: CY + radio * Math.sin(rad) };
}

function indiceHoraExterior(h) {
  return h % 12; // 12->0, 1->1 ... 11->11
}
function indiceHoraInterior(h) {
  return h === 0 ? 0 : h - 12; // 0->0, 13->1 ... 23->11
}

/**
 * Selector de hora estilo reloj analógico (como el selector nativo de Android/Material):
 * se puede escribir la hora directo, o abrir el reloj con el botón de al lado.
 */
export default function SelectorHora({ label, value, onChange, className = '', id, name, required, hint, error }) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState('hora'); // 'hora' | 'minuto'
  const [posicion, setPosicion] = useState(null); // { top, left } en coords de viewport
  const contenedorRef = useRef(null);
  const popoverRef = useRef(null);
  const campoId = id || name;

  const [hTxt = '', mTxt = ''] = (value || '').split(':');
  const horaActual = /^\d{1,2}$/.test(hTxt) ? Math.min(23, Number(hTxt)) : null;
  const minutoActual = /^\d{1,2}$/.test(mTxt) ? Math.min(59, Number(mTxt)) : null;

  useEffect(() => {
    if (!abierto) return undefined;
    setModo('hora');

    function calcularPosicion() {
      const r = contenedorRef.current?.getBoundingClientRect();
      if (!r) return;
      // 232px = alto aprox. del popover. Si no cabe abajo, se abre hacia arriba.
      const abajo = window.innerHeight - r.bottom > 260;
      setPosicion({
        left: r.left,
        top: abajo ? r.bottom + 4 : r.top - 4,
        haciaArriba: !abajo,
      });
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

  function fijar(hh, mm) {
    const h2 = String(hh ?? horaActual ?? 0).padStart(2, '0');
    const m2 = String(mm ?? minutoActual ?? 0).padStart(2, '0');
    onChange(`${h2}:${m2}`);
  }

  function elegirHora(hh) {
    fijar(hh, null);
    setModo('minuto');
  }

  function elegirMinuto(mm) {
    fijar(null, mm);
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
        <input
          id={campoId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:MM"
          maxLength={5}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
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
            <div className="flex items-center justify-center gap-1 mb-3 font-display text-2xl text-ink select-none">
              <button
                type="button"
                onClick={() => setModo('hora')}
                className={`rounded px-2 ${modo === 'hora' ? 'bg-azul/10 text-azul' : 'text-ink/40 hover:text-ink'}`}
              >
                {horaActual !== null ? String(horaActual).padStart(2, '0') : '--'}
              </button>
              <span className="text-ink/30">:</span>
              <button
                type="button"
                onClick={() => setModo('minuto')}
                className={`rounded px-2 ${modo === 'minuto' ? 'bg-azul/10 text-azul' : 'text-ink/40 hover:text-ink'}`}
              >
                {minutoActual !== null ? String(minutoActual).padStart(2, '0') : '--'}
              </button>
            </div>

            {modo === 'hora' ? (
              <DialHora horaActual={horaActual} onElegir={elegirHora} />
            ) : (
              <DialMinuto minutoActual={minutoActual} onElegir={elegirMinuto} />
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

function DialHora({ horaActual, onElegir }) {
  const enExterior = horaActual === null || horaActual === 12 || (horaActual >= 1 && horaActual <= 11);
  const angulo = horaActual === null ? null : anguloDe(enExterior ? indiceHoraExterior(horaActual) : indiceHoraInterior(horaActual));
  const radioMano = enExterior ? R_EXTERIOR : R_INTERIOR;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto select-none">
      <circle cx={CX} cy={CY} r={R_EXTERIOR + 14} fill="#EDF3FA" />
      {angulo !== null && <Mano angulo={angulo} radio={radioMano} />}
      {HORAS_EXTERIOR.map((h, i) => {
        const { x, y } = puntoEn(R_EXTERIOR, anguloDe(i));
        const activo = horaActual === h;
        return (
          <g key={`ext-${h}`} onClick={() => onElegir(h)} className="cursor-pointer">
            <circle cx={x} cy={y} r="13" fill={activo ? '#00529B' : 'transparent'} />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[13px]"
              fill={activo ? '#fff' : '#0F243A'}
            >
              {h}
            </text>
          </g>
        );
      })}
      {HORAS_INTERIOR.map((h, i) => {
        const { x, y } = puntoEn(R_INTERIOR, anguloDe(i));
        const activo = horaActual === h;
        return (
          <g key={`int-${h}`} onClick={() => onElegir(h)} className="cursor-pointer">
            <circle cx={x} cy={y} r="11" fill={activo ? '#00529B' : 'transparent'} />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[11px]"
              fill={activo ? '#fff' : '#0F243A80'}
            >
              {h}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DialMinuto({ minutoActual, onElegir }) {
  const indiceActivo = minutoActual !== null && minutoActual % 5 === 0 ? minutoActual / 5 : null;
  const angulo = indiceActivo !== null ? anguloDe(indiceActivo) : null;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto select-none">
      <circle cx={CX} cy={CY} r={R_MINUTOS + 14} fill="#EDF3FA" />
      {angulo !== null && <Mano angulo={angulo} radio={R_MINUTOS} />}
      {MINUTOS.map((m, i) => {
        const { x, y } = puntoEn(R_MINUTOS, anguloDe(i));
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

function IconoReloj() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
