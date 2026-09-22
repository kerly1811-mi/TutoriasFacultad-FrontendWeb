import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { DESCRIPCION_ROL } from '../lib/constantes';
import PanelAdministrador from '../components/dashboard/PanelAdministrador';
import PanelLaboratorista from '../components/dashboard/PanelLaboratorista';
import PanelDocente from '../components/dashboard/PanelDocente';
import PanelEstudiante from '../components/dashboard/PanelEstudiante';

const PANEL_POR_ROL = {
  ADMINISTRADOR: PanelAdministrador,
  LABORATORISTA: PanelLaboratorista,
  DOCENTE: PanelDocente,
  ESTUDIANTE: PanelEstudiante,
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const Panel = PANEL_POR_ROL[rol];

  return (
    <Layout>
      <h1 className="font-display text-3xl text-ink">Hola, {usuario?.nombres}</h1>
      <p className="text-ink/60 mt-2 max-w-lg">{DESCRIPCION_ROL[rol]}</p>

      {Panel && <Panel />}
    </Layout>
  );
}
