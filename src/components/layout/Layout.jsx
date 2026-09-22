import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_ROL } from '../../lib/constantes';
import { NAV, puede } from '../../lib/permisos';
import { IconoNav } from './IconosNav';
import NotificacionesMenu from './NotificacionesMenu';

const CLAVE_COLAPSADO = 'sidebar_colapsado';

function ItemNav({ to, icono, colapsado, children, onNavegar }) {
  return (
    <NavLink
      to={to}
      onClick={onNavegar}
      title={colapsado ? children : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-colors ${
          colapsado ? 'justify-center px-0' : ''
        } ${
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-paper/70 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <span className="shrink-0">{icono}</span>
      {!colapsado && <span className="truncate">{children}</span>}
    </NavLink>
  );
}

function IconoFlechaGrupo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ItemGrupoNav({ item, icono, colapsado, activo, abierto, onAlternar, onNavegar }) {
  return (
    <div>
      <button
        type="button"
        onClick={onAlternar}
        title={colapsado ? item.etiqueta : undefined}
        className={`w-full flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-colors ${
          colapsado ? 'justify-center px-0' : ''
        } ${activo ? 'text-white font-medium' : 'text-paper/70 hover:bg-white/5 hover:text-white'}`}
      >
        <span className="shrink-0">{icono}</span>
        {!colapsado && (
          <>
            <span className="truncate flex-1 text-left">{item.etiqueta}</span>
            <span className={abierto ? 'rotate-90' : ''}>
              <IconoFlechaGrupo />
            </span>
          </>
        )}
      </button>

      {!colapsado && abierto && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
          {item.submenu.map((sub) => (
            <NavLink
              key={sub.to}
              to={sub.to}
              onClick={onNavegar}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white font-medium' : 'text-paper/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {sub.etiqueta}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function IconoMenu({ abierto }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {abierto ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

function IconoSalir() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LogoFISEI() {
  return (
    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white text-azul shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8.5 12 4l10 4.5-10 4.5-10-4.5Z" />
        <path d="M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" />
        <path d="M22 8.5v6" />
      </svg>
    </span>
  );
}

function IconoPanelLateral() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </svg>
  );
}

function inicialesDe(nombre) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Layout({ children }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const [colapsado, setColapsado] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_COLAPSADO) === '1';
    } catch {
      return false;
    }
  });
  // Pantalla "a la mitad" (tablet): la barra lateral se muestra siempre,
  // pero angosta (solo íconos), sin importar la preferencia de colapsado.
  const [esTablet, setEsTablet] = useState(
    () => window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const actualizar = () => setEsTablet(mq.matches);
    mq.addEventListener('change', actualizar);
    return () => mq.removeEventListener('change', actualizar);
  }, []);
  const colapsadoVisual = colapsado || esTablet;

  // Cerrar el menú móvil con la tecla Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    function alPulsar(e) {
      if (e.key === 'Escape') setMenuAbierto(false);
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [menuAbierto]);

  function alternarColapso() {
    setColapsado((v) => {
      const nuevo = !v;
      try {
        localStorage.setItem(CLAVE_COLAPSADO, nuevo ? '1' : '0');
      } catch {
        // localStorage no disponible: no pasa nada, solo no se recuerda la preferencia.
      }
      return nuevo;
    });
  }

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  const itemsVisibles = NAV.filter((item) => puede(item.roles, usuario?.rol));
  const seccionActual = itemsVisibles.find((item) => item.to === location.pathname);
  const subseccionActual = itemsVisibles
    .filter((item) => item.submenu)
    .flatMap((item) => item.submenu)
    .find((sub) => sub.to === location.pathname);
  const etiquetaSeccion = seccionActual
    ? typeof seccionActual.etiqueta === 'function'
      ? seccionActual.etiqueta(usuario?.rol)
      : seccionActual.etiqueta
    : subseccionActual?.etiqueta || 'Panel';

  function grupoAbierto(item) {
    if (gruposAbiertos[item.to] !== undefined) return gruposAbiertos[item.to];
    return item.submenu.some((s) => s.to === location.pathname);
  }

  function alternarGrupo(item) {
    setGruposAbiertos((prev) => ({ ...prev, [item.to]: !grupoAbierto(item) }));
  }

  return (
    <div className="min-h-screen bg-paper md:flex">
      {/* Barra superior (solo móvil): título + botón de menú */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-azul-dark px-4 py-3">
        <p className="font-display text-lg font-semibold text-white">FISEI</p>
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          className="text-white p-1"
        >
          <IconoMenu abierto={menuAbierto} />
        </button>
      </header>

      {/* Fondo oscuro al abrir el menú en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Barra lateral: fija/deslizante en móvil, pegada al viewport (sticky) desde tablet;
          angosta (solo íconos) en tablet siempre, y en escritorio si el usuario la colapsó. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 shrink-0 bg-azul-dark flex flex-col justify-between overflow-y-auto overflow-x-hidden transition-[transform,width] duration-200 md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 ${
          colapsadoVisual ? 'md:w-[74px]' : 'md:w-56'
        } ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div>
          <div className={`px-6 pt-6 pb-5 border-b border-white/10 ${colapsadoVisual ? 'md:px-3' : ''}`}>
            <div className={`flex items-center justify-between ${colapsadoVisual ? 'md:justify-center' : ''}`}>
              <div className={`flex items-center gap-2.5 min-w-0 ${colapsadoVisual ? 'md:justify-center' : ''}`}>
                <LogoFISEI />
                {!colapsadoVisual && (
                  <div className="min-w-0 leading-tight">
                    <p className="font-display text-lg font-semibold text-white truncate">FISEI</p>
                    <p className="text-xs text-paper/60 truncate">Sistema de Reservas</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="md:hidden text-white/70 hover:text-white"
              >
                <IconoMenu abierto />
              </button>
            </div>
          </div>

          <nav className={`p-4 space-y-1 ${colapsadoVisual ? 'md:px-3' : ''}`}>
            {itemsVisibles.map((item) =>
              item.submenu ? (
                <ItemGrupoNav
                  key={item.to}
                  item={item}
                  icono={<IconoNav ruta={item.to} />}
                  colapsado={colapsadoVisual}
                  activo={item.submenu.some((s) => s.to === location.pathname)}
                  abierto={grupoAbierto(item)}
                  onAlternar={() => alternarGrupo(item)}
                  onNavegar={() => setMenuAbierto(false)}
                />
              ) : (
                <ItemNav
                  key={item.to}
                  to={item.to}
                  icono={<IconoNav ruta={item.to} />}
                  colapsado={colapsadoVisual}
                  onNavegar={() => setMenuAbierto(false)}
                >
                  {typeof item.etiqueta === 'function' ? item.etiqueta(usuario?.rol) : item.etiqueta}
                </ItemNav>
              )
            )}
          </nav>
        </div>

        <div className={`p-4 border-t border-white/10 ${colapsadoVisual ? 'md:px-3' : ''}`}>
          <button
            onClick={salir}
            title={colapsadoVisual ? 'Cerrar sesión' : undefined}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-paper/70 hover:bg-white/5 hover:text-white transition-colors ${
              colapsadoVisual ? 'md:justify-center md:px-0' : ''
            }`}
          >
            <IconoSalir />
            <span className={colapsadoVisual ? 'md:hidden' : ''}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior (desde tablet): sección actual + notificaciones + perfil */}
        <header className="hidden md:flex items-center justify-between gap-4 bg-white border-b border-line px-8 py-3.5 sticky top-0 z-20">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={alternarColapso}
              title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
              className="shrink-0 text-ink/40 hover:text-ink/70 transition-colors"
            >
              <IconoPanelLateral />
            </button>
            <div className="w-px h-6 bg-line shrink-0" />
            <p className="text-sm font-medium text-ink truncate">{etiquetaSeccion}</p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <NotificacionesMenu />

            <div className="w-px h-6 bg-line" />

            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-celeste/15 text-celeste-dark text-xs font-semibold shrink-0">
                {inicialesDe(usuario?.nombres)}
              </span>
              <div className="leading-tight">
                <p className="text-sm text-ink font-medium">{usuario?.nombres}</p>
                <p className="text-xs text-ink/50">{ETIQUETA_ROL[usuario?.rol] || usuario?.rol}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] px-5 sm:px-8 py-4 sm:py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
