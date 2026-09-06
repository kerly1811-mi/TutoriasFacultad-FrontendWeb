import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { usuariosApi } from '../api/endpoints/usuarios';
import { ETIQUETA_ROL, OPCIONES_ROL_GESTIONABLE } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, Input, Modal, PageHeader, Select, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'correo', titulo: 'Correo' },
  { clave: 'rol', titulo: 'Rol' },
];

export default function Usuarios() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [creado, setCreado] = useState(null);

  const cargar = useCallback(() => usuariosApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los usuarios.',
  });
  const usuarios = data ?? [];

  return (
    <Layout>
      <PageHeader
        titulo="Usuarios"
        descripcion="Alta de docentes, laboratoristas y administradores. Los estudiantes se registran solos."
      >
        <Button onClick={() => setModalAbierto(true)}>Nuevo usuario</Button>
      </PageHeader>

      {creado && (
        <div className="mt-4">
          <Alert variant="success">
            Usuario creado: <b>{creado.correo}</b> ({ETIQUETA_ROL[creado.rol]}). Comunícale su contraseña para que
            inicie sesión.
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={usuarios}
          cargando={cargando}
          error={error}
          mensajeVacio="No hay usuarios."
          renderFila={(u) => (
            <tr key={u.id_usr} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                {u.nombres} {u.apellidos}
              </td>
              <td className="px-5 py-3">{u.cedula}</td>
              <td className="px-5 py-3 text-ink/70">{u.correo}</td>
              <td className="px-5 py-3">
                <Badge className="bg-celeste/10 text-celeste-dark">{ETIQUETA_ROL[u.rol] || u.rol}</Badge>
              </td>
            </tr>
          )}
        />
      </div>

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
    </Layout>
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

  async function manejarEnvio(e) {
    e.preventDefault();
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
        onChange={handleChange}
      />
      <Select label="Rol" name="rol" value={valores.rol} onChange={handleChange} options={OPCIONES_ROL_GESTIONABLE} />
      <Input label="Nombres" name="nombres" required value={valores.nombres} onChange={handleChange} />
      <Input label="Apellidos" name="apellidos" required value={valores.apellidos} onChange={handleChange} />
      <div className="col-span-2">
        <Input
          label="Correo institucional"
          type="email"
          name="correo"
          required
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
