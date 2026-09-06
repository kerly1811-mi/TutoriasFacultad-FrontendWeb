const VARIANTES = {
  error: 'text-danger bg-danger/5 border-danger/20',
  success: 'text-success bg-success/5 border-success/20',
  info: 'text-ink/70 bg-white border-line',
};

/**
 * Mensaje de estado. Unifica las alertas de error/éxito repetidas.
 * No renderiza nada si no hay children (permite `<Alert>{error}</Alert>`).
 * `inline` usa inline-block (para alertas sueltas sobre la página).
 */
export default function Alert({ variant = 'error', inline = false, className = '', children }) {
  if (!children) return null;
  return (
    <p
      className={[
        'text-sm border rounded-md px-3 py-2',
        inline ? 'inline-block' : '',
        VARIANTES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  );
}
