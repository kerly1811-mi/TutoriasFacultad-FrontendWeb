import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_ROL } from '../../lib/constantes';
import { NAV, puede } from '../../lib/permisos';
import { IconoNav } from './IconosNav';

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
    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-celeste/20 text-celeste-light shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8.5 12 4l10 4.5-10 4.5-10-4.5Z" />
        <path d="M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" />
        <path d="M22 8.5v6" />
      </svg>
    </span>
  );
}

function IconoColapsar({ colapsado }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {colapsado ? <polyline points="9 6 15 12 9 18" /> : <polyline points="15 6 9 12 15 18" />}
    </svg>
  );
}

function IconoCampana() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14 18 8Z" />
      <path d="M10.5 20a1.7 1.7 0 0 0 3 0" />
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
  const [colapsado, setColapsado] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_COLAPSADO) === '1';
    } catch {
      return false;
    }
  });

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
  const etiquetaSeccion = seccionActual
    ? typeof seccionActual.etiqueta === 'function'
      ? seccionActual.etiqueta(usuario?.rol)
      : seccionActual.etiqueta
    : 'Panel';

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Barra superior (solo móvil/tablet): título + botón de menú */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-azul-dark px-4 py-3">
        <p className="font-display text-lg text-white">Espacios FISEI</p>
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
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Barra lateral: fija/deslizante en móvil, pegada al viewport (sticky) en escritorio */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-azul-dark flex flex-col justify-between overflow-y-auto overflow-x-hidden transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 ${
          colapsado ? 'lg:w-[74px]' : 'lg:w-64'
        } ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div>
          <div className={`px-6 pt-6 pb-5 border-b border-white/10 ${colapsado ? 'lg:px-3' : ''}`}>
            <div className={`flex items-center justify-between ${colapsado ? 'lg:justify-center' : ''}`}>
              <div className={`flex items-center gap-2.5 min-w-0 ${colapsado ? 'lg:justify-center' : ''}`}>
                <LogoFISEI />
                {!colapsado && (
                  <p className="font-display text-lg text-white leading-tight truncate">Espacios FISEI</p>
                )}
              </div>

              {!colapsado && (
                <button
                  type="button"
                  onClick={alternarColapso}
                  title="Colapsar menú"
                  className="hidden lg:flex shrink-0 text-white/60 hover:text-white transition-colors"
                >
                  <IconoColapsar colapsado={colapsado} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="lg:hidden text-white/70 hover:text-white"
              >
                <IconoMenu abierto />
              </button>
            </div>

            {!colapsado && <p className="text-xs text-paper/50 mt-1">Gestión de aulas y tutorías</p>}

            {colapsado && (
              <button
                type="button"
                onClick={alternarColapso}
                title="Expandir menú"
                className="hidden lg:flex w-full justify-center text-white/60 hover:text-white transition-colors mt-4"
              >
                <IconoColapsar colapsado={colapsado} />
              </button>
            )}
          </div>

          <nav className={`p-4 space-y-1 ${colapsado ? 'lg:px-3' : ''}`}>
            {itemsVisibles.map((item) => (
              <ItemNav
                key={item.to}
                to={item.to}
                icono={<IconoNav ruta={item.to} />}
                colapsado={colapsado}
                onNavegar={() => setMenuAbierto(false)}
              >
                {typeof item.etiqueta === 'function' ? item.etiqueta(usuario?.rol) : item.etiqueta}
              </ItemNav>
            ))}
          </nav>
        </div>

        <div className={`p-4 border-t border-white/10 ${colapsado ? 'lg:px-3' : ''}`}>
          <button
            onClick={salir}
            title={colapsado ? 'Cerrar sesión' : undefined}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-paper/70 hover:bg-white/5 hover:text-white transition-colors ${
              colapsado ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <IconoSalir />
            <span className={colapsado ? 'lg:hidden' : ''}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior (escritorio): sección actual + notificaciones + perfil */}
        <header className="hidden lg:flex items-center justify-between gap-4 bg-white border-b border-line px-8 py-3.5 sticky top-0 z-20">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-ink/40 font-medium">Espacios FISEI</p>
            <p className="text-sm font-medium text-ink truncate">{etiquetaSeccion}</p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              title="Notificaciones"
              aria-label="Notificaciones"
              className="relative text-ink/50 hover:text-ink transition-colors"
            >
              <IconoCampana />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-azul border border-white" />
            </button>

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
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
