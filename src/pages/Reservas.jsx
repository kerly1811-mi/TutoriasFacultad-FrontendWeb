import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ModalNuevaReserva from '../components/reservas/ModalNuevaReserva';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { reservasApi } from '../api/endpoints/reservas';
import { ETIQUETA_ESTADO_RESERVA } from '../lib/constantes';
import { formatearFecha, formatearRango, mensajeDeError } from '../lib/formato';
import { Badge, Button, ConfirmDialog, PageHeader, Table } from '../components/ui';

const COLUMNAS = [
  { clave: 'espacio', titulo: 'Espacio' },
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'horario', titulo: 'Horario' },
  { clave: 'tema', titulo: 'Tema' },
  { clave: 'estado', titulo: 'Estado' },
  { clave: 'acciones', titulo: '', className: 'text-right' },
];

export default function Reservas() {
  const { usuario } = useAuth();
  const { mostrarToast } = useToast();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const [cancelandoId, setCancelandoId] = useState(null);
  const [aCancelar, setACancelar] = useState(null); // reserva pendiente de confirmar cancelación
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargar = useCallback(() => reservasApi.listar({ mias: !esAdmin }), [esAdmin]);
  const {
    data,
    cargando,
    error: errorCarga,
    recargar,
  } = useApiResource(cargar, { mensajeError: 'No se pudieron cargar las reservas.' });

  const reservas = data ?? [];

  async function confirmarCancelacion() {
    if (!aCancelar) return;
    const id = aCancelar.id_rev;
    setCancelandoId(id);
    try {
      await reservasApi.cancelar(id);
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
        titulo={esAdmin ? 'Reservas' : 'Mis reservas'}
        descripcion={esAdmin ? 'Todas las reservas registradas.' : 'Espacios que has reservado para tus tutorías.'}
      >
        {!esAdmin && <Button onClick={() => setModalAbierto(true)}>Nueva reserva</Button>}
      </PageHeader>

      <div className="mt-6">
        <Table
          columnas={COLUMNAS}
          datos={reservas}
          cargando={cargando}
          error={errorCarga}
          mensajeVacio={esAdmin ? 'No hay reservas.' : 'Todavía no has hecho ninguna reserva.'}
          renderFila={(r) => (
            <tr key={r.id_rev} className="border-b border-line last:border-0">
              <td className="px-5 py-3">{r.espacio?.nom_esp || '—'}</td>
              <td className="px-5 py-3">{formatearFecha(r.fecha)}</td>
              <td className="px-5 py-3">{formatearRango(r.hor_ini, r.hor_fin)}</td>
              <td className="px-5 py-3 text-ink/70">{r.motivo || '—'}</td>
              <td className="px-5 py-3">
                <Badge className={r.estado === 'CANCELADA' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}>
                  {ETIQUETA_ESTADO_RESERVA[r.estado] || r.estado}
                </Badge>
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <Link to={`/reservas/${r.id_rev}`} className="text-sm text-azul font-medium hover:underline">
                  Ver
                </Link>
                {r.estado === 'RESERVADA' && (
                  <button
                    onClick={() => setACancelar(r)}
                    disabled={cancelandoId === r.id_rev}
                    className="ml-4 text-sm text-danger font-medium hover:underline disabled:opacity-50"
                  >
                    {cancelandoId === r.id_rev ? 'Cancelando…' : 'Cancelar'}
                  </button>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      {!esAdmin && (
        <ModalNuevaReserva
          abierto={modalAbierto}
          onCerrar={() => setModalAbierto(false)}
          onCreada={(msg) => {
            mostrarToast(msg, 'exito');
            recargar();
          }}
        />
      )}

      <ConfirmDialog
        abierto={Boolean(aCancelar)}
        titulo="Cancelar reserva"
        mensaje="¿Cancelar esta reserva? El aula quedará libre en esa franja."
        textoConfirmar="Cancelar reserva"
        textoCargando="Cancelando…"
        cargando={Boolean(cancelandoId)}
        onConfirmar={confirmarCancelacion}
        onCancelar={() => setACancelar(null)}
      />
    </Layout>
  );
}
