import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { asistenciasApi } from '../api/endpoints/asistencias';
import { ETIQUETA_ESTADO_RESERVA, ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { formatearRango, mismaFecha } from '../lib/formato';
import { Badge, Input, PageHeader, Table } from '../components/ui';

const HOY = new Date().toISOString().slice(0, 10);

const COLUMNAS = [
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'docente', titulo: 'Docente' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'asistentes', titulo: 'Asistentes' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

// Cuenta de asistentes de una reserva (una petición por fila).
function CeldaAsistentes({ idReserva }) {
  const cargar = useCallback(() => asistenciasApi.listarPorReserva(idReserva), [idReserva]);
  const { data, cargando, error } = useApiResource(cargar);
  if (cargando) return <span className="text-ink/40">…</span>;
  if (error) return <span className="text-ink/40">—</span>;
  return <span className="font-medium text-ink">{(data ?? []).length}</span>;
}

export default function ControlAcceso() {
  const [fecha, setFecha] = useState(HOY);

  const cargar = useCallback(() => reservasApi.listar(), []);
  const { data, cargando, error } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar el control de acceso.',
  });

  const reservas = (data ?? [])
    .filter((r) => mismaFecha(r.fecha, fecha))
    .filter((r) => r.estado !== 'CANCELADA');

  return (
    <Layout>
      <PageHeader
        titulo="Control de acceso"
        descripcion="Tutorías del día y asistencia registrada por código QR."
      />

      <div className="mt-6">
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-44"
        />
      </div>

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={reservas}
          cargando={cargando}
          error={error}
          mensajeVacio="No hay tutorías para esta fecha."
          renderFila={(r) => (
            <tr key={r.id_rev} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                {r.espacio?.nom_esp || '—'}
                {r.espacio?.tipo && (
                  <span className="text-ink/40">
                    {' '}
                    · {ETIQUETA_TIPO_ESPACIO[r.espacio.tipo] || r.espacio.tipo}
                  </span>
                )}
              </td>
              <td className="px-5 py-3">{formatearRango(r.hor_ini, r.hor_fin)}</td>
              <td className="px-5 py-3">
                {r.solicitante ? `${r.solicitante.nombres} ${r.solicitante.apellidos}` : '—'}
              </td>
              <td className="px-5 py-3">
                <Badge
                  className={
                    r.estado === 'CANCELADA' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                  }
                >
                  {ETIQUETA_ESTADO_RESERVA[r.estado] || r.estado}
                </Badge>
              </td>
              <td className="px-5 py-3">
                <CeldaAsistentes idReserva={r.id_rev} />
              </td>
              <td className="px-5 py-3 text-right">
                <Link
                  to={`/reservas/${r.id_rev}`}
                  className="text-sm text-azul font-medium hover:underline"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          )}
        />
      </div>
    </Layout>
  );
}
