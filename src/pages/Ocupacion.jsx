import { useCallback, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { reservasApi } from '../api/endpoints/reservas';
import { useToast } from '../context/ToastContext';
import { ETIQUETA_DIA, ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { Badge, Card, ConfirmDialog, DataState, Input, PageHeader, SkeletonCards } from '../components/ui';

function fechaLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Ocupacion() {
  const [fecha, setFecha] = useState(fechaLocalISO);
  const [aCancelar, setACancelar] = useState(null); // null | id_rev
  const [cancelando, setCancelando] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(() => disponibilidadApi.consultar({ fecha }), [fecha]);
  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar la ocupación.',
  });

  async function confirmarCancelacion(razon) {
    if (!aCancelar) return;
    setCancelando(true);
    try {
      await reservasApi.cancelar(aCancelar, razon);
      await recargar();
      mostrarToast('Reserva cancelada.', 'exito');
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cancelar la reserva.'), 'error');
    } finally {
      setCancelando(false);
      setACancelar(null);
    }
  }

  const espacios = data?.espacios ?? [];

  return (
    <Layout>
      <PageHeader
        titulo="Ocupación de aulas"
        descripcion="Qué aulas están en clase, reservadas o libres en la fecha elegida."
      />

      <div className="mt-6 flex items-end gap-3">
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-44"
        />
        {data && (
          <p className="text-sm text-ink/50 pb-2">{ETIQUETA_DIA[data.dia_semana] || data.dia_semana}</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={espacios.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="No hay aulas registradas."
        >
          {espacios.map((esp) => (
            <Card key={esp.id_esp}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                    {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                  </span>
                  <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
                </div>
                <Badge
                  className={
                    esp.ocupaciones.length === 0
                      ? 'bg-success/10 text-success'
                      : 'bg-celeste/10 text-celeste-dark'
                  }
                >
                  {esp.ocupaciones.length === 0 ? 'Libre todo el día' : `${esp.ocupaciones.length} bloque(s)`}
                </Badge>
              </div>

              {esp.ocupaciones.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-line space-y-1.5">
                  {esp.ocupaciones.map((o, i) => (
                    <li key={`${esp.id_esp}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="text-ink/70">
                          {o.hora_ini}–{o.hora_fin}
                        </span>{' '}
                        <span
                          className={
                            o.tipo === 'CLASE' ? 'text-celeste-dark font-medium' : 'text-azul-dark font-medium'
                          }
                        >
                          {o.tipo === 'CLASE' ? 'Clase' : 'Reserva'}
                        </span>{' '}
                        <span className="text-ink/50">· {o.etiqueta}</span>
                      </span>
                      {o.tipo === 'RESERVA' && (
                        <button
                          type="button"
                          onClick={() => setACancelar(o.id_rev)}
                          title="Cancelar reserva"
                          aria-label="Cancelar reserva"
                          className="shrink-0 text-ink/30 hover:text-danger transition-colors"
                        >
                          <IconoCancelar />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </DataState>
      </div>

      <ConfirmDialog
        abierto={Boolean(aCancelar)}
        titulo="Cancelar reserva"
        mensaje="¿Cancelar esta reserva? El aula quedará libre en esa franja."
        textoConfirmar="Cancelar reserva"
        textoCargando="Cancelando…"
        pedirRazon
        labelRazon="Motivo de la cancelación"
        placeholderRazon="Ej: mantenimiento urgente del aula"
        cargando={cancelando}
        onConfirmar={confirmarCancelacion}
        onCancelar={() => setACancelar(null)}
      />
    </Layout>
  );
}

function IconoCancelar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}
