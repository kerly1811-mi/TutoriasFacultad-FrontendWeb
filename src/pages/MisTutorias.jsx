import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { asistenciasApi } from '../api/endpoints/asistencias';
import { documentosApi } from '../api/endpoints/documentos';
import { estadoReserva, formatearFechaLarga, formatearHoraLocal, formatearRango } from '../lib/formato';
import { Badge, Card, DataState, Input, Modal, PageHeader, SkeletonCards } from '../components/ui';

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

export default function MisTutorias() {
  const [materialesDe, setMaterialesDe] = useState(null); // reserva seleccionada
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(() => asistenciasApi.listarMias(), []);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar tu historial de tutorías.',
  });
  const asistencias = data ?? [];

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return asistencias;
    return asistencias.filter((a) => {
      const r = a.reserva;
      const texto = [
        r.motivo,
        r.paralelo?.materia?.nom_mat,
        r.paralelo?.nom_par,
        r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '',
        r.espacio?.nom_esp,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return texto.includes(q);
    });
  }, [asistencias, busqueda]);

  return (
    <Layout>
      <PageHeader
        titulo="Mis tutorías"
        descripcion="Las tutorías a las que registraste asistencia, con el material que compartió el docente."
      />

      {!cargando && asistencias.length > 0 && (
        <div className="mt-6">
          <Input
            placeholder="Buscar por tema, curso, docente o aula…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full sm:w-80"
          />
        </div>
      )}

      <div className="mt-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={asistencias.length === 0}
          skeleton={<SkeletonCards count={4} />}
          mensajeVacio="Todavía no has registrado asistencia a ninguna tutoría."
        >
          {filtradas.length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Ninguna tutoría coincide con la búsqueda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtradas.map((a) => (
                <TarjetaTutoria key={a.id_asi} asistencia={a} onVerMateriales={() => setMaterialesDe(a.reserva)} />
              ))}
            </div>
          )}
        </DataState>
      </div>

      <ModalMateriales reserva={materialesDe} onCerrar={() => setMaterialesDe(null)} />
    </Layout>
  );
}

function TarjetaTutoria({ asistencia, onVerMateriales }) {
  const { reserva } = asistencia;
  const estado = estadoReserva(reserva);

  return (
    <Card padding="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-celeste/15 text-celeste-dark shrink-0">
            <IconoLibro />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg text-ink leading-tight truncate">{reserva.motivo || 'Tutoría'}</p>
            <p className="text-xs text-ink/50 truncate">
              {reserva.paralelo?.materia?.nom_mat || 'Sin curso'} ·{' '}
              {reserva.solicitante ? `${reserva.solicitante.nombres} ${reserva.solicitante.apellidos}` : 'Docente'}
            </p>
          </div>
        </div>
        <Badge className={`shrink-0 inline-flex items-center gap-1.5 ${ESTILO_ESTADO[estado]}`}>
          {estado === 'ACTIVA' && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
          {ETIQUETA_ESTADO[estado]}
        </Badge>
      </div>

      <div className="mt-3 pt-3 border-t border-line space-y-1.5 text-sm">
        <p className="text-ink/70 flex items-center gap-1.5">
          <IconoUbicacion />
          {reserva.espacio?.nom_esp || 'Espacio'}
        </p>
        <p className="text-ink/70 flex items-center gap-1.5">
          <IconoReloj />
          {formatearFechaLarga(reserva.fecha)} · {formatearRango(reserva.hor_ini, reserva.hor_fin)}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
        <p className="text-xs text-ink/40">
          Registraste asistencia a las {formatearHoraLocal(asistencia.hora_registro)}
        </p>
        <button
          type="button"
          onClick={onVerMateriales}
          className="shrink-0 text-sm text-azul font-medium hover:underline"
        >
          Ver materiales
        </button>
      </div>
    </Card>
  );
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

const ORIGEN_ARCHIVOS = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

function urlDescarga(doc) {
  return /^https?:\/\//.test(doc.url_archivo) ? doc.url_archivo : `${ORIGEN_ARCHIVOS}${doc.url_archivo}`;
}

function formatearTamano(bytes) {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Modal con los materiales de una tutoría puntual: se pide bajo demanda al
// abrirlo (el backend ya valida que el estudiante haya asistido).
function ModalMateriales({ reserva, onCerrar }) {
  const idReserva = reserva?.id_rev;
  const cargar = useCallback(
    () => (idReserva ? documentosApi.listarPorReserva(idReserva) : Promise.resolve([])),
    [idReserva]
  );
  const { data, cargando, error } = useApiResource(cargar, {
    auto: Boolean(idReserva),
    mensajeError: 'No se pudieron cargar los materiales.',
  });
  const documentos = data ?? [];

  return (
    <Modal
      abierto={Boolean(reserva)}
      onCerrar={onCerrar}
      titulo={reserva?.paralelo ? `Materiales · ${reserva.paralelo.materia?.nom_mat}` : 'Materiales de la tutoría'}
    >
      <DataState
        cargando={cargando}
        error={error}
        vacio={documentos.length === 0}
        mensajeVacio="El docente todavía no ha compartido material para esta tutoría."
      >
        <ul className="divide-y divide-line border border-line rounded-lg overflow-hidden">
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
            </li>
          ))}
        </ul>
      </DataState>
    </Modal>
  );
}

function IconoLibro() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6.5a2.5 2.5 0 0 0 0 5H19" />
      <path d="M8 7h8" />
    </svg>
  );
}
function IconoUbicacion() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 text-ink/40">
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function IconoReloj() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 text-ink/40">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
function IconoArchivo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function IconoEnlace() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}
function IconoDescargar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}