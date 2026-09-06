/**
 * Contenedor con borde y fondo. Reemplaza `border border-line bg-white rounded-lg p-*`.
 * `destacado` aplica el estilo ocre (tarjeta "Pendientes" del panel).
 */
export default function Card({
  as: Tag = 'div',
  padding = 'p-5',
  destacado = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={[
        'rounded-lg border',
        destacado ? 'border-celeste/40 bg-celeste/5' : 'border-line bg-white',
        padding,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
