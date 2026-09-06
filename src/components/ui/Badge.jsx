import { ESTILO_ESTADO_RESERVA, ETIQUETA_ESTADO_RESERVA } from '../../lib/constantes';

/**
 * Etiqueta de color. Si se pasa `estado` (PENDIENTE/APROBADA/RECHAZADA) toma
 * color y texto del catálogo; si no, usa `className` y children libres.
 */
export default function Badge({ estado, className = '', children }) {
  const color = estado ? ESTILO_ESTADO_RESERVA[estado] || 'bg-line text-ink/70' : '';
  const texto = children ?? (estado ? ETIQUETA_ESTADO_RESERVA[estado] || estado : null);
  return (
    <span className={['text-xs font-medium px-2 py-1 rounded', color, className].filter(Boolean).join(' ')}>
      {texto}
    </span>
  );
}
