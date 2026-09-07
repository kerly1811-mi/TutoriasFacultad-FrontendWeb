import Layout from '../components/layout/Layout';
import { Card, PageHeader } from '../components/ui';

// Placeholder: matriculación de estudiantes en un curso, todavía no implementado.
export default function Matriculas() {
  return (
    <Layout>
      <PageHeader titulo="Matrículas" descripcion="Matricula estudiantes en un curso." />

      <Card padding="p-12" className="mt-6 text-center">
        <p className="font-display text-lg text-ink">Aún no hay matrículas registradas</p>
        <p className="text-sm text-ink/50 mt-2 max-w-sm mx-auto">
          Desde aquí podrás matricular a un estudiante en un curso. Esta función está en construcción.
        </p>
      </Card>
    </Layout>
  );
}
