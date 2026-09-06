// Control de acceso por rol. Único lugar donde se decide qué ve/hace cada rol:
// lo consumen App.jsx (guardas de ruta) y Layout (menú lateral).

// --- Menú lateral: etiqueta + roles con acceso (en orden de aparición) ---
export const NAV = [
  { to: '/dashboard', etiqueta: 'Panel', roles: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'] },

  // Estudiante
  { to: '/tutorias', etiqueta: 'Tutorías', roles: ['ESTUDIANTE'] },

  // Docente
  { to: '/reservar', etiqueta: 'Reservar', roles: ['DOCENTE'] },
  { to: '/reservas', etiqueta: 'Mis reservas', roles: ['DOCENTE'] },

  // Laboratorista
  { to: '/horarios', etiqueta: 'Horarios', roles: ['LABORATORISTA'] },
  { to: '/ocupacion', etiqueta: 'Ocupación', roles: ['LABORATORISTA'] },

  // Administrador
  { to: '/espacios', etiqueta: 'Espacios', roles: ['ADMINISTRADOR'] },
  { to: '/usuarios', etiqueta: 'Usuarios', roles: ['ADMINISTRADOR'] },

  // Compartidas
  { to: '/control-acceso', etiqueta: 'Control de acceso', roles: ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'] },
  { to: '/reportes', etiqueta: 'Reportes', roles: ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'] },
];

// --- Rutas privadas: qué roles pueden entrar a cada una ---
export const ACCESO_RUTA = {
  '/dashboard': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/tutorias': ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'],
  '/reservar': ['DOCENTE'],
  '/reservas': ['DOCENTE', 'ADMINISTRADOR'],
  '/reservas/:id': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  '/horarios': ['LABORATORISTA'],
  '/ocupacion': ['LABORATORISTA'],
  '/espacios': ['ADMINISTRADOR'],
  '/usuarios': ['ADMINISTRADOR'],
  '/control-acceso': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
  '/reportes': ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'],
};

// A dónde mandar a cada rol tras iniciar sesión / si entra a una ruta sin permiso.
export const INICIO_POR_ROL = {
  ESTUDIANTE: '/tutorias',
  DOCENTE: '/reservar',
  LABORATORISTA: '/ocupacion',
  ADMINISTRADOR: '/espacios',
};

// Acciones dentro de una reserva.
export const PUEDE_VER_ASISTENCIA = ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'];
export const PUEDE_COMPARTIR_DOCUMENTO = ['DOCENTE', 'ADMINISTRADOR'];

export function puede(roles, rol) {
  return Array.isArray(roles) && roles.includes(rol);
}
