import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApiResource } from '../hooks/useApiResource';
import { disponibilidadApi } from '../api/endpoints/disponibilidad';
import { reservasApi } from '../api/endpoints/reservas';
import { paralelosApi } from '../api/endpoints/paralelos';
import { ETIQUETA_BLOQUE, ETIQUETA_TIPO_ESPACIO, OPCIONES_BLOQUE, OPCIONES_TIPO_ESPACIO } from '../lib/constantes';
import { fechaISO, horaEnMinutos, horaEnRango, mensajeDeError } from '../lib/formato';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataState,
  Input,
  Modal,
  PageHeader,
  Select,
  SelectorHora,
  SkeletonCards,
  Textarea,
} from '../components/ui';

const HORA_MIN = 7;
const HORA_MAX = 20;

// "Hoy" en fecha LOCAL (nunca toISOString: en Ecuador, UTC-5, eso adelanta la
// fecha después de las ~19:00 hora local).
function hoyISO() {
  return fechaISO(new Date());
}
// Fecha con la que arranca el buscador: hoy, salvo que ya sean las 8 p. m. o más
// (fuera del horario reservable) -> directo al día siguiente.
function fechaInicial() {
  const d = new Date();
  if (d.getHours() >= HORA_MAX) {
    const manana = new Date(d);
    manana.setDate(manana.getDate() + 1);
    return fechaISO(manana);
  }
  return fechaISO(d);
}
// Hora actual, acotada a [HORA_MIN, HORA_MAX). Si ya pasó el horario de hoy (o
// todavía no abre), arranca en HORA_MIN -- se usa junto con `fechaInicial()`.
function horaActualHHMM() {
  const d = new Date();
  const h = d.getHours();
  if (h < HORA_MIN || h >= HORA_MAX) return `${String(HORA_MIN).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
// Siguiente hora en punto tras la actual, acotada a [HORA_MIN, HORA_MAX] -- valor
// inicial de "Hasta": si ya es la hora en punto, avanza a la siguiente igual.
function horaFinInicial() {
  const d = new Date();
  const h = d.getHours();
  const siguiente = h < HORA_MIN ? HORA_MIN + 1 : h + 1;
  if (siguiente >= HORA_MAX) return `${String(HORA_MAX).padStart(2, '0')}:00`;
  return `${String(siguiente).padStart(2, '0')}:00`;
}
function minAHora(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Hueco libre continuo de un espacio a partir de `horaIni`: hasta la siguiente
// clase/reserva, o hasta `horaFinBusqueda` si no hay nada más en ese rango.
function calcularHueco(espacio, horaIni, horaFinBusqueda) {
  const inicioMin = horaEnMinutos(horaIni);
  const limiteMin = horaEnMinutos(horaFinBusqueda);
  const ocupaciones = [...(espacio.ocupaciones || [])].sort(
    (a, b) => horaEnMinutos(a.hora_ini) - horaEnMinutos(b.hora_ini)
  );
  const choca = ocupaciones.some(
    (o) => inicioMin >= horaEnMinutos(o.hora_ini) && inicioMin < horaEnMinutos(o.hora_fin)
  );
  if (choca || inicioMin >= limiteMin) return null;
  const siguiente = ocupaciones.find((o) => horaEnMinutos(o.hora_ini) > inicioMin);
  const finMin = Math.min(siguiente ? horaEnMinutos(siguiente.hora_ini) : limiteMin, limiteMin);
  return { inicioMin, finMin };
}

/**
 * Página de reserva para el docente: filtros siempre visibles arriba, y debajo los
 * espacios disponibles en ese momento para reservar al instante. Al elegir horario
 * se abre un modal con el resumen, el tema y el curso.
 */
export default function ReservarEspacio() {
  const { usuario } = useAuth();
  const { mostrarToast } = useToast();
  const location = useLocation();
  const HOY = hoyISO();

  // Si venimos de aceptar una solicitud de un estudiante, sus datos llegan en
  // location.state.prefill y precargan el buscador: el docente solo elige aula.
  const prefill = location.state?.prefill;

  const [fecha, setFecha] = useState(() => prefill?.fecha || fechaInicial());
  const [horaIni, setHoraIni] = useState(() => prefill?.horaIni || horaActualHHMM());
  const [horaFin, setHoraFin] = useState(() => prefill?.horaFin || horaFinInicial());
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroBloque, setFiltroBloque] = useState('');
  const [seleccionado, setSeleccionado] = useState(null); // espacio elegido para reservar
  const horaTocada = useRef(Boolean(prefill)); // true en cuanto el usuario edita "Desde" a mano

  function cambiarHoraIni(v) {
    horaTocada.current = true;
    setHoraIni(v);
  }

  // Mientras el usuario no haya tocado "Desde" y la fecha elegida sea hoy, la hora
  // de inicio sigue avanzando sola con el reloj (entre las 7:00 y las 20:00).
  useEffect(() => {
    const id = setInterval(() => {
      if (horaTocada.current) return;
      if (fecha !== hoyISO()) return;
      setHoraIni(horaActualHHMM());
    }, 30000);
    return () => clearInterval(id);
  }, [fecha]);

  const errorFiltro = useMemo(() => {
    if (!horaIni || !horaFin) return 'Indica la hora de inicio y de fin.';
    if (!horaEnRango(horaIni, HORA_MIN, HORA_MAX) || !horaEnRango(horaFin, HORA_MIN, HORA_MAX)) {
      return `La hora debe estar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00.`;
    }
    if (horaFin <= horaIni) return 'La hora de fin debe ser posterior a la de inicio.';
    if (fecha === HOY && horaIni < horaActualHHMM()) return 'No puedes reservar una hora que ya pasó hoy.';
    return null;
  }, [fecha, horaIni, horaFin, HOY]);

  const consultar = useCallback(() => {
    if (errorFiltro) return Promise.resolve({ espacios: [] });
    return disponibilidadApi.consultar({ fecha, horaIni, horaFin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, horaIni, horaFin, errorFiltro]);
  const { data, cargando, error, recargar } = useApiResource(consultar, {
    mensajeError: 'No se pudo consultar la disponibilidad.',
  });

  const cargarParalelos = useCallback(() => paralelosApi.listar({ id_doc: usuario?.id }), [usuario?.id]);
  const { data: misParalelos } = useApiResource(cargarParalelos, {
    mensajeError: 'No se pudieron cargar tus cursos.',
  });

  const espacios = data?.espacios ?? [];
  const espaciosFiltrados = useMemo(
    () =>
      espacios.filter(
        (esp) => (!filtroTipo || esp.tipo === filtroTipo) && (!filtroBloque || esp.bloque === filtroBloque)
      ),
    [espacios, filtroTipo, filtroBloque]
  );

  // Si venimos de aceptar una solicitud con espacio ya elegido, saltamos directo
  // a la confirmación (la "parte final"): el docente solo confirma.
  const autoAbierto = useRef(false);
  const [espacioYaNoLibre, setEspacioYaNoLibre] = useState(false);
  useEffect(() => {
    if (!prefill?.idEspacio || autoAbierto.current || !data) return;
    autoAbierto.current = true;
    const espacio = espacios.find((e) => e.id_esp === prefill.idEspacio);
    const hueco = espacio?.libre ? calcularHueco(espacio, horaIni, horaFin) : null;
    if (espacio && hueco) {
      setSeleccionado({ espacio, hueco });
    } else {
      setEspacioYaNoLibre(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <Layout>
      <PageHeader titulo="Reservar un espacio" descripcion="Aulas y laboratorios disponibles en este momento." />

      {prefill && (
        <div className="mt-4">
          <Alert variant={espacioYaNoLibre ? 'error' : 'info'}>
            {espacioYaNoLibre ? (
              <>
                El aula que eligió <strong>{prefill.estudiante}</strong> ya no está libre para {fecha} de {horaIni} a{' '}
                {horaFin}. Elige otra abajo para confirmar su solicitud
                {prefill.tema ? `: "${prefill.tema}"` : ''}.
              </>
            ) : (
              <>
                Confirmando la solicitud de <strong>{prefill.estudiante}</strong>
                {prefill.tema ? `: "${prefill.tema}"` : ''} para {fecha} de {horaIni} a {horaFin}.
              </>
            )}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Input
          label="Fecha"
          type="date"
          min={HOY}
          value={fecha}
          onChange={(e) => {
            horaTocada.current = false;
            setFecha(e.target.value);
          }}
          className="w-40"
        />
        <SelectorHora
          label="Desde"
          value={horaIni}
          onChange={cambiarHoraIni}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
        <SelectorHora
          label="Hasta"
          value={horaFin}
          onChange={setHoraFin}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
        <Select label="Tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-40">
          <option value="">Aulas y laboratorios</option>
          {OPCIONES_TIPO_ESPACIO.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </Select>
        <Select label="Bloque" value={filtroBloque} onChange={(e) => setFiltroBloque(e.target.value)} className="w-40">
          <option value="">Todos</option>
          {OPCIONES_BLOQUE.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </Select>
      </div>

      {errorFiltro && (
        <div className="mt-4">
          <Alert>{errorFiltro}</Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DataState
          cargando={cargando}
          error={error}
          vacio={!errorFiltro && espaciosFiltrados.length === 0}
          skeleton={<SkeletonCards count={6} />}
          mensajeVacio="No hay aulas que coincidan con los filtros."
        >
          {!errorFiltro &&
            espaciosFiltrados.map((esp) => {
              const hueco = esp.libre ? calcularHueco(esp, horaIni, horaFin) : null;
              return (
                <TarjetaEspacio
                  key={esp.id_esp}
                  espacio={esp}
                  hueco={hueco}
                  onSeleccionar={() => setSeleccionado({ espacio: esp, hueco })}
                />
              );
            })}
        </DataState>
      </div>

      <ModalReservaRapida
        abierto={Boolean(seleccionado)}
        espacio={seleccionado?.espacio}
        hueco={seleccionado?.hueco}
        fecha={fecha}
        misParalelos={misParalelos ?? []}
        prefillIdParalelo={prefill?.idParalelo}
        prefillTema={prefill?.tema}
        onCerrar={() => setSeleccionado(null)}
        onReservado={(msg) => {
          setSeleccionado(null);
          mostrarToast(msg, 'exito');
          recargar();
        }}
      />
    </Layout>
  );
}

function TarjetaEspacio({ espacio, hueco, onSeleccionar }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[11px] uppercase tracking-wide text-celeste-dark font-medium">
            {ETIQUETA_TIPO_ESPACIO[espacio.tipo] || espacio.tipo}
          </span>
          <p className="font-display text-lg text-ink mt-1">{espacio.nom_esp}</p>
          <p className="text-sm text-ink/50">
            {ETIQUETA_BLOQUE[espacio.bloque] || espacio.bloque} · Piso {espacio.piso} · Capacidad {espacio.capacidad}
          </p>
        </div>
        <Badge className={hueco ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}>
          {hueco ? 'Disponible' : 'Ocupada'}
        </Badge>
      </div>

      {espacio.ocupaciones.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-line space-y-1">
          {espacio.ocupaciones.map((o, i) => (
            <li key={`${espacio.id_esp}-${i}`} className="text-sm text-ink/60">
              {o.hora_ini}–{o.hora_fin} · {o.tipo === 'CLASE' ? 'Clase' : 'Reserva'}: {o.etiqueta}
            </li>
          ))}
        </ul>
      )}

      {hueco && (
        <Button size="sm" className="mt-4" onClick={onSeleccionar}>
          Seleccionar horario
        </Button>
      )}
    </Card>
  );
}

function ModalReservaRapida({ abierto, espacio, hueco, fecha, misParalelos, prefillIdParalelo, prefillTema, onCerrar, onReservado }) {
  if (!abierto || !espacio || !hueco) {
    return <Modal abierto={false} onCerrar={onCerrar} titulo="" />;
  }

  const duracion = hueco.finMin - hueco.inicioMin;
  const esFlexible = duracion >= 60;

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Reservar ${espacio.nom_esp}`}>
      <FormularioReservaRapida
        key={espacio.id_esp}
        espacio={espacio}
        fecha={fecha}
        hueco={hueco}
        esFlexible={esFlexible}
        misParalelos={misParalelos}
        prefillIdParalelo={prefillIdParalelo}
        prefillTema={prefillTema}
        onCancelar={onCerrar}
        onListo={onReservado}
      />
    </Modal>
  );
}

function FormularioReservaRapida({ espacio, fecha, hueco, esFlexible, misParalelos, prefillIdParalelo, prefillTema, onCancelar, onListo }) {
  const [horaIni, setHoraIni] = useState(minAHora(hueco.inicioMin));
  const [horaFin, setHoraFin] = useState(minAHora(Math.min(hueco.inicioMin + 60, hueco.finMin)));
  const [motivo, setMotivo] = useState(prefillTema || '');
  const [idParalelo, setIdParalelo] = useState(prefillIdParalelo ? String(prefillIdParalelo) : '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const horaMinDial = Math.floor(hueco.inicioMin / 60);
  const horaMaxDial = Math.ceil(hueco.finMin / 60);

  async function confirmar(e) {
    e.preventDefault();
    setError(null);

    const iniMin = horaEnMinutos(horaIni);
    const finMin = horaEnMinutos(horaFin);
    if (finMin <= iniMin) return setError('La hora de fin debe ser posterior a la de inicio.');
    if (iniMin < hueco.inicioMin || finMin > hueco.finMin) {
      return setError(`El horario debe estar entre ${minAHora(hueco.inicioMin)} y ${minAHora(hueco.finMin)}.`);
    }
    if (!idParalelo) return setError('Selecciona el curso al que pertenece esta tutoría.');

    setEnviando(true);
    try {
      await reservasApi.crear({
        id_esp: espacio.id_esp,
        fecha,
        hor_ini: horaIni,
        hor_fin: horaFin,
        motivo,
        id_par: idParalelo,
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
      <div className="rounded-md bg-paper px-4 py-3 text-sm text-ink/70">
        <p className="font-medium text-ink">{espacio.nom_esp}</p>
        <p>{fecha}</p>
      </div>

      {esFlexible ? (
        <div className="flex flex-wrap gap-3">
          <SelectorHora
            label="Desde"
            value={horaIni}
            onChange={setHoraIni}
            horaMin={horaMinDial}
            horaMax={horaMaxDial}
            className="w-40"
          />
          <SelectorHora
            label="Hasta"
            value={horaFin}
            onChange={setHoraFin}
            horaMin={horaMinDial}
            horaMax={horaMaxDial}
            className="w-40"
          />
        </div>
      ) : (
        <p className="text-sm text-ink/70">
          Horario: <span className="font-medium text-ink">{horaIni} – {horaFin}</span> (único hueco disponible)
        </p>
      )}

      <Textarea
        label="Tema de la tutoría"
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Tutoría de Programación, paralelo A"
      />

      {misParalelos.length > 0 ? (
        <Select label="Curso" required value={idParalelo} onChange={(e) => setIdParalelo(e.target.value)}>
          <option value="">Selecciona un curso</option>
          {misParalelos.map((p) => (
            <option key={p.id_par} value={p.id_par}>
              {p.materia?.nom_mat} · Paralelo {p.nom_par} ({p.nivel?.nom_niv}, {p.nivel?.carrera?.nom_car})
            </option>
          ))}
        </Select>
      ) : (
        <Alert>No tienes cursos asignados. Pídele al administrador que te asigne uno para poder reservar.</Alert>
      )}

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Confirmando…" disabled={misParalelos.length === 0}>
          Confirmar reserva
        </Button>
      </div>
    </form>
  );
}
