import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { Button, Card, PageHeader } from '../components/ui';

// Placeholder: la funcionalidad de solicitudes (estudiante -> docente) todavía no está implementada.
export default function Solicitudes() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'DOCENTE';

  return (
    <Layout>
      <PageHeader
        titulo={esDocente ? 'Mis solicitudes' : 'Solicitudes'}
        descripcion={
          esDocente
            ? 'Solicitudes de reserva que te envíen los estudiantes para una tutoría.'
            : 'Solicita una reserva a un docente para una tutoría.'
        }
      />

      <Card padding="p-12" className="mt-6 text-center">
        <p className="font-display text-lg text-ink">
          {esDocente ? 'Aún no has recibido solicitudes' : 'Aún no puedes enviar solicitudes'}
        </p>
        <p className="text-sm text-ink/50 mt-2 max-w-sm mx-auto">
          {esDocente
            ? 'Cuando un estudiante te pida una tutoría, la solicitud aparecerá en esta lista para que la aceptes o la rechaces.'
            : 'Desde aquí podrás pedirle a un docente que reserve un espacio para una tutoría contigo. Esta función está en construcción.'}
        </p>

        {!esDocente && (
          <Button disabled className="mt-6">
            Solicitar reserva
          </Button>
        )}
        {!esDocente && <p className="text-xs text-ink/40 mt-2">Próximamente</p>}
      </Card>
    </Layout>
  );
}
