import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { usuariosApi } from '../api/endpoints/usuarios';
import { ETIQUETA_ESTADO_ACTIVO, ESTILO_ESTADO_ACTIVO, ETIQUETA_ROL, OPCIONES_ROL_GESTIONABLE } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { cedulaValida } from '../lib/validadores';
import {
  Alert,
  Badge,
  Buscador,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  normalizarBusqueda,
} from '../components/ui';
import { useToast } from '../context/ToastContext';

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'correo', titulo: 'Correo' },
  { clave: 'rol', titulo: 'Rol' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: '' },
];

export default function Usuarios() {
  const { usuario: usuarioActual } = useAuth();
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [creado, setCreado] = useState(null); // { ...usuario, password }
  const [aDeshabilitar, setADeshabilitar] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const cargar = useCallback(() => usuariosApi.listar({ incluirInactivos: true }), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los usuarios.',
  });
  const usuarios = data ?? [];

  // Filtrado reactivo en memoria
  const usuariosFiltrados = useMemo(() => {
    const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean);
    return usuarios.filter((u) => {
      // Sin importar tildes ni mayúsculas, y cada palabra por separado ("clay aldas").
      const texto = normalizarBusqueda(`${u.nombres || ''} ${u.apellidos || ''} ${u.cedula || ''} ${u.correo || ''}`);
      const coincideBusqueda = palabras.every((p) => texto.includes(p));
      const coincideRol = filtroRol === 'TODOS' || u.rol === filtroRol;
      const coincideEstado =
        filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVO' ? u.activo : !u.activo);
      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  // Métricas rápidas para el panel
  const metricas = useMemo(() => {
    const activos = usuarios.filter((u) => u.activo).length;
    const inactivos = usuarios.length - activos;
    const docentes = usuarios.filter((u) => u.rol === 'DOCENTE').length;
    return [
      { etiqueta: 'Total usuarios', valor: usuarios.length, tono: 'azul' },
      { etiqueta: 'Activos', valor: activos, tono: 'success' },
      { etiqueta: 'Inactivos', valor: inactivos, tono: 'amber' },
      { etiqueta: 'Docentes', valor: docentes, tono: 'purpura' },
    ];
  }, [usuarios]);

  async function confirmarDeshabilitar() {
    if (!aDeshabilitar) return;
    setCambiandoEstado(true);
    try {
      await usuariosApi.cambiarEstado(aDeshabilitar.id_usr, false);
      recargar();
      mostrarToast(`Usuario "${aDeshabilitar.correo}" deshabilitado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo deshabilitar el usuario.'), 'error');
    } finally {
      setCambiandoEstado(false);
      setADeshabilitar(null);
    }
  }

  async function habilitar(u) {
    try {
      await usuariosApi.cambiarEstado(u.id_usr, true);
      recargar();
      mostrarToast(`Usuario "${u.correo}" habilitado.`, 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo habilitar el usuario.'), 'error');
    }
  }

  function copiarCredenciales() {
    if (!creado) return;
    const texto = `Credenciales de acceso al Sistema de Tutorías FISEI:\n• Correo: ${creado.correo}\n• Contraseña temporal: ${creado.password}\n• Rol: ${ETIQUETA_ROL[creado.rol] || creado.rol}\n• Enlace de acceso: ${window.location.origin}/login`;
    navigator.clipboard.writeText(texto);
    mostrarToast('Credenciales copiadas al portapapeles.', 'exito');
  }

  function enviarPorGmail() {
    if (!creado) return;
    const asunto = encodeURIComponent('Credenciales de acceso - Sistema de Tutorías FISEI');
    const cuerpo = encodeURIComponent(
      `Hola ${creado.nombres || ''} ${creado.apellidos || ''},\n\nSe ha creado tu cuenta en el Sistema de Gestión de Tutorías y Espacios de la FISEI.\n\nTus credenciales para ingresar son:\n- Correo: ${creado.correo}\n- Contraseña temporal: ${creado.password}\n- Rol asignado: ${ETIQUETA_ROL[creado.rol] || creado.rol}\n\nPuedes iniciar sesión en:\n${window.location.origin}/login\n\nPor favor, cambia tu contraseña luego de ingresar por primera vez.\n\nSaludos cordiales,\nAdministración FISEI`
    );
    const urlGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(creado.correo)}&su=${asunto}&body=${cuerpo}`;
    window.open(urlGmail, '_blank');
  }

  const hayFiltros = Boolean(busqueda.trim()) || filtroRol !== 'TODOS' || filtroEstado !== 'TODOS';
  function limpiarFiltros() {
    setBusqueda('');
    setFiltroRol('TODOS');
    setFiltroEstado('TODOS');
  }

  return (
    <>
      <PageHeader
        titulo="Usuarios"
        descripcion="Alta y gestión de docentes, laboratoristas y administradores. Los estudiantes se registran solos."
      >
        <Button onClick={() => setModalAbierto(true)}>Nuevo usuario</Button>
      </PageHeader>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metricas.map((m) => (
          <Card key={m.etiqueta} padding="p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 font-medium">{m.etiqueta}</p>
            <p className="font-display text-2xl text-ink font-semibold mt-1.5">{m.valor}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] gap-3">
        <Buscador
          className="col-span-2 lg:col-span-1"
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre, cédula o correo…"
        />
        <Select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          options={[
            { value: 'TODOS', label: 'Todos los roles' },
            ...OPCIONES_ROL_GESTIONABLE,
            { value: 'ESTUDIANTE', label: 'Estudiante' },
          ]}
        />
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          options={[
            { value: 'TODOS', label: 'Todos los estados' },
            { value: 'ACTIVO', label: 'Activos' },
            { value: 'INACTIVO', label: 'Inactivos' },
          ]}
        />
      </div>

      {hayFiltros && !cargando && (
        <div className="mt-2 flex items-center gap-3 text-sm text-ink/50">
          <span>
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuario(s)
          </span>
          <button onClick={limpiarFiltros} className="text-azul font-medium hover:underline">
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="mt-4">
        <Table
          columnas={COLUMNAS}
          datos={usuariosFiltrados}
          cargando={cargando}
          error={error}
          mensajeVacio={usuarios.length === 0 ? 'No hay usuarios.' : 'Ningún usuario coincide con los filtros.'}
          renderFila={(u) => (
            <tr key={u.id_usr} className={`border-b border-line last:border-0 ${u.activo ? '' : 'opacity-60'}`}>
              <td className="px-5 py-3">
                {u.nombres} {u.apellidos}
              </td>
              <td className="px-5 py-3">{u.cedula}</td>
              <td className="px-5 py-3 text-ink/70">{u.correo}</td>
              <td className="px-5 py-3">
                <Badge className="bg-celeste/10 text-celeste-dark">{ETIQUETA_ROL[u.rol] || u.rol}</Badge>
              </td>
              <td className="px-5 py-3">
                <Badge className={ESTILO_ESTADO_ACTIVO[u.activo]}>{ETIQUETA_ESTADO_ACTIVO[u.activo]}</Badge>
              </td>
              <td className="px-5 py-3 text-sm">
                {u.id_usr === usuarioActual?.id ? null : u.activo ? (
                  <button onClick={() => setADeshabilitar(u)} className="text-danger font-medium hover:underline">
                    Deshabilitar
                  </button>
                ) : (
                  <button onClick={() => habilitar(u)} className="text-success font-medium hover:underline">
                    Habilitar
                  </button>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      {/* Modal Crear Usuario */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nuevo usuario">
        <FormularioUsuario
          onCancelar={() => setModalAbierto(false)}
          onListo={(usuario, password, correoEnviado) => {
            setModalAbierto(false);
            setCreado({ ...usuario, password, correoEnviado });
            recargar();
          }}
        />
      </Modal>

      {/* Modal de Credenciales creadas (con envío por Gmail y copia rápida) */}
      <Modal abierto={Boolean(creado)} onCerrar={() => setCreado(null)} titulo="Credenciales del nuevo usuario">
        <div className="space-y-4">
          <div className="p-3.5 bg-success/10 border border-success/30 rounded-lg text-sm text-ink">
            <p className="font-semibold text-success flex items-center gap-1.5">
              ✓ ¡Usuario registrado con éxito!
            </p>
            <p className="text-xs text-ink/70 mt-1">
              {creado?.correoEnviado
                ? '✉️ Las credenciales fueron enviadas automáticamente al correo del usuario por el servidor.'
                : 'El usuario ya está registrado en el sistema. Puedes enviarle sus credenciales ahora mismo por Gmail para testear o copiarlas al portapapeles.'}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-line bg-paper/60 p-4 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-line/50">
              <span className="text-ink/60 font-sans">Usuario / Nombre:</span>
              <span className="font-bold text-ink">{creado?.nombres} {creado?.apellidos}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line/50">
              <span className="text-ink/60 font-sans">Correo electrónico:</span>
              <span className="font-bold text-ink">{creado?.correo}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line/50">
              <span className="text-ink/60 font-sans">Contraseña temporal:</span>
              <span className="font-bold text-azul bg-white px-2.5 py-1 rounded border border-line text-sm select-all">
                {creado?.password}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-ink/60 font-sans">Rol asignado:</span>
              <span className="text-ink font-semibold">{ETIQUETA_ROL[creado?.rol] || creado?.rol}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button variant="secondary" onClick={copiarCredenciales} className="flex-1">
              📋 Copiar credenciales
            </Button>
            <Button onClick={enviarPorGmail} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              ✉️ Enviar por Gmail
            </Button>
          </div>

          <div className="flex justify-end pt-2 border-t border-line">
            <Button variant="secondary" size="sm" onClick={() => setCreado(null)}>
              Listo, cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Diálogo Deshabilitar */}
      <ConfirmDialog
        abierto={Boolean(aDeshabilitar)}
        titulo="Deshabilitar usuario"
        mensaje={
          aDeshabilitar
            ? `¿Deshabilitar a "${aDeshabilitar.nombres} ${aDeshabilitar.apellidos}"? No podrá iniciar sesión hasta que lo vuelvas a habilitar.`
            : ''
        }
        textoConfirmar="Deshabilitar"
        textoCargando="Deshabilitando…"
        cargando={cambiandoEstado}
        onConfirmar={confirmarDeshabilitar}
        onCancelar={() => setADeshabilitar(null)}
      />
    </>
  );
}

function FormularioUsuario({ onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    cedula: '',
    nombres: '',
    apellidos: '',
    correo: '',
    password: '',
    rol: 'DOCENTE',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [errorCedula, setErrorCedula] = useState(null);

  function generarPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
    let p = 'Fisei-';
    for (let i = 0; i < 6; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCampo('password', p);
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!cedulaValida(valores.cedula)) {
      setErrorCedula('La cédula ingresada no es válida.');
      return;
    }
    setErrorCedula(null);
    setEnviando(true);
    setError(null);
    try {
      const res = await usuariosApi.crear(valores);
      onListo(res.usuario, valores.password, res.correoEnviado);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear el usuario.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <Input
        label="Cédula"
        name="cedula"
        required
        inputMode="numeric"
        pattern="[0-9]{10}"
        maxLength={10}
        title="10 dígitos numéricos."
        value={valores.cedula}
        onChange={(e) => {
          setErrorCedula(null);
          handleChange(e);
        }}
        error={errorCedula}
      />
      <Select label="Rol" name="rol" value={valores.rol} onChange={handleChange} options={OPCIONES_ROL_GESTIONABLE} />
      <Input label="Nombres" name="nombres" required maxLength={100} value={valores.nombres} onChange={handleChange} />
      <Input label="Apellidos" name="apellidos" required maxLength={100} value={valores.apellidos} onChange={handleChange} />
      <div className="col-span-2">
        <Input
          label="Correo electrónico (Gmail o institucional)"
          type="email"
          name="correo"
          required
          maxLength={100}
          value={valores.correo}
          onChange={handleChange}
          placeholder="ejemplo@gmail.com o usuario@uta.edu.ec"
        />
        <p className="text-xs text-ink/50 mt-1">Puedes ingresar un correo Gmail para probar el envío de credenciales con el docente o evaluador.</p>
      </div>
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-ink/70">Contraseña inicial</label>
          <button
            type="button"
            onClick={generarPassword}
            className="text-xs text-azul hover:underline font-medium flex items-center gap-1"
          >
            ⚡ Generar contraseña aleatoria
          </button>
        </div>
        <Input
          name="password"
          required
          minLength={6}
          value={valores.password}
          onChange={handleChange}
          placeholder="Mínimo 6 caracteres o pulsa 'Generar contraseña'"
        />
      </div>

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Creando…">
          Crear y generar credenciales
        </Button>
      </div>
    </form>
  );
}
