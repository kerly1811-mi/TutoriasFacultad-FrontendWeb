// Catálogos que el frontend comparte con el backend.
// Los valores en MAYÚSCULAS coinciden con lo que espera/devuelve la API.

// --- Roles de usuario (enum RolUsuario) ---
export const ROLES = ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR', 'LABORATORISTA'];

export const ETIQUETA_ROL = {
  ESTUDIANTE: 'Estudiante',
  DOCENTE: 'Docente',
  ADMINISTRADOR: 'Administrador',
  LABORATORISTA: 'Laboratorista',
};

// Texto de bienvenida por rol que se muestra en el panel.
export const DESCRIPCION_ROL = {
  ESTUDIANTE: 'Consulta qué tutorías están habilitadas y en qué aula.',
  DOCENTE: 'Reserva espacios para tus tutorías y revisa tus reservas.',
  ADMINISTRADOR: 'Administra los usuarios, los cursos, las matrículas y los reportes.',
  LABORATORISTA: 'Administra los espacios, carga los horarios de clases y controla la ocupación de las aulas.',
};

// --- Tipos de espacio (enum TipoEspacio) ---
export const TIPOS_ESPACIO = ['AULA', 'LABORATORIO'];

export const ETIQUETA_TIPO_ESPACIO = {
  AULA: 'Aula',
  LABORATORIO: 'Laboratorio',
};

// --- Bloque y piso del espacio (enum BloqueEspacio + piso condicionado al bloque) ---
export const BLOQUES_ESPACIO = ['BLOQUE_1', 'BLOQUE_2'];

export const ETIQUETA_BLOQUE = {
  BLOQUE_1: 'Bloque 1',
  BLOQUE_2: 'Bloque 2',
};

// Bloque 1: pisos numerados 1-3. Bloque 2: pisos identificados por letra C-J.
export const PISOS_POR_BLOQUE = {
  BLOQUE_1: ['1', '2', '3'],
  BLOQUE_2: ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
};

export const OPCIONES_BLOQUE = BLOQUES_ESPACIO.map((valor) => ({
  value: valor,
  label: ETIQUETA_BLOQUE[valor],
}));

export function opcionesPisoPara(bloque) {
  return (PISOS_POR_BLOQUE[bloque] || []).map((piso) => ({ value: piso, label: piso }));
}

// --- Estado del espacio ---
export const ESTADOS_ESPACIO = ['DISPONIBLE', 'MANTENIMIENTO'];

export const ETIQUETA_ESTADO_ESPACIO = {
  DISPONIBLE: 'Disponible',
  MANTENIMIENTO: 'En mantenimiento',
};

export const ESTILO_ESTADO_ESPACIO = {
  DISPONIBLE: 'bg-success/10 text-success',
  MANTENIMIENTO: 'bg-danger/10 text-danger',
};

// --- Estado de la reserva ---
export const ETIQUETA_ESTADO_RESERVA = {
  RESERVADA: 'Reservada',
  CANCELADA: 'Cancelada',
};

export const ESTILO_ESTADO_RESERVA = {
  RESERVADA: 'bg-success/10 text-success',
  CANCELADA: 'bg-danger/10 text-danger',
};

// --- Días de la semana (coinciden con utils/tiempo.js del backend) ---
export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export const ETIQUETA_DIA = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

// --- Opciones listas para <Select options={...} /> ---
export const OPCIONES_ROL = ROLES.map((valor) => ({ value: valor, label: ETIQUETA_ROL[valor] }));

// Roles que un administrador puede dar de alta desde la pantalla de Usuarios.
export const ROLES_GESTIONABLES = ['DOCENTE', 'LABORATORISTA', 'ADMINISTRADOR'];

export const OPCIONES_ROL_GESTIONABLE = ROLES_GESTIONABLES.map((valor) => ({
  value: valor,
  label: ETIQUETA_ROL[valor],
}));

export const OPCIONES_TIPO_ESPACIO = TIPOS_ESPACIO.map((valor) => ({
  value: valor,
  label: ETIQUETA_TIPO_ESPACIO[valor],
}));

export const OPCIONES_ESTADO_ESPACIO = ESTADOS_ESPACIO.map((valor) => ({
  value: valor,
  label: ETIQUETA_ESTADO_ESPACIO[valor],
}));

export const OPCIONES_DIA = DIAS_SEMANA.map((valor) => ({ value: valor, label: ETIQUETA_DIA[valor] }));

// El control de acceso por rol vive en ./permisos.js
