import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApiResource } from '../../hooks/useApiResource';
import { disponibilidadApi } from '../../api/endpoints/disponibilidad';
import { reservasApi } from '../../api/endpoints/reservas';
import { cursosApi } from '../../api/endpoints/cursos';
import { ETIQUETA_BLOQUE, ETIQUETA_TIPO_ESPACIO, OPCIONES_BLOQUE, OPCIONES_TIPO_ESPACIO } from '../../lib/constantes';
import { formatearFechaConDia, mensajeDeError } from '../../lib/formato';
import { Alert, Badge, Button, Card, DataState, Input, Modal, Select, SkeletonCards, Textarea } from '../ui';

const HOY = new Date().toISOString().slice(0, 10);

/**
 * Modal de búsqueda y reserva de espacios (fecha/horario -> aulas libres -> confirmar).
 * Reemplaza la antigua página /reservar: se abre desde "Mis reservas".
 */
export default function ModalNuevaReserva({ abierto, onCerrar, onCreada }) {
  const [fecha, setFecha] = useState(HOY);
  const [horaIni, setHoraIni] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [errorForm, setErrorForm] = useState(null);
  const [buscado, setBuscado] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroBloque, setFiltroBloque] = useState('');
  const [seleccionado, setSeleccionado] = useState(null); // espacio elegido para reservar

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
    setSeleccionado(null);
    if (fecha < HOY) return setErrorForm('La fecha no puede ser anterior a hoy.');
    if (!horaIni || !horaFin) return setErrorForm('Indica la hora de inicio y de fin.');
    if (horaFin <= horaIni) return setErrorForm('La hora de fin debe ser posterior a la de inicio.');
    setBuscado(true);
    recargar();
  }

  const espacios = data?.espacios ?? [];
  const espaciosFiltrados = useMemo(
    () =>
      espacios.filter(
        (esp) => (!filtroTipo || esp.tipo === filtroTipo) && (!filtroBloque || esp.bloque === filtroBloque)
      ),
    [espacios, filtroTipo, filtroBloque]
  );

  function cerrarTodo() {
    setFecha(HOY);
    setHoraIni('');
    setHoraFin('');
    setBuscado(false);
    setFiltroTipo('');
    setFiltroBloque('');
    setSeleccionado(null);
    onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={cerrarTodo} titulo="Reservar un espacio" ancho="max-w-4xl">
      {seleccionado ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-paper px-4 py-3 text-sm text-ink/70">
          <span>
            <span className="font-medium text-ink">{formatearFechaConDia(fecha)}</span> · {horaIni} – {horaFin}
          </span>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink/60 -mt-2 mb-4">
            Elige la fecha y el horario; te mostramos las aulas libres en esa franja.
          </p>

          <form onSubmit={buscar} className="flex flex-wrap items-end gap-4">
            <Input
              label="Fecha"
              type="date"
              min={HOY}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-40"
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
        </>
      )}

      {errorForm && (
        <div className="mt-4">
          <Alert>{errorForm}</Alert>
        </div>
      )}

      {buscado && !seleccionado && (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-4 pt-4 border-t border-line">
            <Select
              label="Filtrar por tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-48"
            >
              <option value="">Todos</option>
              {OPCIONES_TIPO_ESPACIO.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Select>
            <Select
              label="Filtrar por bloque"
              value={filtroBloque}
              onChange={(e) => setFiltroBloque(e.target.value)}
              className="w-48"
            >
              <option value="">Todos</option>
              {OPCIONES_BLOQUE.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DataState
              cargando={cargando}
              error={error}
              vacio={espaciosFiltrados.length === 0}
              skeleton={<SkeletonCards count={4} />}
              mensajeVacio="No hay aulas que coincidan con los filtros."
            >
              {espaciosFiltrados.map((esp) => (
                <Card key={esp.id_esp} className={esp.libre ? '' : 'opacity-70'}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
                        {ETIQUETA_TIPO_ESPACIO[esp.tipo] || esp.tipo}
                      </span>
                      <p className="font-display text-lg text-ink mt-1">{esp.nom_esp}</p>
                      <p className="text-sm text-ink/50">
                        {ETIQUETA_BLOQUE[esp.bloque] || esp.bloque} · Piso {esp.piso} · Capacidad {esp.capacidad}
                      </p>
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
                    <Button size="sm" className="mt-4" onClick={() => setSeleccionado(esp)}>
                      Reservar esta aula
                    </Button>
                  )}
                </Card>
              ))}
            </DataState>
          </div>
        </>
      )}

      {seleccionado && (
        <div className="mt-5 pt-4 border-t border-line">
          <Card padding="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {seleccionado.nom_esp}
                  <span className="text-ink/40 font-normal">
                    {' '}
                    · {ETIQUETA_TIPO_ESPACIO[seleccionado.tipo] || seleccionado.tipo}
                  </span>
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {ETIQUETA_BLOQUE[seleccionado.bloque] || seleccionado.bloque} · Piso {seleccionado.piso} ·
                  Capacidad {seleccionado.capacidad}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-success/10 text-success">Libre</Badge>
                <button
                  type="button"
                  onClick={() => setSeleccionado(null)}
                  title="Cambiar espacio"
                  aria-label="Cambiar espacio"
                  className="text-ink/40 hover:text-azul transition-colors"
                >
                  <IconoCambiar />
                </button>
              </div>
            </div>
          </Card>

          <FormularioConfirmar
            espacio={seleccionado}
            fecha={fecha}
            horaIni={horaIni}
            horaFin={horaFin}
            onCancelar={() => setSeleccionado(null)}
            onListo={(msg) => {
              cerrarTodo();
              onCreada(msg);
            }}
          />
        </div>
      )}
    </Modal>
  );
}

function IconoCambiar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function FormularioConfirmar({ espacio, fecha, horaIni, horaFin, onCancelar, onListo }) {
  const { usuario } = useAuth();
  const [motivo, setMotivo] = useState('');
  const [idCurso, setIdCurso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cargarCursos = useCallback(() => cursosApi.listar(), []);
  const { data: cursos } = useApiResource(cargarCursos, {
    mensajeError: 'No se pudieron cargar tus cursos.',
  });
  const misCursos = (cursos ?? []).filter((c) => c.id_doc === usuario?.id);

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
        id_cur: idCurso || undefined,
      });
      onListo(`Reserva confirmada: ${espacio.nom_esp}, ${fecha} de ${horaIni} a ${horaFin}.`);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la reserva.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={confirmar} className="mt-4 space-y-4">
      <Textarea
        label="Tema de la tutoría"
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Tutoría de Programación, paralelo A"
      />

      {misCursos.length > 0 && (
        <Select
          label="Curso (opcional)"
          hint="Si la eliges, solo los estudiantes matriculados en ese curso verán esta tutoría."
          value={idCurso}
          onChange={(e) => setIdCurso(e.target.value)}
        >
          <option value="">Sin curso específico</option>
          {misCursos.map((c) => (
            <option key={c.id_cur} value={c.id_cur}>
              {c.nom_cur}
            </option>
          ))}
        </Select>
      )}

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
