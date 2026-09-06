import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { reservasApi } from '../api/endpoints/reservas';
import { asistenciasApi } from '../api/endpoints/asistencias';
import { documentosApi } from '../api/endpoints/documentos';
import { ETIQUETA_ESTADO_RESERVA, ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { PUEDE_COMPARTIR_DOCUMENTO, PUEDE_VER_ASISTENCIA, puede } from '../lib/permisos';
import { formatearFecha, formatearHora, formatearRango, mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, Card, DataState, Input, Table } from '../components/ui';

const COLUMNAS_ASISTENCIA = [
  { clave: 'estudiante', titulo: 'Estudiante' },
  { clave: 'cedula', titulo: 'Cédula' },
  { clave: 'hora', titulo: 'Hora de registro' },
];

export default function DetalleReserva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [errorAccion, setErrorAccion] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const cargarReserva = useCallback(() => reservasApi.obtener(id), [id]);
  const {
    data: reserva,
    cargando,
    error,
    recargar,
  } = useApiResource(cargarReserva, { mensajeError: 'No se pudo cargar la reserva.' });

  const puedeVerAsistencia = puede(PUEDE_VER_ASISTENCIA, usuario?.rol);
  const puedeCompartir = puede(PUEDE_COMPARTIR_DOCUMENTO, usuario?.rol);
  const esDueno = reserva && reserva.solicitante?.id_usr === usuario?.id;
  const puedeCancelar =
    reserva && reserva.estado === 'RESERVADA' && (esDueno || usuario?.rol === 'ADMINISTRADOR');

  async function cancelar() {
    if (!window.confirm('¿Cancelar esta reserva? El aula quedará libre en esa franja.')) return;
    setCancelando(true);
    setErrorAccion(null);
    try {
      await reservasApi.cancelar(id);
      await recargar();
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo cancelar la reserva.'));
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-azul font-medium hover:underline"
      >
        ← Volver
      </button>

      <div className="mt-3">
        <DataState cargando={cargando} error={error} vacio={!reserva} mensajeVacio="No se encontró la reserva.">
          {reserva && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl text-ink">{reserva.espacio?.nom_esp || 'Reserva'}</h1>
                  <p className="text-ink/60 mt-1">
                    {ETIQUETA_TIPO_ESPACIO[reserva.espacio?.tipo] || reserva.espacio?.tipo || 'Espacio'} ·
                    Reserva #{reserva.id_rev}
                  </p>
                </div>
                <Badge
                  className={
                    reserva.estado === 'CANCELADA'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-success/10 text-success'
                  }
                >
                  {ETIQUETA_ESTADO_RESERVA[reserva.estado] || reserva.estado}
                </Badge>
              </div>

              {errorAccion && (
                <div className="mt-4">
                  <Alert>{errorAccion}</Alert>
                </div>
              )}

              <Card padding="p-6" className="mt-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Dato titulo="Fecha" valor={formatearFecha(reserva.fecha)} />
                  <Dato titulo="Horario" valor={formatearRango(reserva.hor_ini, reserva.hor_fin)} />
                  <Dato
                    titulo="Docente"
                    valor={
                      reserva.solicitante
                        ? `${reserva.solicitante.nombres} ${reserva.solicitante.apellidos}`
                        : '—'
                    }
                  />
                  <Dato titulo="Tema" valor={reserva.motivo || 'Sin especificar'} />
                </dl>

                {puedeCancelar && (
                  <div className="mt-5 pt-5 border-t border-line">
                    <Button variant="danger" size="sm" onClick={cancelar} cargando={cancelando} textoCargando="Cancelando…">
                      Cancelar reserva
                    </Button>
                  </div>
                )}
              </Card>

              {puedeVerAsistencia && <SeccionAsistencia idReserva={id} />}

              <SeccionDocumentos idReserva={id} puedeCompartir={puedeCompartir} />
            </>
          )}
        </DataState>
      </div>
    </Layout>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink/50">{titulo}</dt>
      <dd className="text-ink mt-1">{valor}</dd>
    </div>
  );
}

function SeccionAsistencia({ idReserva }) {
  const cargar = useCallback(() => asistenciasApi.listarPorReserva(idReserva), [idReserva]);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar la asistencia.',
  });
  const asistencias = data ?? [];

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">Asistencia registrada</h2>
        {!cargando && !error && <span className="text-sm text-ink/50">{asistencias.length} estudiante(s)</span>}
      </div>
      <p className="text-sm text-ink/50 mt-1 mb-3">
        Registros generados por el escaneo del código QR desde la app móvil.
      </p>
      <Table
        columnas={COLUMNAS_ASISTENCIA}
        datos={asistencias}
        cargando={cargando}
        error={error}
        mensajeVacio="Todavía no hay asistencia registrada para esta tutoría."
        renderFila={(a) => (
          <tr key={a.id_asi} className="border-b border-line last:border-0">
            <td className="px-5 py-3">
              {a.estudiante ? `${a.estudiante.nombres} ${a.estudiante.apellidos}` : `Estudiante #${a.id_est}`}
            </td>
            <td className="px-5 py-3">{a.estudiante?.cedula || '—'}</td>
            <td className="px-5 py-3">{formatearHora(a.hora_registro)}</td>
          </tr>
        )}
      />
    </section>
  );
}

function SeccionDocumentos({ idReserva, puedeCompartir }) {
  const cargar = useCallback(() => documentosApi.listarPorReserva(idReserva), [idReserva]);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudieron cargar los documentos.',
  });
  const documentos = data ?? [];

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink">Documentos de la tutoría</h2>
      <p className="text-sm text-ink/50 mt-1 mb-3">
        Material que el docente comparte. En la app móvil solo lo ven los estudiantes que registraron asistencia.
      </p>

      {puedeCompartir && <FormularioDocumento idReserva={idReserva} onCompartido={recargar} />}

      <div className="mt-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={documentos.length === 0}
          textoCargando="Cargando documentos…"
          mensajeVacio="Aún no se ha compartido material."
        >
          <ul className="border border-line bg-white rounded-lg divide-y divide-line">
            {documentos.map((doc) => (
              <li key={doc.id_docu} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-ink">{doc.nom_archivo}</span>
                <a
                  href={doc.url_archivo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Abrir
                </a>
              </li>
            ))}
          </ul>
        </DataState>
      </div>
    </section>
  );
}

function FormularioDocumento({ idReserva, onCompartido }) {
  const { valores, handleChange, reset } = useForm({ nom_archivo: '', url_archivo: '' });
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
      reset();
      onCompartido();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo compartir el documento.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="border border-line bg-white rounded-lg p-5 grid grid-cols-2 gap-4">
      <Input
        label="Nombre del archivo"
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
      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="col-span-2 flex justify-end">
        <Button type="submit" cargando={enviando} textoCargando="Compartiendo…">
          Compartir documento
        </Button>
      </div>
    </form>
  );
}
