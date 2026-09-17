import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { solicitudesApi } from '../api/endpoints/solicitudes';
import { matriculasApi } from '../api/endpoints/matriculas';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { fechaISO, formatearFecha, formatearRango, horaEnRango, mensajeDeError } from '../lib/formato';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  Input,
  Modal,
  PageHeader,
  Select,
  SelectorHora,
  SkeletonCards,
  Table,
  Textarea,
} from '../components/ui';

const HORA_MIN = 7;
const HORA_MAX = 20;

const ETIQUETA_ESTADO = { PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada' };
const ESTILO_ESTADO = {
  PENDIENTE: 'bg-celeste/10 text-celeste-dark',
  ACEPTADA: 'bg-success/10 text-success',
  RECHAZADA: 'bg-danger/10 text-danger',
};

function inicialesDe(nombre) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

const COLUMNAS_HISTORIAL_DOCENTE = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'curso', titulo: 'Curso' },
  { clave: 'cuando', titulo: 'Fecha y hora' },
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'estado', titulo: 'Estado' },
];

const COLUMNAS_ESTUDIANTE = [
  { clave: 'curso', titulo: 'Curso' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'cuando', titulo: 'Fecha y hora' },
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function Solicitudes() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'DOCENTE';

  return esDocente ? <VistaDocente /> : <VistaEstudiante />;
}

// ============================================================
// DOCENTE
// ============================================================
function VistaDocente() {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [aRechazar, setARechazar] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(() => solicitudesApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar las solicitudes.',
  });
  const solicitudes = data ?? [];
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const historial = solicitudes.filter((s) => s.estado !== 'PENDIENTE');

  async function aceptar(solicitud) {
    setProcesando(true);
    try {
      await solicitudesApi.aceptar(solicitud.id_sol);
      mostrarToast('Solicitud aceptada.', 'exito');
      navigate('/reservas', {
        state: {
          prefill: {
            estudiante: `${solicitud.estudiante.nombres} ${solicitud.estudiante.apellidos}`,
            idParalelo: solicitud.id_par,
            idEspacio: solicitud.id_esp,
            fecha: String(solicitud.fecha).slice(0, 10),
            horaIni: solicitud.hor_ini,
            horaFin: solicitud.hor_fin,
            tema: solicitud.tema || '',
          },
        },
      });
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo aceptar la solicitud.'), 'error');
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarRechazo(razon) {
    if (!aRechazar) return;
    setProcesando(true);
    try {
      await solicitudesApi.rechazar(aRechazar.id_sol, razon);
      await recargar();
      mostrarToast('Solicitud rechazada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo rechazar la solicitud.'), 'error');
    } finally {
      setProcesando(false);
      setARechazar(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Mis solicitudes"
        descripcion="Solicitudes de reserva que te envían los estudiantes para una tutoría."
      />

      <div className="mt-6">
        <DataState
          cargando={cargando}
          error={error}
          vacio={solicitudes.length === 0}
          skeleton={<SkeletonCards count={3} />}
          mensajeVacio="Aún no has recibido solicitudes."
        >
          {pendientes.length > 0 && (
            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">
                Pendientes ({pendientes.length})
              </p>
              <div className="space-y-3">
                {pendientes.map((s) => (
                  <Card key={s.id_sol} className="border-celeste/30">
                    <div className="flex items-start gap-4">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-celeste/15 text-celeste-dark text-sm font-semibold shrink-0">
                        {inicialesDe(`${s.estudiante.nombres} ${s.estudiante.apellidos}`)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <p className="font-display text-lg text-ink">
                            {s.estudiante.nombres} {s.estudiante.apellidos}
                          </p>
                          <Badge className={ESTILO_ESTADO.PENDIENTE}>{ETIQUETA_ESTADO.PENDIENTE}</Badge>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                          <p className="text-ink/70">
                            <span className="text-ink/40">Curso: </span>
                            {s.paralelo.materia.nom_mat} · {s.paralelo.nom_par}
                          </p>
                          <p className="text-ink/70">
                            <span className="text-ink/40">Cuándo: </span>
                            {formatearFecha(s.fecha)} · {formatearRango(s.hor_ini, s.hor_fin)}
                          </p>
                          <p className="text-ink/70">
                            <span className="text-ink/40">Espacio: </span>
                            {s.espacio.nom_esp}
                          </p>
                        </div>

                        {s.tema && <p className="text-sm text-ink/60 mt-2 italic">"{s.tema}"</p>}

                        <div className="mt-4 pt-3 border-t border-line flex justify-end gap-3">
                          <Button variant="secondary" size="sm" onClick={() => setARechazar(s)} disabled={procesando}>
                            Rechazar
                          </Button>
                          <Button size="sm" onClick={() => aceptar(s)} disabled={procesando}>
                            Aceptar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {historial.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">
                Historial ({historial.length})
              </p>
              <Table
                columnas={COLUMNAS_HISTORIAL_DOCENTE}
                datos={historial}
                mensajeVacio="Sin solicitudes resueltas todavía."
                renderFila={(s) => (
                  <tr key={s.id_sol} className="border-b border-line last:border-0 align-top">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-line text-ink/60 text-xs font-semibold shrink-0">
                          {inicialesDe(`${s.estudiante.nombres} ${s.estudiante.apellidos}`)}
                        </span>
                        <span className="text-ink">
                          {s.estudiante.nombres} {s.estudiante.apellidos}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink/70">
                      {s.paralelo.materia.nom_mat} · {s.paralelo.nom_par}
                    </td>
                    <td className="px-5 py-3 text-ink/70">
                      {formatearFecha(s.fecha)} · {formatearRango(s.hor_ini, s.hor_fin)}
                    </td>
                    <td className="px-5 py-3 text-ink/70">{s.espacio.nom_esp}</td>
                    <td className="px-5 py-3">
                      <Badge className={ESTILO_ESTADO[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</Badge>
                      {s.estado === 'RECHAZADA' && s.razon_rechazo && (
                        <p className="text-xs text-danger mt-1 max-w-[16rem]">{s.razon_rechazo}</p>
                      )}
                    </td>
                  </tr>
                )}
              />
            </div>
          )}
        </DataState>
      </div>

      <ConfirmDialog
        abierto={Boolean(aRechazar)}
        titulo="Rechazar solicitud"
        mensaje={
          aRechazar
            ? `¿Rechazar la solicitud de ${aRechazar.estudiante.nombres} ${aRechazar.estudiante.apellidos}?`
            : ''
        }
        textoConfirmar="Rechazar solicitud"
        textoCargando="Rechazando…"
        pedirRazon
        labelRazon="Motivo del rechazo"
        placeholderRazon="Ej: no tengo disponibilidad ese día"
        cargando={procesando}
        onConfirmar={confirmarRechazo}
        onCancelar={() => setARechazar(null)}
      />
    </Layout>
  );
}

// ============================================================
// ESTUDIANTE
// ============================================================
function VistaEstudiante() {
  const { mostrarToast } = useToast();
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null); // solicitud rechazada a mostrar

  const cargarSolicitudes = useCallback(() => solicitudesApi.listar(), []);
  const { data, cargando, error, recargar } = useApiResource(cargarSolicitudes, {
    mensajeError: 'No se pudieron cargar tus solicitudes.',
  });
  const solicitudes = data ?? [];

  const cargarMatriculas = useCallback(() => matriculasApi.listar(), []);
  const { data: matriculas } = useApiResource(cargarMatriculas, {
    mensajeError: 'No se pudieron cargar tus cursos.',
  });
  const misParalelos = (matriculas ?? []).map((m) => m.paralelo).filter(Boolean);

  return (
    <Layout>
      <PageHeader
        titulo="Solicitudes"
        descripcion="Pídele a un docente que reserve un espacio para una tutoría contigo."
      >
        <Button onClick={() => setModal(true)} disabled={misParalelos.length === 0}>
          Solicitar reserva
        </Button>
      </PageHeader>

      {!cargando && misParalelos.length === 0 && (
        <div className="mt-4">
          <Alert>No estás matriculado en ningún curso todavía, así que no puedes enviar solicitudes.</Alert>
        </div>
      )}

      <div className="mt-6">
        <DataState
          cargando={cargando}
          error={error}
          vacio={solicitudes.length === 0}
          skeleton={<SkeletonCards count={3} />}
          mensajeVacio="Aún no has enviado ninguna solicitud."
        >
          <Table
            columnas={COLUMNAS_ESTUDIANTE}
            datos={solicitudes}
            renderFila={(s) => (
              <tr key={s.id_sol} className="border-b border-line last:border-0 align-top">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{s.paralelo.materia.nom_mat}</p>
                  <p className="text-xs text-ink/50">Paralelo {s.paralelo.nom_par}</p>
                  {s.tema && <p className="text-xs text-ink/50 mt-0.5 italic max-w-[14rem] truncate">"{s.tema}"</p>}
                </td>
                <td className="px-5 py-3 text-ink/70">
                  {s.paralelo.docente.nombres} {s.paralelo.docente.apellidos}
                </td>
                <td className="px-5 py-3 text-ink/70">
                  {formatearFecha(s.fecha)} · {formatearRango(s.hor_ini, s.hor_fin)}
                </td>
                <td className="px-5 py-3 text-ink/70">{s.espacio.nom_esp}</td>
                <td className="px-5 py-3">
                  <Badge className={ESTILO_ESTADO[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</Badge>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {s.estado === 'RECHAZADA' && (
                    <button onClick={() => setDetalle(s)} className="text-sm text-azul font-medium hover:underline">
                      Ver motivo
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        </DataState>
      </div>

      <Modal abierto={modal} onCerrar={() => setModal(false)} titulo="Solicitar reserva">
        <FormularioSolicitud
          misParalelos={misParalelos}
          onCancelar={() => setModal(false)}
          onListo={() => {
            setModal(false);
            recargar();
            mostrarToast('Solicitud enviada al docente.', 'exito');
          }}
        />
      </Modal>

      <Modal abierto={Boolean(detalle)} onCerrar={() => setDetalle(null)} titulo="Motivo del rechazo" ancho="max-w-sm">
        <p className="text-sm text-ink/70">{detalle?.razon_rechazo || 'El docente no indicó un motivo.'}</p>
      </Modal>
    </Layout>
  );
}

function FormularioSolicitud({ misParalelos, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_par: misParalelos[0] ? String(misParalelos[0].id_par) : '',
    fecha: '',
    hora_ini: '',
    hora_fin: '',
    id_esp: '',
    tema: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const HOY = fechaISO(new Date());

  const franjaCompleta =
    valores.fecha &&
    horaEnRango(valores.hora_ini, HORA_MIN, HORA_MAX) &&
    horaEnRango(valores.hora_fin, HORA_MIN, HORA_MAX) &&
    valores.hora_fin > valores.hora_ini;

  const consultarDisponibilidad = useCallback(() => {
    if (!franjaCompleta) return Promise.resolve(null);
    return disponibilidadApi.consultar({ fecha: valores.fecha, horaIni: valores.hora_ini, horaFin: valores.hora_fin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franjaCompleta, valores.fecha, valores.hora_ini, valores.hora_fin]);
  const { data: disponibilidad, cargando: cargandoEspacios } = useApiResource(consultarDisponibilidad, {
    mensajeError: 'No se pudo consultar la disponibilidad.',
  });
  const espaciosLibres = (disponibilidad?.espacios ?? []).filter((e) => e.libre);

  // Si cambia la franja y el espacio elegido ya no está libre, se limpia la selección.
  useEffect(() => {
    if (valores.id_esp && !espaciosLibres.some((e) => String(e.id_esp) === valores.id_esp)) {
      setCampo('id_esp', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponibilidad]);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.id_par) return setError('Selecciona el curso.');
    if (!valores.fecha) return setError('Selecciona la fecha.');
    if (!horaEnRango(valores.hora_ini, HORA_MIN, HORA_MAX) || !horaEnRango(valores.hora_fin, HORA_MIN, HORA_MAX)) {
      return setError(`La hora debe estar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00.`);
    }
    if (valores.hora_fin <= valores.hora_ini) {
      return setError('La hora de fin debe ser posterior a la de inicio.');
    }
    if (!valores.id_esp) return setError('Selecciona un espacio libre para esa fecha y hora.');
    setEnviando(true);
    try {
      await solicitudesApi.crear({
        id_par: Number(valores.id_par),
        id_esp: Number(valores.id_esp),
        fecha: valores.fecha,
        hor_ini: valores.hora_ini,
        hor_fin: valores.hora_fin,
        tema: valores.tema,
      });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Select label="Curso" name="id_par" required value={valores.id_par} onChange={handleChange}>
        {misParalelos.map((p) => (
          <option key={p.id_par} value={p.id_par}>
            {p.materia?.nom_mat} · Paralelo {p.nom_par}
          </option>
        ))}
      </Select>

      <Input label="Fecha" type="date" name="fecha" min={HOY} required value={valores.fecha} onChange={handleChange} />

      <div className="flex flex-wrap gap-3">
        <SelectorHora
          label="Desde"
          required
          value={valores.hora_ini}
          onChange={(v) => setCampo('hora_ini', v)}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
        <SelectorHora
          label="Hasta"
          required
          value={valores.hora_fin}
          onChange={(v) => setCampo('hora_fin', v)}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
      </div>

      {franjaCompleta && (
        <Select
          label="Espacio"
          name="id_esp"
          required
          value={valores.id_esp}
          onChange={handleChange}
          disabled={cargandoEspacios}
        >
          <option value="">{cargandoEspacios ? 'Buscando disponibles…' : 'Selecciona un espacio libre'}</option>
          {espaciosLibres.map((e) => (
            <option key={e.id_esp} value={e.id_esp}>
              {e.nom_esp}
              {e.bloque ? ` · Bloque ${e.bloque === 'BLOQUE_1' ? '1' : '2'}` : ''}
            </option>
          ))}
        </Select>
      )}
      {franjaCompleta && !cargandoEspacios && espaciosLibres.length === 0 && (
        <Alert>No hay espacios libres en esa fecha y horario. Prueba con otra franja.</Alert>
      )}

      <Textarea
        label="Tema de la tutoría"
        rows={2}
        name="tema"
        value={valores.tema}
        onChange={handleChange}
        placeholder="Refuerzo de bases de datos, tema del segundo parcial…"
      />

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Enviando…">
          Enviar solicitud
        </Button>
      </div>
    </form>
  );
}
