# Espacios FISEI - Frontend Web

Frontend **web** del sistema de gestión de espacios y tutorías (React + Vite + TailwindCSS),
consumiendo la API real del backend (`backend-facultad`).

> Este repositorio cubre **solo la aplicación web**. El escaneo de QR, el registro de
> asistencia, las notificaciones push y el historial personal del estudiante pertenecen a
> la aplicación móvil (repositorio aparte).

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y ajusta la URL si tu backend no corre en el puerto 3000:

```
VITE_API_URL=http://localhost:3000/api
```

## Ejecutar en desarrollo

Con el backend corriendo en otra terminal (`node index.js`):

```bash
npm run dev
```

## Estructura

```
src/
  api/
    client.js            Instancia axios + interceptores (token JWT / logout automático)
    endpoints/            Wrappers por recurso (auth, espacios, reservas, asistencias, documentos)
  components/
    ui/                   Librería propia: Button, Input, Select, Textarea, Alert, Card,
                          Badge, PageHeader, DataState, Table, Modal (import: '../components/ui')
    layout/               Layout (con sidebar) y AuthLayout (pantallas de acceso)
    ProtectedRoute.jsx
  hooks/
    useApiResource.js     Carga de datos: { data, cargando, error, recargar }
    useForm.js            Estado de formularios controlados
  lib/
    constantes.js         Roles, tipos de espacio, estados de reserva y sus etiquetas
    formato.js            Fechas, horas y helpers de comparación (zona horaria)
  pages/
    Login, Registro, Dashboard, Espacios, Reservas, DetalleReserva,
    Disponibilidad, Reportes
```

## Funcionalidades

- **Acceso**: login + registro público con rol **estudiante, docente o laboratorista**.
  El **administrador** no se registra desde la web (se crea por seed/BD en Supabase).
  El alta de docentes/laboratoristas gestionada por un administrador y el aviso por
  correo institucional (Microsoft 365) quedan planificados para una entrega posterior.
- **Espacios**: listado + alta en modal (alta restringida a `ADMINISTRADOR`, igual que el backend).
- **Reservas**: listado con filtros (estado / fecha) + alta en modal.
- **Detalle de reserva** (`/reservas/:id`):
  - Datos de la reserva.
  - **Asistencia registrada**: listado de estudiantes que marcaron asistencia
    (`GET /api/asistencias/reserva/:id`), visible para docente / laboratorista / admin.
  - **Documentos compartidos**: listado (`GET /api/documentos/reserva/:id`) y formulario
    para compartir enlaces (`POST /api/documentos`), disponible para docente / admin.
- **Disponibilidad** (`/disponibilidad`): grid de aulas/labs libres u ocupados según fecha
  y franja horaria (cálculo en el cliente sobre reservas + espacios).
- **Reportes** (`/reportes`): ocupación por espacio y totales por estado (cálculo en el cliente).

## Pendiente (bloqueado por el backend)

Requieren endpoints que hoy no existen; no se implementan en el front hasta tenerlos:

- **Asignar docente a la reserva**: falta `GET /api/usuarios?rol=DOCENTE` para el selector
  (el `POST /api/reservas` ya acepta `id_doc_asignado`).
- **Horarios de docentes (libres/ocupados)**: no hay módulo de horarios ni listado de usuarios.
- **Editar espacio / estado / mantenimiento**: no hay `PUT/PATCH /api/espacios/:id` y el
  modelo `Espacio` no tiene campo de estado.
- **Aprobar / rechazar reservas**: no hay `PATCH /api/reservas/:id`; el estado es de solo lectura.
- **Reporte de asistencia agregado** (global, no por reserva): falta endpoint de agregación.
- **Notificaciones**: sin endpoint.
