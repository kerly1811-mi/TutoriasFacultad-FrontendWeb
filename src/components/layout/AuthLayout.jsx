import fondoFisei from '../../assets/uta_fisei.webp';

/**
 * Envoltura centrada para las pantallas de acceso (Login y Registro).
 * Usa una foto de la FISEI como fondo con un velo claro (blanco con un matiz azul
 * UTA) que deja ver el edificio sin oscurecer la pantalla.
 */
export default function AuthLayout({ titulo, subtitulo, children, footer, ancho = 'max-w-sm' }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      {/* Foto de fondo (edificio de la FISEI) */}
      <img
        src={fondoFisei}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* Velo claro para legibilidad + leve degradado azul institucional */}
      <div className="absolute inset-0 bg-white/80" />
      <div className="absolute inset-0 bg-gradient-to-br from-azul/10 via-transparent to-azul/20" />

      <div className={['relative w-full', ancho].join(' ')}>
        <div className="mb-8 text-center">
          <p className="font-display text-3xl text-ink">{titulo}</p>
          {subtitulo && <p className="text-sm text-ink/60 mt-2">{subtitulo}</p>}
        </div>

        {children}

        {footer && <p className="text-center text-sm text-ink/70 mt-6">{footer}</p>}
      </div>
    </div>
  );
}
