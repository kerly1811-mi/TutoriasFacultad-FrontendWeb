import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { useForm } from '../hooks/useForm';
import { horariosApi } from '../api/endpoints/horarios';
import { espaciosApi } from '../api/endpoints/espacios';
import { usuariosApi } from '../api/endpoints/usuarios';
import { tutoriasApi } from '../api/endpoints/tutorias';
import { reservasApi } from '../api/endpoints/reservas';
import { DIAS_SEMANA, ETIQUETA_DIA, OPCIONES_DIA } from '../lib/constantes';
import { esHoy, fechaISO, horaEnRango, mensajeDeError, mismaFecha, semanaActual } from '../lib/formato';
import { useToast } from '../context/ToastContext';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataState,
  Input,
  Modal,
  PageHeader,
  Select,
  SelectorHora,
} from '../components/ui';

const HORA_MIN = 7;
const HORA_MAX = 20;

const DIAS_MOSTRADOS = DIAS_SEMANA.slice(0, 5); // Lunes a Viernes
const ABREV_DIA = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie' };

/**
 * Horario semanal (laboratorista): misma vista por día/aula que ve el estudiante,
 * pero editable -- puede cargar y editar bloques de clase, y reservar un espacio
 * o cancelar una reserva existente, todo desde aquí.
 */
export default function Horarios() {
  const semana = useMemo(() => semanaActual(), []);
  const [diaIndice, setDiaIndice] = useState(() => {
    const hoyIdx = semana.findIndex(esHoy);
    return hoyIdx >= 0 ? hoyIdx : 0;
  });
  const [modalClase, setModalClase] = useState(null); // null | { horario? }
  const [modalReserva, setModalReserva] = useState(false);
  const [aCancelar, setACancelar] = useState(null); // null | id_rev
  const [cancelando, setCancelando] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    const [horarios, espacios, docentes, tutorias] = await Promise.all([
      horariosApi.listar(),
      espaciosApi.listar(),
      usuariosApi.listar('DOCENTE'),
      tutoriasApi.listar(),
    ]);
    return { horarios, espacios, docentes, tutorias };
  }, []);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar el horario.',
  });

  const horarios = data?.horarios ?? [];
  const espacios = data?.espacios ?? [];
  const docentes = data?.docentes ?? [];
  const tutorias = data?.tutorias ?? [];

  const diaFecha = semana[diaIndice];
  const diaTxt = DIAS_MOSTRADOS[diaIndice];
  const fechaTxt = fechaISO(diaFecha);

  const grupos = useMemo(() => {
    const eventosClase = horarios
      .filter((h) => h.dia_semana === diaTxt)
      .map((h) => ({
        tipo: 'CLASE',
        espacio: h.espacio?.nom_esp || `Aula #${h.id_esp}`,
        hora_ini: h.hora_ini,
        hora_fin: h.hora_fin,
        titulo: h.nombre_curso,
        docente: h.docente ? `${h.docente.nombres} ${h.docente.apellidos}` : '—',
        horario: h,
      }));

    const eventosReserva = tutorias
      .filter((t) => mismaFecha(t.fecha, fechaTxt))
      .map((t) => ({
        tipo: 'RESERVA',
        espacio: t.aula,
        hora_ini: t.hora_ini,
        hora_fin: t.hora_fin,
        titulo: t.tema,
        docente: t.docente,
        id_rev: t.id_rev,
      }));

    const mapa = new Map();
    [...eventosClase, ...eventosReserva].forEach((e) => {
      if (!mapa.has(e.espacio)) mapa.set(e.espacio, []);
      mapa.get(e.espacio).push(e);
    });

    return [...mapa.entries()]
      .map(([espacio, items]) => ({ espacio, items: items.sort((a, b) => a.hora_ini.localeCompare(b.hora_ini)) }))
      .sort((a, b) => a.espacio.localeCompare(b.espacio));
  }, [horarios, tutorias, diaTxt, fechaTxt]);

  async function eliminarClase(id) {
    if (!window.confirm('¿Eliminar este bloque de clase?')) return;
    try {
      await horariosApi.eliminar(id);
      recargar();
    } catch (err) {
      window.alert(mensajeDeError(err, 'No se pudo eliminar.'));
    }
  }

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

  return (
    <Layout>
      <PageHeader titulo="Horarios" descripcion="Tu semana, organizada por aula: clase fija o reserva puntual.">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalReserva(true)}>
            Reservar
          </Button>
          <Button onClick={() => setModalClase({})}>Agregar bloque de clase</Button>
        </div>
      </PageHeader>

      <div className="mt-6 flex gap-1.5 max-w-md">
        {semana.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setDiaIndice(i)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-center transition-colors ${
              i === diaIndice
                ? 'bg-azul border-azul text-white'
                : 'bg-white border-line text-ink/70 hover:border-azul/40'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-80">{ABREV_DIA[DIAS_MOSTRADOS[i]]}</p>
            <p className="font-display text-sm leading-tight">{d.getDate()}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Clase (horario fijo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Reserva (tutoría)
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <DataState
          cargando={cargando}
          error={error}
          vacio={grupos.length === 0}
          mensajeVacio={`No hay clases ni reservas el ${ETIQUETA_DIA[diaTxt]}.`}
        >
          {grupos.map((g) => (
            <details key={g.espacio} className="rounded-md border border-line bg-white overflow-hidden group" open>
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none list-none">
                <span className="font-display text-sm text-ink">{g.espacio}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink/50">{g.items.length} bloque(s)</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-ink/40 transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-line divide-y divide-line">
                {g.items.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5">
                    <div className="w-14 shrink-0 text-xs text-ink/70">
                      <p className="font-medium text-ink">{e.hora_ini}</p>
                      <p>{e.hora_fin}</p>
                    </div>
                    <Badge className={`shrink-0 ${e.tipo === 'CLASE' ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                      {e.tipo === 'CLASE' ? 'Clase' : 'Reserva'}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{e.titulo}</p>
                      <p className="text-xs text-ink/50 truncate">{e.docente}</p>
                    </div>
                    {e.tipo === 'CLASE' ? (
                      <div className="shrink-0 flex items-center gap-3">
                        <button
                          onClick={() => setModalClase({ horario: e.horario })}
                          className="text-xs text-azul font-medium hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarClase(e.horario.id_hor)}
                          className="text-xs text-danger font-medium hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setACancelar(e.id_rev)}
                        className="shrink-0 text-xs text-danger font-medium hover:underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </DataState>
      </div>

      <Modal
        abierto={Boolean(modalClase)}
        onCerrar={() => setModalClase(null)}
        titulo={modalClase?.horario ? 'Editar bloque de clase' : 'Nuevo bloque de clase'}
      >
        {modalClase && (
          <FormularioClase
            horario={modalClase.horario}
            espacios={espacios}
            docentes={docentes}
            diaPorDefecto={diaTxt}
            onCancelar={() => setModalClase(null)}
            onListo={() => {
              setModalClase(null);
              recargar();
            }}
          />
        )}
      </Modal>

      <Modal abierto={modalReserva} onCerrar={() => setModalReserva(false)} titulo="Reservar un espacio">
        {modalReserva && (
          <FormularioReserva
            espacios={espacios}
            fechaPorDefecto={fechaTxt}
            onCancelar={() => setModalReserva(false)}
            onListo={() => {
              setModalReserva(false);
              recargar();
            }}
          />
        )}
      </Modal>

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

function FormularioClase({ horario, espacios, docentes, diaPorDefecto, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_esp: horario?.id_esp ? String(horario.id_esp) : '',
    nombre_curso: horario?.nombre_curso || '',
    id_doc: horario?.id_doc ? String(horario.id_doc) : '',
    dia_semana: horario?.dia_semana || diaPorDefecto,
    hora_ini: horario?.hora_ini || '',
    hora_fin: horario?.hora_fin || '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.id_doc) {
      setError('Selecciona el docente del curso.');
      return;
    }
    if (!horaEnRango(valores.hora_ini, HORA_MIN, HORA_MAX) || !horaEnRango(valores.hora_fin, HORA_MIN, HORA_MAX)) {
      setError(`La hora debe estar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00.`);
      return;
    }
    if (valores.hora_fin <= valores.hora_ini) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setEnviando(true);
    const payload = {
      id_esp: Number(valores.id_esp),
      nombre_curso: valores.nombre_curso,
      id_doc: Number(valores.id_doc),
      dia_semana: valores.dia_semana,
      hora_ini: valores.hora_ini,
      hora_fin: valores.hora_fin,
    };
    try {
      if (horario) await horariosApi.actualizar(horario.id_hor, payload);
      else await horariosApi.crear(payload);
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el horario.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Select label="Aula" name="id_esp" required value={valores.id_esp} onChange={handleChange}>
          <option value="">Selecciona un aula</option>
          {espacios.map((e) => (
            <option key={e.id_esp} value={e.id_esp}>
              {e.nom_esp}
            </option>
          ))}
        </Select>
      </div>

      <div className="col-span-2">
        <Input
          label="Curso"
          name="nombre_curso"
          required
          value={valores.nombre_curso}
          onChange={handleChange}
          placeholder="Programación II - Paralelo A"
        />
      </div>

      <Select label="Día" name="dia_semana" value={valores.dia_semana} onChange={handleChange} options={OPCIONES_DIA} />

      <Select label="Docente" name="id_doc" required value={valores.id_doc} onChange={handleChange}>
        <option value="">Selecciona un docente</option>
        {docentes.map((d) => (
          <option key={d.id_usr} value={d.id_usr}>
            {d.nombres} {d.apellidos}
          </option>
        ))}
      </Select>

      <SelectorHora
        label="Hora inicio"
        required
        value={valores.hora_ini}
        onChange={(v) => setCampo('hora_ini', v)}
        horaMin={HORA_MIN}
        horaMax={HORA_MAX}
      />
      <SelectorHora
        label="Hora fin"
        required
        value={valores.hora_fin}
        onChange={(v) => setCampo('hora_fin', v)}
        horaMin={HORA_MIN}
        horaMax={HORA_MAX}
      />

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Guardando…">
          Guardar
        </Button>
      </div>
    </form>
  );
}

// Reserva simple sin curso asociado (motivo libre en su lugar): mantenimiento,
// evento, o cualquier ocupación puntual que el laboratorista necesite bloquear.
function FormularioReserva({ espacios, fechaPorDefecto, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_esp: '',
    fecha: fechaPorDefecto,
    hora_ini: '',
    hora_fin: '',
    motivo: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.motivo.trim()) {
      setError('Indica un motivo para la reserva.');
      return;
    }
    if (!horaEnRango(valores.hora_ini, HORA_MIN, HORA_MAX) || !horaEnRango(valores.hora_fin, HORA_MIN, HORA_MAX)) {
      setError(`La hora debe estar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00.`);
      return;
    }
    if (valores.hora_fin <= valores.hora_ini) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setEnviando(true);
    try {
      await reservasApi.crear({
        id_esp: Number(valores.id_esp),
        fecha: valores.fecha,
        hor_ini: valores.hora_ini,
        hor_fin: valores.hora_fin,
        motivo: valores.motivo.trim(),
      });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la reserva.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Select label="Aula" name="id_esp" required value={valores.id_esp} onChange={handleChange}>
          <option value="">Selecciona un aula</option>
          {espacios.map((e) => (
            <option key={e.id_esp} value={e.id_esp}>
              {e.nom_esp}
            </option>
          ))}
        </Select>
      </div>

      <div className="col-span-2">
        <Input label="Fecha" type="date" name="fecha" required value={valores.fecha} onChange={handleChange} />
      </div>

      <SelectorHora
        label="Hora inicio"
        required
        value={valores.hora_ini}
        onChange={(v) => setCampo('hora_ini', v)}
        horaMin={HORA_MIN}
        horaMax={HORA_MAX}
      />
      <SelectorHora
        label="Hora fin"
        required
        value={valores.hora_fin}
        onChange={(v) => setCampo('hora_fin', v)}
        horaMin={HORA_MIN}
        horaMax={HORA_MAX}
      />

      <div className="col-span-2">
        <Input
          label="Motivo"
          name="motivo"
          required
          value={valores.motivo}
          onChange={handleChange}
          placeholder="Mantenimiento, evento, uso interno…"
        />
      </div>

      {error && (
        <div className="col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Reservando…">
          Reservar
        </Button>
      </div>
    </form>
  );
}
