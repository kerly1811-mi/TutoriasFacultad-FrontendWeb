import Layout from '../components/layout/Layout';
import { Card, PageHeader } from '../components/ui';

// Placeholder: historial de asistencia y documentos por tutoría, todavía no implementado.
export default function MisTutorias() {
  return (
    <Layout>
      <PageHeader
        titulo="Mis tutorías"
        descripcion="Documentos y registro de las tutorías a las que has asistido."
      />

      <Card padding="p-12" className="mt-6 text-center">
        <p className="font-display text-lg text-ink">Aún no hay tutorías registradas</p>
        <p className="text-sm text-ink/50 mt-2 max-w-sm mx-auto">
          Cuando asistas a una tutoría, aquí verás el material que compartió el docente junto con tu historial de
          asistencia. Esta función está en construcción.
        </p>
      </Card>
    </Layout>
  );
}
