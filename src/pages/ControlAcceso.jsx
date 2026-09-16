import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { asistenciasApi } from '../api/endpoints/asistencias';
import { formatearFecha, formatearFechaLarga, formatearRango, horaEnMinutos, mensajeDeError } from '../lib/formato';
import { Badge, Card, CodigoQR, ConfirmDialog, Input, Modal, PageHeader, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'tema', titulo: 'Tema' },
  { clave: 'asistentes', titulo: 'Asistentes' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

const PESTANAS = [
  { clave: 'proximas', etiqueta: 'Próximas' },
  { clave: 'anteriores', etiqueta: 'Anteriores' },
  { clave: 'canceladas', etiqueta: 'Canceladas' },
];

const ETIQUETA_ESTADO = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  CONCLUIDA: 'Concluida',
  CANCELADA: 'Cancelada',
};
const ESTILO_ESTADO = {
  PENDIENTE: 'bg-celeste/10 text-celeste-dark',
  ACTIVA: 'bg-success/10 text-success',
  CONCLUIDA: 'bg-ink/10 text-ink/50',
  CANCELADA: 'bg-danger/10 text-danger',
};

// Combina la fecha (medianoche UTC) con una hora "HH:MM"/ISO (hora-del-día en UTC)
// en el instante real que representan, para poder compararlo con "ahora".
function instanteDe(fecha, horaTxt) {
  return new Date(new Date(fecha).getTime() + horaEnMinutos(horaTxt) * 60000);
}

// Estado real de la tutoría en este momento (no solo RESERVADA/CANCELADA de la BD).
function estadoDe(reserva) {
  if (reserva.estado === 'CANCELADA') return 'CANCELADA';
  const ahora = new Date();
  const inicio = instanteDe(reserva.fecha, reserva.hor_ini);
  const fin = instanteDe(reserva.fecha, reserva.hor_fin);
  if (ahora < inicio) return 'PENDIENTE';
  if (ahora <= fin) return 'ACTIVA';
  return 'CONCLUIDA';
}

// El botón de asistencia (QR) solo aparece hasta 5 minutos después de iniciada la tutoría.
function puedeRegistrarAsistencia(reserva) {
  if (reserva.estado === 'CANCELADA') return false;
  const limite = instanteDe(reserva.fecha, reserva.hor_ini).getTime() + 5 * 60000;
  return Date.now() <= limite;
}

export default function ControlAcceso() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const esDocente = usuario?.rol === 'DOCENTE';
  const puedeCancelarCualquiera = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'LABORATORISTA';

  const [pestana, setPestana] = useState('proximas');
  const [busqueda, setBusqueda] = useState('');
  const [aCancelar, setACancelar] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [verQR, setVerQR] = useState(null);

  const cargar = useCallback(() => reservasApi.listar({ mias: esDocente }), [esDocente]);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar el listado.',
  });

  const reservas = useMemo(() => (data ?? []).map((r) => ({ ...r, _estado: estadoDe(r) })), [data]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reservas
      .filter((r) => {
        if (pestana === 'canceladas') return r._estado === 'CANCELADA';
        if (pestana === 'anteriores') return r._estado === 'CONCLUIDA';
        return r._estado === 'PENDIENTE' || r._estado === 'ACTIVA';
      })
      .filter((r) => {
        if (!q) return true;
        const espacio = (r.espacio?.nom_esp || '').toLowerCase();
        const tema = (r.motivo || '').toLowerCase();
        return espacio.includes(q) || tema.includes(q);
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hor_ini.localeCompare(b.hor_ini));
  }, [reservas, pestana, busqueda]);

  async function confirmarCancelacion(razon) {
    if (!aCancelar) return;
    setCancelandoId(aCancelar.id_rev);
    try {
      await reservasApi.cancelar(aCancelar.id_rev, razon);
      await recargar();
      mostrarToast('Reserva cancelada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cancelar la reserva.'), 'error');
    } finally {
      setCancelandoId(null);
      setACancelar(null);
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Control de acceso"
        descripcion={
          esDocente
            ? 'Tus tutorías y su estado. Registra asistencia con el código QR.'
            : 'Tutorías registradas y su estado. Control de asistencia por código QR.'
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              type="button"
              onClick={() => setPestana(p.clave)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pestana === p.clave ? 'bg-azul text-white' : 'text-ink/60 hover:bg-paper'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar por aula o tema…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={filtradas}
          cargando={cargando}
          error={error}
          mensajeVacio="No hay tutorías en esta vista."
          renderFila={(r) => (
            <FilaReserva
              key={r.id_rev}
              reserva={r}
              usuario={usuario}
              puedeCancelarCualquiera={puedeCancelarCualquiera}
              cancelando={cancelandoId === r.id_rev}
              onAbrir={() => navigate(`/reservas/${r.id_rev}`)}
              onCancelar={() => setACancelar(r)}
              onVerQR={() => setVerQR(r)}
            />
          )}
        />
      </div>

      <ConfirmDialog
        abierto={Boolean(aCancelar)}
        titulo="Cancelar reserva"
        mensaje="¿Cancelar esta reserva? El aula quedará libre en esa franja."
        textoConfirmar="Cancelar reserva"
        textoCargando="Cancelando…"
        pedirRazon
        labelRazon="Motivo de la cancelación"
        placeholderRazon="Ej: el docente no podrá asistir a esta tutoría"
        cargando={Boolean(cancelandoId)}
        onConfirmar={confirmarCancelacion}
        onCancelar={() => setACancelar(null)}
      />

      <ModalQR reserva={verQR} onCerrar={() => setVerQR(null)} />
    </Layout>
  );
}

function FilaReserva({ reserva, usuario, puedeCancelarCualquiera, cancelando, onAbrir, onCancelar, onVerQR }) {
  const estado = reserva._estado;
  const esDueno = reserva.solicitante?.id_usr === usuario?.id;
  const puedeCancelar = (estado === 'PENDIENTE' || estado === 'ACTIVA') && (esDueno || puedeCancelarCualquiera);
  const mostrarQR = puedeRegistrarAsistencia(reserva);

  return (
    <tr onClick={onAbrir} className="border-b border-line last:border-0 cursor-pointer hover:bg-paper/60">
      <td className="px-5 py-3">{reserva.espacio?.nom_esp || '—'}</td>
      <td className="px-5 py-3">{formatearFecha(reserva.fecha)}</td>
      <td className="px-5 py-3">{formatearRango(reserva.hor_ini, reserva.hor_fin)}</td>
      <td className="px-5 py-3 text-ink/70">{reserva.motivo || '—'}</td>
      <td className="px-5 py-3">
        <CeldaAsistentes idReserva={reserva.id_rev} />
      </td>
      <td className="px-5 py-3">
        <Badge className={ESTILO_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>
      </td>
      <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {mostrarQR && (
          <button
            type="button"
            onClick={onVerQR}
            title="Registro de asistencia"
            aria-label="Registro de asistencia"
            className="text-ink/40 hover:text-azul transition-colors"
          >
            <IconoQR />
          </button>
        )}
        {puedeCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={cancelando}
            title="Cancelar reserva"
            aria-label="Cancelar reserva"
            className="ml-3 text-ink/40 hover:text-danger transition-colors disabled:opacity-50"
          >
            <IconoCancelar />
          </button>
        )}
      </td>
    </tr>
  );
}

function ModalQR({ reserva, onCerrar }) {
  if (!reserva) return <Modal abierto={false} onCerrar={onCerrar} titulo="" />;
  const estado = reserva._estado;

  return (
    <Modal abierto={Boolean(reserva)} onCerrar={onCerrar} titulo="QR para tutoría" ancho="max-w-sm">
      <Card padding="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg text-ink truncate">{reserva.motivo || reserva.espacio?.nom_esp}</p>
            <p className="text-sm text-ink/60 mt-1">{reserva.espacio?.nom_esp}</p>
            <p className="text-sm text-ink/60">{formatearFechaLarga(reserva.fecha)}</p>
            <p className="text-sm text-ink/60">{formatearRango(reserva.hor_ini, reserva.hor_fin)}</p>
          </div>
          <Badge className={ESTILO_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>
        </div>

        <div className="flex justify-center mt-4">
          <CodigoQR valor={reserva.qr_token} tamano={170} />
        </div>
      </Card>

      <p className="text-xs text-ink/50 mt-3">
        El código QR estará disponible hasta 5 minutos después de iniciada la tutoría.
      </p>
    </Modal>
  );
}

// Cuenta de asistentes de una reserva (una petición por fila).
function CeldaAsistentes({ idReserva }) {
  const cargar = useCallback(() => asistenciasApi.listarPorReserva(idReserva), [idReserva]);
  const { data, cargando, error } = useApiResource(cargar);
  if (cargando) return <span className="text-ink/40">…</span>;
  if (error) return <span className="text-ink/40">—</span>;
  return <span className="font-medium text-ink">{(data ?? []).length}</span>;
}

function IconoQR() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2v2h-2z" />
    </svg>
  );
}

function IconoCancelar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}
