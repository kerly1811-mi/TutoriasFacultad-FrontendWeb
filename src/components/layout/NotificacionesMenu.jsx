import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacionesApi } from '../../api/endpoints/notificaciones';
import { useAuth } from '../../context/AuthContext';

const RUTA_POR_TIPO = {
  SOLICITUD_NUEVA: '/solicitudes',
  SOLICITUD_ACEPTADA: '/solicitudes',
  SOLICITUD_RECHAZADA: '/solicitudes',
  RESERVA_CANCELADA: { ESTUDIANTE: '/mis-tutorias', DOCENTE: '/control-acceso' },
};

function tiempoRelativo(fechaISO) {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(fechaISO).getTime()) / 1000));
  if (segundos < 60) return 'Ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} d`;
}

function IconoCampana() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14 18 8Z" />
      <path d="M10.5 20a1.7 1.7 0 0 0 3 0" />
    </svg>
  );
}

export default function NotificacionesMenu() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const contenedorRef = useRef(null);

  async function cargar() {
    try {
      const data = await notificacionesApi.listar();
      setNotificaciones(data);
    } catch {
      // Silencioso: la campana no es crítica, no hace falta interrumpir con un error.
    }
  }

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;
    function alHacerClicFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alHacerClicFuera);
    return () => document.removeEventListener('mousedown', alHacerClicFuera);
  }, [abierto]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function alHacerClicNotificacion(n) {
    setAbierto(false);
    if (!n.leida) {
      setNotificaciones((prev) => prev.map((x) => (x.id_not === n.id_not ? { ...x, leida: true } : x)));
      notificacionesApi.marcarLeida(n.id_not).catch(() => {});
    }
    const destino = RUTA_POR_TIPO[n.tipo];
    const ruta = typeof destino === 'string' ? destino : destino?.[usuario?.rol];
    if (ruta) navigate(ruta);
  }

  async function marcarTodasLeidas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await notificacionesApi.marcarTodasLeidas();
    } catch {
      // Si falla, la próxima recarga (30s) vuelve a traer el estado real.
    }
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        title="Notificaciones"
        aria-label="Notificaciones"
        onClick={() => setAbierto((v) => !v)}
        className="relative text-ink/50 hover:text-ink transition-colors"
      >
        <IconoCampana />
        {noLeidas > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-semibold leading-none border border-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-lg border border-line bg-white shadow-lg z-30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-sm font-medium text-ink">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas} className="text-xs text-azul font-medium hover:underline">
                Marcar todas leídas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink/50 text-center">No tienes notificaciones.</p>
          ) : (
            <ul className="divide-y divide-line">
              {notificaciones.map((n) => (
                <li key={n.id_not}>
                  <button
                    onClick={() => alHacerClicNotificacion(n)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-paper/60 transition-colors ${
                      n.leida ? 'text-ink/60' : 'text-ink font-medium'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-azul mt-1.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="leading-snug">{n.mensaje}</p>
                        <p className="text-xs text-ink/40 mt-1">{tiempoRelativo(n.creado_en)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
