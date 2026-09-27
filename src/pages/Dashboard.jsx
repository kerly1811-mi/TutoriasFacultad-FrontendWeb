import { useAuth } from '../context/AuthContext';
import { DESCRIPCION_ROL, ETIQUETA_ROL } from '../lib/constantes';
import { formatearFechaLarga } from '../lib/formato';
import { Badge } from '../components/ui';
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

const ESTILOS_ROL = {
  ADMINISTRADOR: 'bg-azul/15 text-azul font-semibold',
  DOCENTE: 'bg-purple-100 text-purple-700 font-semibold',
  LABORATORISTA: 'bg-amber-100 text-amber-700 font-semibold',
  ESTUDIANTE: 'bg-success/15 text-success font-semibold',
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const Panel = PANEL_POR_ROL[rol];
  const hoyTexto = formatearFechaLarga(new Date());

  return (
    <div className="space-y-4">
      {/* Banner / Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-line/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl text-ink font-semibold">
              Hola, {usuario?.nombres}
            </h1>
            {rol && (
              <Badge className={ESTILOS_ROL[rol] || 'bg-line text-ink'}>
                {ETIQUETA_ROL[rol] || rol}
              </Badge>
            )}
          </div>
          <p className="text-ink/60 mt-1 text-sm">{DESCRIPCION_ROL[rol]}</p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-ink/40 font-medium">Fecha actual</p>
          <p className="text-sm font-medium text-ink/80 capitalize">{hoyTexto}</p>
        </div>
      </div>

      {/* Panel específico según rol */}
      {Panel ? (
        <Panel />
      ) : (
        <div className="p-8 text-center text-ink/50 bg-white rounded-lg border border-line">
          No se encontró un panel configurado para tu rol.
        </div>
      )}
    </div>
  );
}
