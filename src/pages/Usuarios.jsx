import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { usuariosApi } from '../api/endpoints/usuarios';
import { ETIQUETA_ESTADO_ACTIVO, ESTILO_ESTADO_ACTIVO, ETIQUETA_ROL, OPCIONES_ROL_GESTIONABLE } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { cedulaValida } from '../lib/validadores';
import { Alert, Badge, Button, ConfirmDialog, Input, Modal, Select, Table } from '../components/ui';
import { AdminPageTemplate } from '../components/admin';
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
  const [creado, setCreado] = useState(null);
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
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const texto = `${u.nombres || ''} ${u.apellidos || ''} ${u.cedula || ''} ${u.correo || ''}`.toLowerCase();
      const coincideBusqueda = !q || texto.includes(q);
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

  return (
    <AdminPageTemplate
      titulo="Usuarios"
      descripcion="Alta y gestión de docentes, laboratoristas y administradores. Los estudiantes se registran solos."
      breadcrumbs={[
        { etiqueta: 'Administración', to: '/dashboard' },
        { etiqueta: 'Usuarios' },
      ]}
      acciones={<Button onClick={() => setModalAbierto(true)}>Nuevo usuario</Button>}
      metricas={metricas}
      busqueda={busqueda}
      onBusquedaChange={setBusqueda}
      placeholderBusqueda="Buscar por nombre, cédula o correo…"
      filtros={
        <>
          <div className="w-40">
            <Select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              opciones={[
                { valor: 'TODOS', etiqueta: 'Todos los roles' },
                ...OPCIONES_ROL_GESTIONABLE,
                { valor: 'ESTUDIANTE', etiqueta: 'Estudiante' },
              ]}
            />
          </div>
          <div className="w-36">
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              opciones={[
                { valor: 'TODOS', etiqueta: 'Todos los estados' },
                { valor: 'ACTIVO', etiqueta: 'Activos' },
                { valor: 'INACTIVO', etiqueta: 'Inactivos' },
              ]}
            />
          </div>
        </>
      }
      totalResultados={usuariosFiltrados.length}
      totalTotal={usuarios.length}
      onLimpiarFiltros={() => {
        setBusqueda('');
        setFiltroRol('TODOS');
        setFiltroEstado('TODOS');
      }}
      cargando={cargando}
      error={error}
      onReintentar={recargar}
      vacio={usuariosFiltrados.length === 0}
      mensajeVacio="No se encontraron usuarios"
      descripcionVacio="Probá ajustando el término de búsqueda o los filtros de rol y estado."
      modales={
        <>
          <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nuevo usuario">
            <FormularioUsuario
              onCancelar={() => setModalAbierto(false)}
              onListo={(usuario) => {
                setModalAbierto(false);
                setCreado(usuario);
                recargar();
              }}
            />
          </Modal>

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
      }
    >
      {creado && (
        <div className="mb-4">
          <Alert variant="success">
            Usuario creado: <b>{creado.correo}</b> ({ETIQUETA_ROL[creado.rol]}). Comunícale su contraseña para que
            inicie sesión.
          </Alert>
        </div>
      )}

      <Table
        columnas={COLUMNAS}
        datos={usuariosFiltrados}
        mensajeVacio="No hay usuarios."
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
    </AdminPageTemplate>
  );
}

function FormularioUsuario({ onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
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
      const { usuario } = await usuariosApi.crear(valores);
      onListo(usuario);
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
          label="Correo institucional"
          type="email"
          name="correo"
          required
          maxLength={100}
          value={valores.correo}
          onChange={handleChange}
          placeholder="nombre@uta.edu.ec"
        />
      </div>
      <div className="col-span-2">
        <Input
          label="Contraseña inicial"
          name="password"
          required
          minLength={6}
          value={valores.password}
          onChange={handleChange}
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Creando…">
          Crear usuario
        </Button>
      </div>
    </form>
  );
}
