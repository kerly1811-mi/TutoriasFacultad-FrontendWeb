const VARIANTES = {
  primary: 'bg-azul hover:bg-azul-dark text-white',
  secondary: 'border border-line bg-white text-ink/80 hover:bg-paper',
  danger: 'bg-danger hover:bg-danger/90 text-white',
  ghost: 'text-ink/70 hover:bg-white/5',
};

const TAMANOS = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2.5',
};

/**
 * Botón reutilizable.
 * - as: 'button' (por defecto) o un componente (p. ej. Link) para renderizar un enlace
 * - variant: primary | secondary | danger | ghost
 * - size: sm | md
 * - block: ocupa todo el ancho (w-full)
 * - cargando: deshabilita y muestra `textoCargando` en lugar de children
 */
export default function Button({
  as: Tag = 'button',
  type = 'button',
  variant = 'primary',
  size = 'md',
  block = false,
  cargando = false,
  textoCargando,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const esBoton = Tag === 'button';
  return (
    <Tag
      {...(esBoton ? { type, disabled: disabled || cargando } : {})}
      className={[
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-60',
        VARIANTES[variant],
        TAMANOS[size],
        block ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {cargando ? (textoCargando ?? children) : children}
    </Tag>
  );
}
