import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import { Alert, Button, Input } from '../components/ui';
import { authApi } from '../api/endpoints/auth';
import { useToast } from '../context/ToastContext';

export default function RecuperarPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();

  const tokenUrl = searchParams.get('token') || '';

  // Modo: 'solicitar' (ingresar correo) o 'restablecer' (ingresar token y nueva clave)
  const [modo, setModo] = useState(tokenUrl ? 'restablecer' : 'solicitar');

  // Estado para solicitud
  const [correo, setCorreo] = useState('');
  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
  const [errorSolicitud, setErrorSolicitud] = useState('');
  const [solicitudExitosa, setSolicitudExitosa] = useState(null);

  // Estado para restablecimiento
  const [token, setToken] = useState(tokenUrl);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargandoRestablecer, setCargandoRestablecer] = useState(false);
  const [errorRestablecer, setErrorRestablecer] = useState('');
  const [restablecidoExitoso, setRestablecidoExitoso] = useState(false);

  async function manejarSolicitud(e) {
    e.preventDefault();
    setErrorSolicitud('');
    setCargandoSolicitud(true);

    try {
      const res = await authApi.solicitarRecuperacion(correo.trim());
      setSolicitudExitosa(res);
      mostrarToast('Instrucciones enviadas correctamente', 'exito');
    } catch (err) {
      setErrorSolicitud(err.response?.data?.error || err.message || 'Error al procesar la solicitud');
    } finally {
      setCargandoSolicitud(false);
    }
  }

  async function manejarRestablecer(e) {
    e.preventDefault();
    setErrorRestablecer('');

    if (!token.trim()) {
      setErrorRestablecer('El token o código de verificación es obligatorio.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setErrorRestablecer('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setErrorRestablecer('Las contraseñas no coinciden.');
      return;
    }

    setCargandoRestablecer(true);

    try {
      await authApi.restablecerPassword({
        token: token.trim(),
        password: nuevaPassword,
      });
      setRestablecidoExitoso(true);
      mostrarToast('¡Contraseña restablecida exitosamente!', 'exito');
    } catch (err) {
      setErrorRestablecer(
        err.response?.data?.error || err.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.'
      );
    } finally {
      setCargandoRestablecer(false);
    }
  }

  return (
    <AuthLayout
      titulo="Recuperar Contraseña"
      subtitulo="Restablece el acceso a tu cuenta en Espacios FISEI"
      footer={
        <>
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="text-azul font-semibold hover:underline">
            Volver a Iniciar Sesión
          </Link>
        </>
      }
    >
      <div className="bg-white border border-line rounded-lg p-7 shadow-2xl shadow-azul-dark/30 space-y-6">
        {/* Selector de modo */}
        <div className="flex border-b border-line text-sm">
          <button
            type="button"
            onClick={() => {
              setModo('solicitar');
              setErrorSolicitud('');
              setErrorRestablecer('');
            }}
            className={`pb-3 font-medium transition-colors border-b-2 flex-1 text-center ${
              modo === 'solicitar'
                ? 'border-azul text-azul font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Solicitar enlace
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('restablecer');
              setErrorSolicitud('');
              setErrorRestablecer('');
            }}
            className={`pb-3 font-medium transition-colors border-b-2 flex-1 text-center ${
              modo === 'restablecer'
                ? 'border-azul text-azul font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Nueva contraseña
          </button>
        </div>

        {/* FASE 1: Solicitar recuperación */}
        {modo === 'solicitar' && (
          <>
            {solicitudExitosa ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 text-sm leading-relaxed">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
                    <span className="text-base">✓</span> Solicitud procesada
                  </div>
                  <p>{solicitudExitosa.mensaje}</p>
                </div>

                {solicitudExitosa.token && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-lg p-4 text-xs space-y-2">
                    <div className="font-semibold text-blue-800">
                      🛠️ Modo de prueba / demostración:
                    </div>
                    <p className="text-slate-600">
                      Puedes hacer clic directamente en el siguiente botón para continuar con el restablecimiento:
                    </p>
                    <Button
                      size="sm"
                      block
                      onClick={() => {
                        setToken(solicitudExitosa.token);
                        setModo('restablecer');
                      }}
                    >
                      Continuar a ingresar nueva contraseña →
                    </Button>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                  <span>¿No recibiste el correo?</span>
                  <button
                    type="button"
                    onClick={() => setSolicitudExitosa(null)}
                    className="text-azul font-medium hover:underline"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={manejarSolicitud} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresa el correo electrónico asociado a tu cuenta (Gmail o correo universitario). Te enviaremos un
                  enlace seguro para restablecer tu contraseña.
                </p>

                <Input
                  label="Correo electrónico"
                  type="email"
                  name="correo"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@gmail.com o usuario@uta.edu.ec"
                  autoFocus
                />

                <Alert>{errorSolicitud}</Alert>

                <Button type="submit" block cargando={cargandoSolicitud} textoCargando="Enviando solicitud…">
                  Enviar enlace de recuperación
                </Button>
              </form>
            )}
          </>
        )}

        {/* FASE 2: Restablecer contraseña */}
        {modo === 'restablecer' && (
          <>
            {restablecidoExitoso ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
                  ✓
                </div>
                <h3 className="text-base font-bold text-slate-800">¡Contraseña restablecida!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tu contraseña ha sido actualizada con éxito en la base de datos. Ya puedes iniciar sesión con tus nuevas
                  credenciales.
                </p>

                <Button block onClick={() => navigate('/login')}>
                  Ir a Iniciar Sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={manejarRestablecer} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresa el token de seguridad que recibiste (o que fue autocompletado desde tu enlace) y define tu nueva
                  contraseña.
                </p>

                <Input
                  label="Token o código de recuperación"
                  type="text"
                  name="token"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí el token recibido"
                />

                <Input
                  label="Nueva contraseña (mínimo 6 caracteres)"
                  type="password"
                  name="nuevaPassword"
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  name="confirmarPassword"
                  required
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <Alert>{errorRestablecer}</Alert>

                <Button
                  type="submit"
                  block
                  cargando={cargandoRestablecer}
                  textoCargando="Guardando nueva contraseña…"
                >
                  Restablecer Contraseña
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
