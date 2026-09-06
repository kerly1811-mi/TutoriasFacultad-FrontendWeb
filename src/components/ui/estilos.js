// Clase base compartida por los controles de formulario (Input, Select, Textarea).
// Es exactamente la que estaba repetida en Login, Registro, Espacios y Reservas.
export const CONTROL =
  'w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/40 focus:border-azul';

// Modificador cuando el campo tiene error de validación.
export const CONTROL_ERROR = 'border-danger focus:ring-danger/30 focus:border-danger';

export const ETIQUETA_CAMPO = 'block text-sm font-medium text-ink/80 mb-1.5';
