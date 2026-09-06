import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { reservasApi } from '../api/endpoints/reservas';
import { ETIQUETA_TIPO_ESPACIO } from '../lib/constantes';
import { mensajeDeError } from '../lib/formato';
import { Alert, Badge, Button, Card, DataState, Input, Modal, PageHeader, SkeletonCards, Textarea } from '../components/ui';

const HOY = new Date().toISOString().slice(0, 10);

export default function Reservar() {
  const [fecha, setFecha] = useState(HOY);
  const [horaIni, setHoraIni] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [errorForm, setErrorForm] = useState(null);
  const [buscado, setBuscado] = useState(false);
  const [aReservar, setAReservar] = useState(null); // espacio seleccionado
  const [exito, setExito] = useState(null);

  const consultar = useCallback(
    () => disponibilidadApi.consultar({ fecha, horaIni, horaFin }),
    [fecha, horaIni, horaFin]
  );
  const { data, cargando, error, recargar } = useApiResource(consultar, {
    auto: false,
    mensajeError: 'No se pudo consultar la disponibilidad.',
  });

  function buscar(e) {
    e.preventDefault();
    setErrorForm(null);
    setExito(null);
    if (fecha < HOY) return setErrorForm('La fecha no puede ser anterior a hoy.');
    if (!horaIni || !horaFin) return setErrorForm('Indica la hora de inicio y de fin.');
    if (horaFin <= horaIni) return setErrorForm('La hora de fin debe ser posterior a la de inicio.');
    setBuscado(true);
    recargar();
  }

  const espacios = data?.espacios ?? [];

  return (
    <Layout>
      <PageHeader
        titulo="Reservar un espacio"
        descripcion="Elige la fecha y el horario; te mostramos las aulas libres en esa franja."
      />

      <form onSubmit={buscar} className="mt-6 flex flex-wrap items-end gap-3">
        <Input
          label="Fecha"
          type="date"
          min={HOY}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-44"
        />
        <Input
          label="Desde"
          type="time"
          value={horaIni}
          onChange={(e) => setHoraIni(e.target.value)}
          className="w-32"
        />
        <Input
          label="Hasta"
          type="time"
          value={horaFin}
          onChange={(e) => setHoraFin(e.target.value)}
          className="w-32"
        />
        <Button type="submit" cargando={cargando} textoCargando="Buscando…">
          Buscar aulas
        </Button>
      </form>

      {errorForm && (
        <div className="mt-4">
          <Alert>{errorForm}</Alert>
        </div>
      )}
      {exito && (
        <div className="mt-4">
          <Alert variant="success">
            {exito}{' '}
            <Link to="/reservas" className="font-semibold underline">
              Ver mis reservas
            </Link>
          </Alert>
        </div>
      )}

      {buscado && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataState
            cargando={cargando}
            error={error}
            vacio={espacios.length === 0}
            skeleton={<SkeletonCards count={6} />}
            mensajeVacio="No hay aulas para esa fecha."
          >
            {espacios.map((esp) => (
              <Card key={esp.id_esp} className={esp.libre ? '' : 'opacity-70'}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                      {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                    </span>
                    <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
                    <p className="text-sm text-ink/50">Capacidad {esp.capacidad}</p>
                  </div>
                  <Badge className={esp.libre ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}>
                    {esp.libre ? 'Libre' : 'Ocupada'}
                  </Badge>
                </div>

                {esp.ocupaciones.length > 0 && (
                  <ul className="mt-3 pt-3 border-t border-line space-y-1">
                    {esp.ocupaciones.map((o, i) => (
                      <li key={`${esp.id_esp}-${i}`} className="text-sm text-ink/60">
                        {o.hora_ini}–{o.hora_fin} · {o.tipo === 'CLASE' ? 'Clase' : 'Reserva'}: {o.etiqueta}
                      </li>
                    ))}
                  </ul>
                )}

                {esp.libre && (
                  <Button size="sm" className="mt-4" onClick={() => setAReservar(esp)}>
                    Reservar esta aula
                  </Button>
                )}
              </Card>
            ))}
          </DataState>
        </div>
      )}

      <Modal
        abierto={Boolean(aReservar)}
        onCerrar={() => setAReservar(null)}
        titulo={aReservar ? `Reservar ${aReservar.nom_esp}` : ''}
      >
        {aReservar && (
          <ConfirmarReserva
            espacio={aReservar}
            fecha={fecha}
            horaIni={horaIni}
            horaFin={horaFin}
            onCancelar={() => setAReservar(null)}
            onListo={(msg) => {
              setAReservar(null);
              setExito(msg);
              recargar();
            }}
          />
        )}
      </Modal>
    </Layout>
  );
}

function ConfirmarReserva({ espacio, fecha, horaIni, horaFin, onCancelar, onListo }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function confirmar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await reservasApi.crear({
        id_esp: espacio.id_esp,
        fecha,
        hor_ini: horaIni,
        hor_fin: horaFin,
        motivo,
      });
      onListo(`Reserva confirmada: ${espacio.nom_esp}, ${fecha} de ${horaIni} a ${horaFin}.`);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la reserva.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <p className="text-sm text-ink/70">
        {fecha} · {horaIni} – {horaFin}
      </p>
      <Textarea
        label="Tema de la tutoría"
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Tutoría de Programación, paralelo A"
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Confirmando…">
          Confirmar reserva
        </Button>
      </div>
    </form>
  );
}
