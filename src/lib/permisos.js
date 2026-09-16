// Control de acceso por rol. Único lugar donde se decide qué ve/hace cada rol:
// lo consumen App.jsx (guardas de ruta) y Layout (menú lateral).

// --- Menú lateral: etiqueta + roles con acceso (en orden de aparición) ---
export const NAV = [
  { to: '/dashboard', etiqueta: 'Panel', roles: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'] },

  // Estudiante
  { to: '/tutorias', etiqueta: 'Cursos', roles: ['ESTUDIANTE'] },
  { to: '/mis-horarios', etiqueta: 'Horarios', roles: ['ESTUDIANTE'] },
  { to: '/mis-tutorias', etiqueta: 'Mis tutorías', roles: ['ESTUDIANTE'] },

  // Docente
  { to: '/reservas', etiqueta: 'Reservar un espacio', roles: ['DOCENTE'] },

  // Laboratorista
  { to: '/espacios', etiqueta: 'Espacios', roles: ['LABORATORISTA'] },
  { to: '/horarios', etiqueta: 'Horarios', roles: ['LABORATORISTA'] },
  { to: '/ocupacion', etiqueta: 'Ocupación', roles: ['LABORATORISTA'] },

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
  { to: '/control-acceso', etiqueta: 'Control de acceso', roles: ['DOCENTE'] },
  {
    to: '/solicitudes',
    etiqueta: (rol) => (rol === 'DOCENTE' ? 'Mis solicitudes' : 'Solicitudes'),
    roles: ['DOCENTE', 'ESTUDIANTE'],
  },
  { to: '/reportes', etiqueta: 'Reportes', roles: ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'] },
];

// --- Rutas privadas: qué roles pueden entrar a cada una ---
export const ACCESO_RUTA = {
  '/dashboard': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/tutorias': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/reservas': ['DOCENTE', 'ADMINISTRADOR'],
  '/reservas/:id': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  '/horarios': ['LABORATORISTA'],
  '/ocupacion': ['LABORATORISTA'],
  '/espacios': ['LABORATORISTA'],
  '/usuarios': ['ADMINISTRADOR'],
  '/carreras': ['ADMINISTRADOR'],
  '/materias': ['ADMINISTRADOR'],
  '/paralelos': ['ADMINISTRADOR'],
  '/matriculas': ['ADMINISTRADOR'],
  '/control-acceso': ['DOCENTE'],
  '/solicitudes': ['DOCENTE', 'ESTUDIANTE'],
  '/mis-horarios': ['ESTUDIANTE'],
  '/mis-tutorias': ['ESTUDIANTE'],
  '/reportes': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
};

// A dónde mandar a cada rol tras iniciar sesión / si entra a una ruta sin permiso.
export const INICIO_POR_ROL = {
  ESTUDIANTE: '/tutorias',
  DOCENTE: '/reservas',
  LABORATORISTA: '/ocupacion',
  ADMINISTRADOR: '/usuarios',
};

// Acciones dentro de una reserva.
export const PUEDE_VER_ASISTENCIA = ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'];
export const PUEDE_COMPARTIR_DOCUMENTO = ['DOCENTE', 'ADMINISTRADOR'];

export function puede(roles, rol) {
  return Array.isArray(roles) && roles.includes(rol);
}
