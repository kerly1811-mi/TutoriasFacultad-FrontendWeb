import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { reservasApi } from '../api/endpoints/reservas';
import { asistenciasApi } from '../api/endpoints/asistencias';
import { documentosApi } from '../api/endpoints/documentos';
import { matriculasApi } from '../api/endpoints/matriculas';
import { espaciosApi } from '../api/endpoints/espacios';
import { paralelosApi } from '../api/endpoints/paralelos';
import { PUEDE_COMPARTIR_DOCUMENTO, PUEDE_VER_ASISTENCIA, puede } from '../lib/permisos';
import {
  estadoReserva,
  formatearFechaLarga,
  formatearHoraLocal,
  formatearRango,
  mensajeDeError,
  puedeRegistrarAsistencia,
} from '../lib/formato';
import { Alert, Badge, Button, Card, CodigoQR, ConfirmDialog, DataState, Input, Modal } from '../components/ui';
import FormularioEditarReserva from '../components/reservas/FormularioEditarReserva';

const ETIQUETA_ESTADO = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'En curso',
  CONCLUIDA: 'Concluida',
  CANCELADA: 'Cancelada',
};
const ESTILO_ESTADO = {
  PENDIENTE: 'bg-celeste/15 text-celeste-dark border border-celeste/30',
  ACTIVA: 'bg-success/15 text-success border border-success/30',
  CONCLUIDA: 'bg-azul-dark/10 text-azul-dark border border-azul-dark/20',
  CANCELADA: 'bg-danger/10 text-danger border border-danger/20',
};

export default function DetalleReserva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { mostrarToast } = useToast();
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const cargarReserva = useCallback(() => reservasApi.obtener(id), [id]);
  const {
    data: reserva,
    cargando,
    error,
    recargar,
  } = useApiResource(cargarReserva, { mensajeError: 'No se pudo cargar la reserva.' });

  const puedeVerAsistencia = puede(PUEDE_VER_ASISTENCIA, usuario?.rol);
  const esDueno = reserva && reserva.solicitante?.id_usr === usuario?.id;
  // ADMINISTRADOR puede compartir en cualquier tutoría; un DOCENTE solo en la suya
  // (el backend aplica la misma regla al subir/eliminar).
  const puedeCompartir = puede(PUEDE_COMPARTIR_DOCUMENTO, usuario?.rol) && (usuario?.rol !== 'DOCENTE' || esDueno);
  const puedeCancelarCualquiera = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'LABORATORISTA';
  const estado = reserva ? estadoReserva(reserva) : null;
  const puedeCancelar = reserva && (estado === 'PENDIENTE' || estado === 'ACTIVA') && (esDueno || puedeCancelarCualquiera);
  const puedeEditar = reserva && (estado === 'PENDIENTE' || estado === 'ACTIVA') && esDueno;

  const cargarEspacios = useCallback(() => espaciosApi.listar(), []);
  const { data: espacios } = useApiResource(cargarEspacios, { auto: Boolean(puedeEditar) });
  const cargarParalelos = useCallback(() => paralelosApi.listar({ id_doc: usuario?.id }), [usuario?.id]);
  const { data: misParalelos } = useApiResource(cargarParalelos, { auto: Boolean(puedeEditar) });

  async function cancelar(razon) {
    setCancelando(true);
    try {
      await reservasApi.cancelar(id, razon);
      await recargar();
      mostrarToast('Reserva cancelada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cancelar la reserva.'), 'error');
    } finally {
      setCancelando(false);
      setConfirmarCancelar(false);
    }
  }

  async function finalizar() {
    setFinalizando(true);
    try {
      const d = new Date();
      const horaFin = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      await reservasApi.finalizar(id, horaFin);
      await recargar();
      mostrarToast('Tutoría finalizada. El resto del espacio quedó libre.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo finalizar la tutoría.'), 'error');
    } finally {
      setFinalizando(false);
      setConfirmarFinalizar(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-azul font-medium hover:underline">
          ← Volver
        </button>
        <h1 className="font-display text-lg text-ink/70">Detalle de tutoría</h1>
      </div>

      <div className="mt-2">
        <DataState cargando={cargando} error={error} vacio={!reserva} mensajeVacio="No se encontró la reserva.">
          {reserva && (
            <>
              <Card padding="p-4 sm:p-5" className="mt-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-celeste/15 text-celeste-dark shrink-0">
                      <IconoCalendario />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-lg text-ink leading-tight truncate">
                        {reserva.paralelo
                          ? `${reserva.paralelo.materia?.nom_mat} · Paralelo ${reserva.paralelo.nom_par}`
                          : reserva.motivo || 'Reserva de espacio'}
                      </p>
                      <p className="text-sm text-ink/60 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <IconoUbicacion />
                          {reserva.espacio?.nom_esp || 'Espacio'}
                        </span>
                        <span className="text-ink/30">·</span>
                        <span className="inline-flex items-center gap-1">
                          <IconoReloj />
                          {formatearFechaLarga(reserva.fecha)} · {formatearRango(reserva.hor_ini, reserva.hor_fin)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`inline-flex items-center gap-1.5 ${ESTILO_ESTADO[estado]}`}>
                      {estado === 'ACTIVA' && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                      {ETIQUETA_ESTADO[estado]}
                    </Badge>
                    {puedeEditar && (
                      <Button variant="secondary" size="sm" onClick={() => setEditando(true)}>
                        <span className="inline-flex items-center gap-1.5">
                          <IconoEditar /> Editar
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mt-3 pt-3 border-t border-line">
                  <p className="text-ink/70">
                    <span className="text-ink/40">Docente: </span>
                    {reserva.solicitante ? `${reserva.solicitante.nombres} ${reserva.solicitante.apellidos}` : '—'}
                  </p>
                  <p className="text-ink/70">
                    <span className="text-ink/40">Tema: </span>
                    {reserva.motivo || 'Sin especificar'}
                  </p>
                  {reserva.paralelo && (
                    <p className="text-ink/70">
                      <span className="text-ink/40">Curso: </span>
                      {reserva.paralelo.nivel?.nom_niv}, {reserva.paralelo.nivel?.carrera?.nom_car}
                    </p>
                  )}
                </div>
                {estado === 'CANCELADA' && reserva.motivo_cancelacion && (
                  <p className="text-sm text-danger mt-2">Motivo de cancelación: {reserva.motivo_cancelacion}</p>
                )}

                {estado === 'ACTIVA' && esDueno ? (
                  <div className="mt-3 pt-3 border-t border-line">
                    <Button variant="secondary" size="sm" onClick={() => setConfirmarFinalizar(true)}>
                      Finalizar tutoría
                    </Button>
                  </div>
                ) : (
                  puedeCancelar && (
                    <div className="mt-3 pt-3 border-t border-line">
                      <Button variant="danger" size="sm" onClick={() => setConfirmarCancelar(true)}>
                        Cancelar reserva
                      </Button>
                    </div>
                  )
                )}
              </Card>

              {estado !== 'CANCELADA' && puedeVerAsistencia && (
                <SeccionAsistencia idReserva={id} reserva={reserva} estado={estado} esDueno={esDueno} usuario={usuario} />
              )}

              {estado !== 'CANCELADA' && <SeccionDocumentos idReserva={id} puedeCompartir={puedeCompartir} />}
            </>
          )}
        </DataState>
      </div>

      {reserva && (
        <Modal abierto={editando} onCerrar={() => setEditando(false)} titulo="Editar reserva">
          {editando && (
            <FormularioEditarReserva
              reserva={reserva}
              espacios={espacios ?? []}
              misParalelos={misParalelos ?? []}
              onCancelar={() => setEditando(false)}
              onListo={() => {
                setEditando(false);
                recargar();
                mostrarToast('Reserva actualizada.', 'exito');
              }}
            />
          )}
        </Modal>
      )}

      <ConfirmDialog
        abierto={confirmarCancelar}
        titulo="Cancelar reserva"
        mensaje="¿Cancelar esta reserva? El aula quedará libre en esa franja."
        textoConfirmar="Cancelar reserva"
        textoCargando="Cancelando…"
        pedirRazon
        labelRazon="Motivo de la cancelación"
        placeholderRazon="Ej: el docente no podrá asistir a esta tutoría"
        cargando={cancelando}
        onConfirmar={cancelar}
        onCancelar={() => setConfirmarCancelar(false)}
      />

      <ConfirmDialog
        abierto={confirmarFinalizar}
        titulo="Finalizar tutoría"
        mensaje="La tutoría quedará concluida desde ahora mismo y el resto del espacio quedará libre para otras reservas. Los estudiantes que no se marcaron presentes quedarán como ausentes."
        textoConfirmar="Finalizar tutoría"
        textoCargando="Finalizando…"
        variant="secondary"
        cargando={finalizando}
        onConfirmar={finalizar}
        onCancelar={() => setConfirmarFinalizar(false)}
      />
    </Layout>
  );
}

function SeccionAsistencia({ idReserva, reserva, estado, esDueno, usuario }) {
  const { mostrarToast } = useToast();
  const [pestana, setPestana] = useState('qr');
  const [procesandoId, setProcesandoId] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const cargarAsistencias = useCallback(() => asistenciasApi.listarPorReserva(idReserva), [idReserva]);
  const { data: asistencias, cargando, error, recargar } = useApiResource(cargarAsistencias, {
    mensajeError: 'No se pudo cargar la asistencia.',
  });
  const listaAsistencias = asistencias ?? [];
  const idsPresentes = new Set(listaAsistencias.map((a) => a.id_est));

  const esDocenteDueno = esDueno && usuario?.rol === 'DOCENTE';
  const cargarRoster = useCallback(
    () => (reserva.paralelo ? matriculasApi.listar({ id_par: reserva.paralelo.id_par }) : Promise.resolve([])),
    [reserva.paralelo]
  );
  const { data: roster } = useApiResource(cargarRoster, { auto: Boolean(esDocenteDueno && reserva.paralelo) });
  const listaRoster = roster ?? [];
  const inscritos = reserva.paralelo ? listaRoster.length : listaAsistencias.length;
  const presentes = listaAsistencias.length;

  async function alternarPresencia(idEstudiante) {
    setProcesandoId(idEstudiante);
    try {
      if (idsPresentes.has(idEstudiante)) {
        await asistenciasApi.quitarManual(idReserva, idEstudiante);
      } else {
        await asistenciasApi.registrarManual(idReserva, idEstudiante);
      }
      await recargar();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar la asistencia.'), 'error');
    } finally {
      setProcesandoId(null);
    }
  }

  // Ventana de registro: desde que comienza la tutoría hasta 5 min después de
  // que termina. Fuera de esta ventana no se puede tomar asistencia (ni por QR
  // ni manual). Si el docente finalizó la tutoría antes de tiempo, hor_fin ya
  // quedó recortado a ese momento, así que la ventana se cierra sola.
  const enVentana = puedeRegistrarAsistencia(reserva);
  const mostrarControles = esDocenteDueno && estado !== 'CANCELADA' && enVentana;
  const mostrarResultadoFinal = esDocenteDueno && estado !== 'CANCELADA' && !enVentana && estado !== 'PENDIENTE';

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-ink">Control de asistencia</h2>
      <p className="text-sm text-ink/50 mt-1 mb-3">
        {esDocenteDueno
          ? 'Escanea el QR desde el móvil del estudiante o marca su asistencia manualmente.'
          : 'Registros de asistencia de esta tutoría.'}
      </p>

      <div className="mt-4">
        {mostrarControles && (
          <>
            <div className="flex gap-1 rounded-lg border border-line bg-white p-1 mb-3 w-fit">
              <button
                type="button"
                onClick={() => setPestana('qr')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pestana === 'qr' ? 'bg-azul text-white' : 'text-ink/60 hover:bg-paper'
                }`}
              >
                Asistentes
              </button>
              <button
                type="button"
                onClick={() => setPestana('manual')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pestana === 'manual' ? 'bg-azul text-white' : 'text-ink/60 hover:bg-paper'
                }`}
              >
                Registro manual
              </button>
            </div>

            {pestana === 'qr' && (
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                <PanelQR reserva={reserva} />
                <ListaAsistentes
                  asistencias={listaAsistencias}
                  cargando={cargando}
                  error={error}
                  titulo={`Asistentes (${presentes})`}
                />
              </div>
            )}

            {pestana === 'manual' && (
              <PanelEstudiantes
                roster={listaRoster}
                sinCurso={!reserva.paralelo}
                idsPresentes={idsPresentes}
                presentes={presentes}
                inscritos={inscritos}
                editable
                procesandoId={procesandoId}
                onToggle={alternarPresencia}
                busqueda={busqueda}
                onBuscar={setBusqueda}
              />
            )}
          </>
        )}

        {esDocenteDueno && estado === 'PENDIENTE' && (
          <p className="text-sm text-ink/50">La asistencia se podrá registrar cuando comience la tutoría.</p>
        )}

        {mostrarResultadoFinal && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <TarjetaStat titulo="Pertenecen al grupo" valor={inscritos} color="text-ink" />
              <TarjetaStat titulo="Asistieron" valor={presentes} color="text-success" icono={<IconoCheck className="w-4 h-4" />} />
            </div>
            <ListaAsistentes asistencias={listaAsistencias} cargando={cargando} error={error} titulo="Estudiantes que asistieron" />
          </>
        )}

        {!esDocenteDueno && (
          <ListaAsistentes asistencias={listaAsistencias} cargando={cargando} error={error} titulo="Estudiantes que asistieron" />
        )}
      </div>
    </section>
  );
}

// Listado de solo quienes ya registraron asistencia (no todo el curso).
function ListaAsistentes({ asistencias, cargando, error, titulo }) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      {titulo && <p className="font-display text-base text-ink px-5 py-3 border-b border-line">{titulo}</p>}
      <DataState
        cargando={cargando}
        error={error}
        vacio={asistencias.length === 0}
        mensajeVacio="Todavía no hay asistencia registrada."
      >
        <ul className="divide-y divide-line max-h-72 overflow-y-auto">
          {asistencias.map((a) => (
            <li key={a.id_asi} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-sm text-ink truncate">
                {a.estudiante ? `${a.estudiante.nombres} ${a.estudiante.apellidos}` : `Estudiante #${a.id_est}`}
              </span>
              <span className="text-xs text-ink/50 shrink-0">{formatearHoraLocal(a.hora_registro)}</span>
            </li>
          ))}
        </ul>
      </DataState>
    </Card>
  );
}

// Roster completo del curso con búsqueda, para el registro manual (necesita
// ver también a quienes faltan por marcar). Con ~30 alumnos por curso, la
// lista scrollea en vez de estirar la página.
function PanelEstudiantes({ roster, sinCurso, idsPresentes, presentes, inscritos, editable, procesandoId, onToggle, busqueda, onBuscar }) {
  const q = (busqueda || '').trim().toLowerCase();
  const filtrados = q
    ? roster.filter((m) => `${m.estudiante.nombres} ${m.estudiante.apellidos}`.toLowerCase().includes(q))
    : roster;

  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
        <p className="font-display text-base text-ink">Estudiantes del curso</p>
        <Badge className="bg-success/10 text-success shrink-0">
          {presentes}/{inscritos}
        </Badge>
      </div>

      {editable && !sinCurso && roster.length > 0 && (
        <div className="px-5 py-3 border-b border-line">
          <Input
            placeholder="Buscar estudiante…"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
          />
        </div>
      )}

      {sinCurso ? (
        <p className="text-sm text-ink/50 p-6">
          Esta reserva no está ligada a un curso, así que no hay un listado de estudiantes.
        </p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-ink/50 p-6">Nadie está matriculado en este curso todavía.</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-ink/50 p-6">Ningún estudiante coincide con la búsqueda.</p>
      ) : (
        <ul className="divide-y divide-line max-h-80 overflow-y-auto">
          {filtrados.map((m) => {
            const presente = idsPresentes.has(m.estudiante.id_usr);
            const procesando = procesandoId === m.estudiante.id_usr;
            return (
              <li key={m.id_matricula} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {m.estudiante.nombres} {m.estudiante.apellidos}
                  </p>
                  <p className="text-xs text-ink/50">{m.estudiante.cedula}</p>
                </div>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => onToggle(m.estudiante.id_usr)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors disabled:opacity-50 ${
                    presente
                      ? 'bg-success/10 text-success border-success/30 hover:bg-success/15'
                      : 'bg-white text-ink/50 border-line hover:border-ink/30'
                  }`}
                >
                  {presente ? <IconoCheck className="w-4 h-4" /> : <IconoCirculo className="w-4 h-4" />}
                  {presente ? 'Presente' : 'Marcar presente'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function TarjetaStat({ titulo, valor, color, icono }) {
  return (
    <Card padding="p-4">
      <p className="text-xs uppercase tracking-wide text-ink/40">{titulo}</p>
      <p className={`font-display text-2xl mt-1 flex items-center gap-2 ${color}`}>
        {icono}
        {valor}
      </p>
    </Card>
  );
}

// QR pequeño al costado del listado de asistentes (pestaña "Asistentes").
function PanelQR({ reserva }) {
  const mostrar = puedeRegistrarAsistencia(reserva);
  return (
    <Card padding="p-4" className="flex flex-col items-center text-center h-fit">
      {mostrar ? (
        <>
          <CodigoQR valor={reserva.qr_token} tamano={160} />
          <p className="text-xs text-ink/50 mt-2">El estudiante lo escanea con su celular.</p>
        </>
      ) : (
        <p className="text-xs text-ink/50 py-6">El QR ya no está disponible.</p>
      )}
    </Card>
  );
}

// Origen del backend (sin el sufijo /api) para armar el link de descarga de
// los archivos subidos, cuyo url_archivo es una ruta relativa ("/uploads/...").
const ORIGEN_ARCHIVOS = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

function urlDescarga(doc) {
  return /^https?:\/\//.test(doc.url_archivo) ? doc.url_archivo : `${ORIGEN_ARCHIVOS}${doc.url_archivo}`;
}

const COLOR_EXTENSION = {
  pdf: 'bg-danger/10 text-danger',
  doc: 'bg-celeste/15 text-celeste-dark',
  docx: 'bg-celeste/15 text-celeste-dark',
  ppt: 'bg-amber-500/10 text-amber-700',
  pptx: 'bg-amber-500/10 text-amber-700',
  xls: 'bg-success/10 text-success',
  xlsx: 'bg-success/10 text-success',
  zip: 'bg-amber-500/10 text-amber-700',
  rar: 'bg-amber-500/10 text-amber-700',
};

function formatearTamano(bytes) {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatearFechaCorta(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${MESES[d.getMonth()]}. ${d.getFullYear()}`;
}

function SeccionDocumentos({ idReserva, puedeCompartir }) {
  const { mostrarToast } = useToast();
  const [modalSubir, setModalSubir] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(() => documentosApi.listarPorReserva(idReserva), [idReserva]);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los documentos.',
  });
  const documentos = data ?? [];

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await documentosApi.eliminar(aEliminar.id_docu);
      await recargar();
      mostrarToast('Documento eliminado.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el documento.'), 'error');
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-ink">Materiales de la tutoría</h2>
          <p className="text-sm text-ink/50 mt-1">
            {puedeCompartir
              ? 'Sube y gestiona los recursos que compartirás con tus estudiantes.'
              : 'Solo lo ven los estudiantes que registraron asistencia.'}
          </p>
        </div>
        {puedeCompartir && <Button onClick={() => setModalSubir(true)}>Subir material</Button>}
      </div>

      <div className="mt-4">
        <Card padding="p-0" className="overflow-hidden">
          <DataState
            cargando={cargando}
            error={error}
            vacio={documentos.length === 0}
            textoCargando="Cargando documentos…"
            mensajeVacio="Aún no se ha compartido material."
          >
            <ul className="divide-y divide-line">
              {documentos.map((doc) => (
                <li key={doc.id_docu} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${
                      doc.extension ? COLOR_EXTENSION[doc.extension] || 'bg-line text-ink/60' : 'bg-celeste/15 text-celeste-dark'
                    }`}
                  >
                    {doc.extension ? <IconoArchivo /> : <IconoEnlace />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{doc.nom_archivo}</p>
                    <p className="text-xs text-ink/50">
                      {doc.extension ? doc.extension.toUpperCase() : 'Enlace'}
                      {formatearTamano(doc.tamano_bytes) && ` · ${formatearTamano(doc.tamano_bytes)}`}
                      {' · '}
                      {formatearFechaCorta(doc.fecha_subida)}
                    </p>
                  </div>
                  <a
                    href={urlDescarga(doc)}
                    target="_blank"
                    rel="noreferrer"
                    title="Descargar / abrir"
                    aria-label="Descargar"
                    className="shrink-0 text-azul/70 hover:text-azul transition-colors"
                  >
                    <IconoDescargar />
                  </a>
                  {puedeCompartir && (
                    <button
                      type="button"
                      onClick={() => setAEliminar(doc)}
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="shrink-0 text-danger/60 hover:text-danger transition-colors"
                    >
                      <IconoBasura />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </DataState>
        </Card>
      </div>

      <Modal abierto={modalSubir} onCerrar={() => setModalSubir(false)} titulo="Subir material">
        <FormularioSubirDocumento
          idReserva={idReserva}
          onCancelar={() => setModalSubir(false)}
          onSubido={() => {
            setModalSubir(false);
            recargar();
          }}
        />
      </Modal>

      <ConfirmDialog
        abierto={Boolean(aEliminar)}
        titulo="Eliminar documento"
        mensaje={aEliminar ? `¿Eliminar "${aEliminar.nom_archivo}"? Los estudiantes ya no podrán descargarlo.` : ''}
        textoConfirmar="Eliminar"
        textoCargando="Eliminando…"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </section>
  );
}

const TAMANO_MAXIMO = 25 * 1024 * 1024;

let idPendienteSeq = 0;

// Zona de arrastrar-y-soltar (o clic para explorar) que acumula varios
// archivos a la vez en una lista de "pendientes"; el botón "Subir" los envía
// todos al backend uno por uno. También ofrece, como alternativa, compartir
// un enlace externo (Drive, etc.) sin subir ningún archivo.
function FormularioSubirDocumento({ idReserva, onCancelar, onSubido }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [pendientes, setPendientes] = useState([]); // { id, archivo, error? }
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });
  const [modoEnlace, setModoEnlace] = useState(false);
  const inputRef = useRef(null);

  function agregarArchivos(lista) {
    const nuevos = Array.from(lista || [])
      .filter((archivo) => archivo)
      .map((archivo) => ({
        id: ++idPendienteSeq,
        archivo,
        error: archivo.size > TAMANO_MAXIMO ? 'Pesa más de 25 MB.' : null,
      }));
    if (nuevos.length > 0) setPendientes((prev) => [...prev, ...nuevos]);
  }

  function quitarPendiente(id) {
    setPendientes((prev) => prev.filter((p) => p.id !== id));
  }

  async function subirTodos() {
    const validos = pendientes.filter((p) => !p.error);
    if (validos.length === 0) return;
    setSubiendo(true);
    setProgreso({ hechos: 0, total: validos.length });
    let huboError = false;
    for (const p of validos) {
      try {
        await documentosApi.subir(idReserva, p.archivo);
        setPendientes((prev) => prev.filter((x) => x.id !== p.id));
      } catch (err) {
        huboError = true;
        setPendientes((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, error: mensajeDeError(err, 'No se pudo subir.') } : x))
        );
      } finally {
        setProgreso((prev) => ({ ...prev, hechos: prev.hechos + 1 }));
      }
    }
    setSubiendo(false);
    if (!huboError) onSubido();
  }

  if (modoEnlace) {
    return <FormularioEnlace idReserva={idReserva} onCancelar={() => setModoEnlace(false)} onCompartido={onSubido} />;
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          agregarArchivos(e.dataTransfer.files);
        }}
        onClick={() => !subiendo && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
          arrastrando ? 'border-azul bg-azul/5' : 'border-line hover:border-azul/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            agregarArchivos(e.target.files);
            e.target.value = '';
          }}
        />
        <IconoSubir className="w-7 h-7 mx-auto text-ink/40" />
        <p className="text-sm text-ink mt-2">
          Arrastra archivos aquí o <span className="text-azul font-medium">haz clic para elegirlos</span>
        </p>
        <p className="text-xs text-ink/50 mt-1">Puedes elegir varios a la vez · máximo 25 MB por archivo.</p>
      </div>

      {pendientes.length > 0 && (
        <ul className="divide-y divide-line border border-line rounded-md max-h-56 overflow-y-auto">
          {pendientes.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <IconoArchivo className="w-4 h-4 text-ink/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{p.archivo.name}</p>
                {p.error ? (
                  <p className="text-xs text-danger">{p.error}</p>
                ) : (
                  <p className="text-xs text-ink/50">{formatearTamano(p.archivo.size)}</p>
                )}
              </div>
              {!subiendo && (
                <button
                  type="button"
                  onClick={() => quitarPendiente(p.id)}
                  title="Quitar"
                  aria-label="Quitar"
                  className="shrink-0 text-ink/40 hover:text-danger transition-colors"
                >
                  <IconoCirculo className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {subiendo && (
        <div>
          <p className="text-sm text-ink/60 mb-2">
            Subiendo {progreso.hechos} de {progreso.total}…
          </p>
          <div className="h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-azul transition-all"
              style={{ width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setModoEnlace(true)}
          className="text-sm text-azul font-medium hover:underline"
        >
          Compartir un enlace en vez de un archivo
        </button>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={subiendo}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={subirTodos}
            disabled={pendientes.filter((p) => !p.error).length === 0}
            cargando={subiendo}
            textoCargando="Subiendo…"
          >
            Subir {pendientes.length > 0 ? `(${pendientes.filter((p) => !p.error).length})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormularioEnlace({ idReserva, onCancelar, onCompartido }) {
  const { valores, handleChange } = useForm({ nom_archivo: '', url_archivo: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await documentosApi.compartir({
        id_rev: Number(idReserva),
        nom_archivo: valores.nom_archivo,
        url_archivo: valores.url_archivo,
      });
      onCompartido();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo compartir el enlace.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Input
        label="Nombre"
        name="nom_archivo"
        required
        value={valores.nom_archivo}
        onChange={handleChange}
        placeholder="Guía de laboratorio 3"
      />
      <Input
        label="Enlace (URL)"
        type="url"
        name="url_archivo"
        required
        value={valores.url_archivo}
        onChange={handleChange}
        placeholder="https://drive.google.com/…"
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Volver
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Compartiendo…">
          Compartir enlace
        </Button>
      </div>
    </form>
  );
}

function IconoCalendario() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}
function IconoUbicacion() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function IconoReloj({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconoEditar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function IconoCheck({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}
function IconoCirculo({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function IconoArchivo({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function IconoEnlace({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}
function IconoDescargar({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
function IconoBasura({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function IconoSubir({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v6m0-6-3 3m3-3 3 3" />
    </svg>
  );
}
