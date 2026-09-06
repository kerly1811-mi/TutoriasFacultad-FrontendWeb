import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { horariosApi } from '../api/endpoints/horarios';
import { espaciosApi } from '../api/endpoints/espacios';
import { usuariosApi } from '../api/endpoints/usuarios';
import { ETIQUETA_DIA, OPCIONES_DIA } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { Alert, Button, Input, Modal, PageHeader, Select, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'aula', titulo: 'Aula' },
  { clave: 'dia', titulo: 'Día' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'curso', titulo: 'Curso' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

const ORDEN_DIA = OPCIONES_DIA.reduce((acc, d, i) => ({ ...acc, [d.value]: i }), {});

export default function Horarios() {
  const [filtroEspacio, setFiltroEspacio] = useState('');
  const [modal, setModal] = useState(null); // null | { horario? }

  const cargar = useCallback(async () => {
    const [horarios, espacios, docentes] = await Promise.all([
      horariosApi.listar(),
      espaciosApi.listar(),
      usuariosApi.listar('DOCENTE'),
    ]);
    return { horarios, espacios, docentes };
  }, []);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los horarios.',
  });

  const espacios = data?.espacios ?? [];
  const docentes = data?.docentes ?? [];
  const horarios = (data?.horarios ?? [])
    .filter((h) => !filtroEspacio || h.id_esp === Number(filtroEspacio))
    .sort((a, b) => (ORDEN_DIA[a.dia_semana] - ORDEN_DIA[b.dia_semana]) || a.hora_ini.localeCompare(b.hora_ini));

  const nombreEspacio = (id) => espacios.find((e) => e.id_esp === id)?.nom_esp || `Aula #${id}`;

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este horario de clase?')) return;
    try {
      await horariosApi.eliminar(id);
      recargar();
    } catch (err) {
      window.alert(mensajeDeError(err, 'No se pudo eliminar.'));
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Horarios de clases"
        descripcion="Carga el horario semanal de cada aula. Se repite toda la semana hasta fin de ciclo."
      >
        <Button onClick={() => setModal({})}>Nuevo horario</Button>
      </PageHeader>

      <div className="mt-6">
        <Select
          label="Filtrar por aula"
          value={filtroEspacio}
          onChange={(e) => setFiltroEspacio(e.target.value)}
          className="w-64"
        >
          <option value="">Todas las aulas</option>
          {espacios.map((e) => (
            <option key={e.id_esp} value={e.id_esp}>
              {e.nom_esp}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={horarios}
          cargando={cargando}
          error={error}
          mensajeVacio="No hay horarios cargados."
          renderFila={(h) => (
            <tr key={h.id_hor} className="border-b border-line last:border-0">
              <td className="px-5 py-3">{h.espacio?.nom_esp || nombreEspacio(h.id_esp)}</td>
              <td className="px-5 py-3">{ETIQUETA_DIA[h.dia_semana] || h.dia_semana}</td>
              <td className="px-5 py-3">
                {h.hora_ini} – {h.hora_fin}
              </td>
              <td className="px-5 py-3">{h.nombre_curso}</td>
              <td className="px-5 py-3 text-ink/70">
                {h.docente ? `${h.docente.nombres} ${h.docente.apellidos}` : '—'}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => setModal({ horario: h })}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminar(h.id_hor)}
                  className="ml-4 text-sm text-danger font-medium hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal
        abierto={Boolean(modal)}
        onCerrar={() => setModal(null)}
        titulo={modal?.horario ? 'Editar horario' : 'Nuevo horario'}
      >
        {modal && (
          <FormularioHorario
            horario={modal.horario}
            espacios={espacios}
            docentes={docentes}
            onCancelar={() => setModal(null)}
            onListo={() => {
              setModal(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </Layout>
  );
}

function FormularioHorario({ horario, espacios, docentes, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
    id_esp: horario?.id_esp ? String(horario.id_esp) : '',
    nombre_curso: horario?.nombre_curso || '',
    id_doc: horario?.id_doc ? String(horario.id_doc) : '',
    dia_semana: horario?.dia_semana || 'LUNES',
    hora_ini: horario?.hora_ini || '',
    hora_fin: horario?.hora_fin || '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (valores.hora_fin <= valores.hora_ini) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setEnviando(true);
    const payload = {
      id_esp: Number(valores.id_esp),
      nombre_curso: valores.nombre_curso,
      id_doc: valores.id_doc ? Number(valores.id_doc) : null,
      dia_semana: valores.dia_semana,
      hora_ini: valores.hora_ini,
      hora_fin: valores.hora_fin,
    };
    try {
      if (horario) await horariosApi.actualizar(horario.id_hor, payload);
      else await horariosApi.crear(payload);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el horario.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Select label="Aula" name="id_esp" required value={valores.id_esp} onChange={handleChange}>
          <option value="">Selecciona un aula</option>
          {espacios.map((e) => (
            <option key={e.id_esp} value={e.id_esp}>
              {e.nom_esp}
            </option>
          ))}
        </Select>
      </div>

      <div className="col-span-2">
        <Input
          label="Curso"
          name="nombre_curso"
          required
          value={valores.nombre_curso}
          onChange={handleChange}
          placeholder="Programación II - Paralelo A"
        />
      </div>

      <Select label="Día" name="dia_semana" value={valores.dia_semana} onChange={handleChange} options={OPCIONES_DIA} />

      <Select label="Docente (opcional)" name="id_doc" value={valores.id_doc} onChange={handleChange}>
        <option value="">Sin asignar</option>
        {docentes.map((d) => (
          <option key={d.id_usr} value={d.id_usr}>
            {d.nombres} {d.apellidos}
          </option>
        ))}
      </Select>

      <Input label="Hora inicio" type="time" name="hora_ini" required value={valores.hora_ini} onChange={handleChange} />
      <Input label="Hora fin" type="time" name="hora_fin" required value={valores.hora_fin} onChange={handleChange} />

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Guardando…">
          Guardar
        </Button>
      </div>
    </form>
  );
}
