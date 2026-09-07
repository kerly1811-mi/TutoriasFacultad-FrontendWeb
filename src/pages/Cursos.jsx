import Layout from '../components/layout/Layout';
import { Card, PageHeader } from '../components/ui';

// Placeholder: alta de cursos (materia + paralelo + docente asignado), todavía no implementado.
export default function Cursos() {
  return (
    <Layout>
      <PageHeader titulo="Cursos" descripcion="Crea cursos y asígnales un docente." />

      <Card padding="p-12" className="mt-6 text-center">
        <p className="font-display text-lg text-ink">Aún no hay cursos registrados</p>
        <p className="text-sm text-ink/50 mt-2 max-w-sm mx-auto">
          Desde aquí podrás crear un curso y asignarle el docente que lo dicta. Esta función está en construcción.
        </p>
      </Card>
    </Layout>
  );
}
