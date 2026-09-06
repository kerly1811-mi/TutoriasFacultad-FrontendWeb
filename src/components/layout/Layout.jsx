import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ETIQUETA_ROL } from '../../lib/constantes';
import { NAV, puede } from '../../lib/permisos';

function ItemNav({ to, children, onNavegar }) {
  return (
    <NavLink
      to={to}
      onClick={onNavegar}
      className={({ isActive }) =>
        `block rounded-md px-4 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-paper/70 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {children}
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

export default function Layout({ children }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cerrar el menú móvil con la tecla Escape.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    function alPulsar(e) {
      if (e.key === 'Escape') setMenuAbierto(false);
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [menuAbierto]);

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  const itemsVisibles = NAV.filter((item) => puede(item.roles, usuario?.rol));

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Barra superior (solo móvil/tablet) */}
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

      {/* Barra lateral: fija/deslizante en móvil, estática en escritorio */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-azul-dark flex flex-col justify-between overflow-y-auto transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-start justify-between px-6 py-7 border-b border-white/10">
            <div>
              <p className="font-display text-xl text-white leading-tight">Espacios FISEI</p>
              <p className="text-xs text-paper/50 mt-1">Gestión de aulas y tutorías</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="lg:hidden text-white/70 hover:text-white"
            >
              <IconoMenu abierto />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {itemsVisibles.map((item) => (
              <ItemNav key={item.to} to={item.to} onNavegar={() => setMenuAbierto(false)}>
                {item.etiqueta}
              </ItemNav>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="px-2 mb-3">
            <p className="text-sm text-white font-medium truncate">{usuario?.nombres}</p>
            <span className="inline-block mt-1 text-[11px] uppercase tracking-wide text-celeste-light">
              {ETIQUETA_ROL[usuario?.rol] || usuario?.rol}
            </span>
          </div>
          <button
            onClick={salir}
            className="w-full text-left rounded-md px-2 py-2 text-sm text-paper/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
