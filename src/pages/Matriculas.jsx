import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { matriculasApi } from '../api/endpoints/matriculas';
import { paralelosApi } from '../api/endpoints/paralelos';
import { usuariosApi } from '../api/endpoints/usuarios';
import { mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, ConfirmDialog, Input, Modal, PageHeader, Select, Table } from '../components/ui';

const OPCIONES_MIN = [
  { value: '0', label: 'Cualquier cantidad' },
  { value: '1', label: '1 o más estudiantes' },
  { value: '5', label: '5 o más estudiantes' },
  { value: '10', label: '10 o más estudiantes' },
  { value: '20', label: '20 o más estudiantes' },
];

const COLUMNAS = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'paralelo', titulo: 'Materia · Paralelo' },
  { clave: 'nivel', titulo: 'Nivel / Carrera' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

function etiquetaParalelo(p) {
  if (!p) return '—';
  return `${p.materia?.nom_mat || ''} · Paralelo ${p.nom_par}`;
}

export default function Matriculas() {
  const { mostrarToast } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [minEstudiantes, setMinEstudiantes] = useState('0');

  const cargar = useCallback(async () => {
    const [matriculas, paralelos, estudiantes] = await Promise.all([
      matriculasApi.listar(),
      paralelosApi.listar(),
      usuariosApi.listar('ESTUDIANTE'),
    ]);
    return { matriculas, paralelos, estudiantes };
  }, []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las matrículas.',
  });

  const matriculas = data?.matriculas ?? [];
  const paralelos = data?.paralelos ?? [];
  const estudiantes = data?.estudiantes ?? [];
  const puedeMatricular = paralelos.length > 0 && estudiantes.length > 0;

  // Cantidad de estudiantes matriculados por paralelo, para el filtro y el badge de la tabla.
  const conteoPorParalelo = useMemo(() => {
    const mapa = new Map();
    matriculas.forEach((m) => {
      const id = m.paralelo?.id_par;
      if (id) mapa.set(id, (mapa.get(id) || 0) + 1);
    });
    return mapa;
  }, [matriculas]);

  const matriculasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const minimo = Number(minEstudiantes);
    return matriculas.filter((m) => {
      const cantidad = conteoPorParalelo.get(m.paralelo?.id_par) || 0;
      if (cantidad < minimo) return false;
      if (!q) return true;
      const texto = `${m.estudiante?.nombres || ''} ${m.estudiante?.apellidos || ''} ${m.estudiante?.cedula || ''} ${etiquetaParalelo(m.paralelo)}`.toLowerCase();
      return texto.includes(q);
    });
  }, [matriculas, busqueda, minEstudiantes, conteoPorParalelo]);

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await matriculasApi.eliminar(aEliminar.id_matricula);
      recargar();
      mostrarToast('Matrícula eliminada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la matrícula.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Layout>
      <PageHeader titulo="Matrículas" descripcion="Matricula estudiantes en un paralelo.">
        <Button onClick={() => setModalAbierto(true)} disabled={!puedeMatricular}>
          Nueva matrícula
        </Button>
      </PageHeader>

      {!cargando && !puedeMatricular && (
        <div className="mt-4">
          <Alert>
            {paralelos.length === 0
              ? 'No hay paralelos registrados todavía. Crea uno en "Paralelos" antes de matricular.'
              : 'No hay estudiantes registrados todavía.'}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Nombre, cédula o curso…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64"
        />
        <Select
          label="Estudiantes por curso"
          value={minEstudiantes}
          onChange={(e) => setMinEstudiantes(e.target.value)}
          options={OPCIONES_MIN}
          className="w-52"
        />
        <p className="text-sm text-ink/50 pb-2">{matriculasFiltradas.length} matrícula(s)</p>
      </div>

      <div className="mt-4">
        <Table
          columnas={COLUMNAS}
          datos={matriculasFiltradas}
          cargando={cargando}
          error={error}
          mensajeVacio="Ninguna matrícula coincide con los filtros."
          renderFila={(m) => (
            <tr key={m.id_matricula} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                {m.estudiante ? `${m.estudiante.nombres} ${m.estudiante.apellidos}` : '—'}
              </td>
              <td className="px-5 py-3 text-ink/70">{m.estudiante?.cedula || '—'}</td>
              <td className="px-5 py-3">
                <span className="inline-flex items-center gap-2">
                  {etiquetaParalelo(m.paralelo)}
                  <Badge className="bg-line text-ink/60 shrink-0">
                    {conteoPorParalelo.get(m.paralelo?.id_par) || 0}
                  </Badge>
                </span>
              </td>
              <td className="px-5 py-3 text-ink/70">
                {m.paralelo?.nivel?.nom_niv} · {m.paralelo?.nivel?.carrera?.nom_car}
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => setAEliminar(m)}
                  className="text-sm text-danger font-medium hover:underline"
                >
                  Quitar
                </button>
              </td>
            </tr>
          )}
        />
      </div>

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nueva matrícula">
        <FormularioMatricula
          paralelos={paralelos}
          estudiantes={estudiantes}
          onCancelar={() => setModalAbierto(false)}
          onListo={() => {
            setModalAbierto(false);
            recargar();
          }}
        />
      </Modal>

      <ConfirmDialog
        abierto={Boolean(aEliminar)}
        titulo="Quitar matrícula"
        mensaje={
          aEliminar
            ? `¿Quitar a "${aEliminar.estudiante?.nombres} ${aEliminar.estudiante?.apellidos}" de "${etiquetaParalelo(aEliminar.paralelo)}"?`
            : ''
        }
        textoConfirmar="Quitar"
        textoCargando="Quitando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </Layout>
  );
}

function FormularioMatricula({ paralelos, estudiantes, onCancelar, onListo }) {
  const { valores, handleChange } = useForm({
    id_est: estudiantes[0] ? String(estudiantes[0].id_usr) : '',
    id_par: paralelos[0] ? String(paralelos[0].id_par) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await matriculasApi.crear({ id_est: Number(valores.id_est), id_par: Number(valores.id_par) });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo matricular al estudiante.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Select label="Estudiante" name="id_est" required value={valores.id_est} onChange={handleChange}>
        {estudiantes.map((e) => (
          <option key={e.id_usr} value={e.id_usr}>
            {e.nombres} {e.apellidos} · {e.cedula}
          </option>
        ))}
      </Select>
      <Select label="Paralelo" name="id_par" required value={valores.id_par} onChange={handleChange}>
        {paralelos.map((p) => (
          <option key={p.id_par} value={p.id_par}>
            {etiquetaParalelo(p)} · {p.nivel?.nom_niv} ({p.nivel?.carrera?.nom_car})
          </option>
        ))}
      </Select>

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Matriculando…">
          Matricular
        </Button>
      </div>
    </form>
  );
}
