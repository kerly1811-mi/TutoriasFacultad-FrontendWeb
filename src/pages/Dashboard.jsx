import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { DESCRIPCION_ROL } from '../lib/constantes';
import { NAV, puede } from '../lib/permisos';
import { formatearFechaLarga } from '../lib/formato';
import { Card } from '../components/ui';

const DESCRIPCION_SECCION = {
  '/tutorias': 'Tutorías habilitadas: aula, hora y docente.',
  '/reservar': 'Reserva un espacio para una tutoría.',
  '/reservas': 'Tus reservas y su estado.',
  '/horarios': 'Carga el horario semanal de clases de cada aula.',
  '/ocupacion': 'Qué aulas están en clase, reservadas o libres.',
  '/espacios': 'Alta, edición y mantenimiento de aulas y laboratorios.',
  '/usuarios': 'Da de alta docentes, laboratoristas y administradores.',
  '/control-acceso': 'Asistencia registrada en cada tutoría.',
  '/reportes': 'Ocupación de espacios y reservas por docente.',
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;

  const secciones = NAV.filter((item) => item.to !== '/dashboard' && puede(item.roles, rol));

  return (
    <Layout>
      <p className="text-sm text-celeste-dark font-medium tracking-wide">{formatearFechaLarga()}</p>
      <h1 className="font-display text-3xl text-ink mt-1">Hola, {usuario?.nombres}</h1>
      <p className="text-ink/60 mt-2 max-w-lg">{DESCRIPCION_ROL[rol]}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {secciones.map((s) => (
          <Card key={s.to} as={Link} to={s.to} className="hover:border-azul/40 transition-colors block">
            <p className="font-display text-lg text-ink">{s.etiqueta}</p>
            <p className="text-sm text-ink/60 mt-1">{DESCRIPCION_SECCION[s.to]}</p>
            <span className="inline-block text-sm text-azul font-medium mt-3">Ir →</span>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
