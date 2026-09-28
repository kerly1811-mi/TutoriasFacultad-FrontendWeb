// Control de acceso por rol. Único lugar donde se decide qué ve/hace cada rol:
// lo consumen App.jsx (guardas de ruta) y Layout (menú lateral).

// --- Menú lateral: etiqueta + roles con acceso (en orden de aparición) ---
export const NAV = [
  { to: '/dashboard', etiqueta: 'Panel', roles: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'] },

  // Estudiante
  { to: '/matricula', etiqueta: 'Matrícula', roles: ['ESTUDIANTE'] },
  { to: '/tutorias', etiqueta: 'Cursos', roles: ['ESTUDIANTE'] },
  { to: '/mis-horarios', etiqueta: 'Horarios', roles: ['ESTUDIANTE'] },
  { to: '/mis-tutorias', etiqueta: 'Mis tutorías', roles: ['ESTUDIANTE'] },
  { to: '/ocupacion', etiqueta: 'Disponibilidad', roles: ['ESTUDIANTE'] },

  // Docente / Administrador
  { to: '/mis-clases', etiqueta: 'Mis clases', roles: ['DOCENTE'] },
  {
    to: '/reservas',
    etiqueta: (rol) => (rol === 'ADMINISTRADOR' ? 'Reservas' : 'Reservar un espacio'),
    roles: ['DOCENTE', 'ADMINISTRADOR'],
  },

  // Laboratorista / Administrador
  { to: '/espacios', etiqueta: 'Espacios', roles: ['LABORATORISTA', 'ADMINISTRADOR'] },
  { to: '/horarios', etiqueta: 'Horarios', roles: ['LABORATORISTA', 'ADMINISTRADOR'] },
  { to: '/ocupacion', etiqueta: 'Ocupación', roles: ['LABORATORISTA', 'ADMINISTRADOR'] },

  // Administrador
  { to: '/usuarios', etiqueta: 'Usuarios', roles: ['ADMINISTRADOR'] },
  {
    to: '/cursos',
    etiqueta: 'Cursos',
    roles: ['ADMINISTRADOR'],
    submenu: [
      { to: '/carreras', etiqueta: 'Carreras' },
      { to: '/materias', etiqueta: 'Materias' },
      { to: '/paralelos', etiqueta: 'Paralelos' },
    ],
  },
  { to: '/matriculas', etiqueta: 'Matrículas', roles: ['ADMINISTRADOR'] },

  // Compartidas
  {
    to: '/control-acceso',
    etiqueta: (rol) => (rol === 'DOCENTE' ? 'Panel de asistencia' : 'Control de acceso'),
    roles: ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  },
  {
    to: '/solicitudes',
    etiqueta: (rol) => (rol === 'DOCENTE' ? 'Mis solicitudes' : rol === 'ADMINISTRADOR' ? 'Todas las solicitudes' : 'Solicitudes'),
    roles: ['DOCENTE', 'ESTUDIANTE', 'ADMINISTRADOR'],
  },
  { to: '/reportes', etiqueta: 'Reportes', roles: ['DOCENTE', 'ADMINISTRADOR'] },
];

// --- Rutas privadas: qué roles pueden entrar a cada una ---
export const ACCESO_RUTA = {
  '/dashboard': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/tutorias': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/reservas': ['DOCENTE', 'ADMINISTRADOR'],
  '/reservas/:id': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  '/horarios': ['LABORATORISTA', 'ADMINISTRADOR'],
  '/ocupacion': ['LABORATORISTA', 'ADMINISTRADOR', 'ESTUDIANTE'],
  '/espacios': ['LABORATORISTA', 'ADMINISTRADOR'],
  '/usuarios': ['ADMINISTRADOR'],
  '/carreras': ['ADMINISTRADOR'],
  '/materias': ['ADMINISTRADOR'],
  '/paralelos': ['ADMINISTRADOR'],
  '/matriculas': ['ADMINISTRADOR'],
  '/control-acceso': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  '/solicitudes': ['DOCENTE', 'ESTUDIANTE', 'ADMINISTRADOR'],
  '/mis-horarios': ['ESTUDIANTE'],
  '/mis-tutorias': ['ESTUDIANTE'],
  '/matricula': ['ESTUDIANTE'],
  '/mis-clases': ['DOCENTE'],
  '/reportes': ['DOCENTE', 'ADMINISTRADOR'],
};

// Orden del menú lateral solo para ESTUDIANTE (los demás roles usan el orden de
// aparición en NAV). Las rutas no listadas aquí no deberían aplicar a este rol.
export const ORDEN_NAV_ESTUDIANTE = [
  '/dashboard',
  '/tutorias',
  '/mis-tutorias',
  '/mis-horarios',
  '/ocupacion',
  '/solicitudes',
  '/matricula',
];

// A dónde mandar a cada rol tras iniciar sesión / si entra a una ruta sin permiso.
export const INICIO_POR_ROL = {
  ESTUDIANTE: '/tutorias',
  DOCENTE: '/reservas',
  LABORATORISTA: '/ocupacion',
  ADMINISTRADOR: '/dashboard',
};

// Acciones dentro de una reserva.
export const PUEDE_VER_ASISTENCIA = ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'];
export const PUEDE_COMPARTIR_DOCUMENTO = ['DOCENTE', 'ADMINISTRADOR'];

export function puede(roles, rol) {
  return Array.isArray(roles) && roles.includes(rol);
}
