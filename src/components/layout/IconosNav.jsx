// Íconos de la barra lateral, uno por ruta. Trazo simple (24x24, stroke actual).
const props = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const ICONOS = {
  '/dashboard': (
    <svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  '/tutorias': (
    <svg {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  ),
  '/reservas': (
    <svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  '/espacios': (
    <svg {...props}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  '/horarios': (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
    </svg>
  ),
  '/ocupacion': (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  '/usuarios': (
    <svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 4.3a3.2 3.2 0 0 1 0 6.2M21 20c0-2.8-2-4.8-4.5-5.4" />
    </svg>
  ),
  '/cursos': (
    <svg {...props}>
      <path d="M2 6.5 12 3l10 3.5-10 3.5-10-3.5Z" />
      <path d="M6 9.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V9.5" />
      <path d="M22 6.5V13" />
    </svg>
  ),
  '/matriculas': (
    <svg {...props}>
      <path d="M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1" />
      <path d="M4 8h6M4 12h6M4 16h4" />
      <path d="M2 8v8" />
    </svg>
  ),
  '/control-acceso': (
    <svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="m9.5 15 1.8 1.8L14.5 13" />
    </svg>
  ),
  '/solicitudes': (
    <svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
      <path d="M7 8h10M7 11.5h6" />
    </svg>
  ),
  '/mis-tutorias': (
    <svg {...props}>
      <path d="M4 4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z" />
      <path d="M14 2v5h5" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  '/reportes': (
    <svg {...props}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2 20h20" />
    </svg>
  ),
};

const ICONO_DEFECTO = (
  <svg {...props}>
    <circle cx="12" cy="12" r="8" />
  </svg>
);

export function IconoNav({ ruta }) {
  return ICONOS[ruta] || ICONO_DEFECTO;
}
