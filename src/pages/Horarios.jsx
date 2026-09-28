import { useCallback, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import { useApiResource } from '../hooks/useApiResource';
import { usePaginacion } from '../hooks/usePaginacion';
import { useForm } from '../hooks/useForm';
import { horariosApi } from '../api/endpoints/horarios';
import { espaciosApi } from '../api/endpoints/espacios';
import { paralelosApi } from '../api/endpoints/paralelos';
import { reservasApi } from '../api/endpoints/reservas';
import { DIAS_SEMANA, ETIQUETA_DIA, OPCIONES_DIA } from '../lib/constantes';
import { esHoy, fechaISO, horaEnMinutos, horaEnRango, mensajeDeError, semanaActual } from '../lib/formato';
import {
  Alert,
  Badge,
  Buscador,
  Button,
  DataState,
  Input,
  Modal,
  PageHeader,
  Paginacion,
  Select,
  SelectBuscable,
  SelectorHora,
  normalizarBusqueda,
} from '../components/ui';

const HORA_MIN = 7;
const HORA_MAX = 20;
// Almuerzo: no se programan clases ni reservas de 13:00 a 14:00.
const ALMUERZO_INI = 13 * 60;
const ALMUERZO_FIN = 14 * 60;
const cruzaAlmuerzo = (ini, fin) => horaEnMinutos(ini) < ALMUERZO_FIN && horaEnMinutos(fin) > ALMUERZO_INI;
const esFinDeSemana = (iso) => [0, 6].includes(new Date(`${iso}T12:00:00`).getDay());

const DIAS_MOSTRADOS = DIAS_SEMANA; // Lunes a Viernes
const ABREV_DIA = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie' };

// "7", "07", "7:00", "7:30" -> minutos del día; cualquier otro texto -> null (búsqueda por texto).
// 1-6 se leen como de la tarde (la facultad funciona de 7:00 a 20:00): "3" -> 15:00.
function busquedaComoHora(q) {
  const m = q.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (h >= 1 && h < HORA_MIN) h += 12;
  const min = Number(m[2] || 0);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

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
  const [busqueda, setBusqueda] = useState('');
  const [filtroEspacio, setFiltroEspacio] = useState('');

  const cargar = useCallback(async () => {
    const [horarios, espacios, paralelos] = await Promise.all([
      horariosApi.listar(),
      espaciosApi.listar(),
      paralelosApi.listar(),
    ]);
    return { horarios, espacios, paralelos };
  }, []);

  const { data, cargando, error, recargar } = useApiResource(cargar, {
    mensajeError: 'No se pudo cargar el horario.',
  });

  const horarios = data?.horarios ?? [];
  const espacios = data?.espacios ?? [];
  const paralelos = data?.paralelos ?? [];

  const diaFecha = semana[diaIndice];
  const diaTxt = DIAS_MOSTRADOS[diaIndice];
  const fechaTxt = fechaISO(diaFecha);

  const grupos = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    const minutoBuscado = busquedaComoHora(q);
    const coincide = (h) => {
      if (filtroEspacio && String(h.id_esp) !== filtroEspacio) return false;
      if (!q) return true;
      // Por hora: el bloque que está en curso a esa hora (7 -> 07:00-08:00).
      if (minutoBuscado !== null) {
        return horaEnMinutos(h.hora_ini) <= minutoBuscado && minutoBuscado < horaEnMinutos(h.hora_fin);
      }
      const texto = normalizarBusqueda(
        `${h.nombre_curso} ${h.docente?.nombres} ${h.docente?.apellidos} ${h.espacio?.nom_esp}`
      );
      return q.split(/\s+/).every((palabra) => texto.includes(palabra));
    };

    const eventosClase = horarios
      .filter((h) => h.dia_semana === diaTxt && coincide(h))
      .map((h) => ({
        tipo: 'CLASE',
        espacio: h.espacio?.nom_esp || `Aula #${h.id_esp}`,
        hora_ini: h.hora_ini,
        hora_fin: h.hora_fin,
        titulo: h.nombre_curso,
        docente: h.docente ? `${h.docente.nombres} ${h.docente.apellidos}` : '—',
        horario: h,
      }));

    const mapa = new Map();
    eventosClase.forEach((e) => {
      if (!mapa.has(e.espacio)) mapa.set(e.espacio, []);
      mapa.get(e.espacio).push(e);
    });

    return [...mapa.entries()]
      .map(([espacio, items]) => ({ espacio, items: items.sort((a, b) => a.hora_ini.localeCompare(b.hora_ini)) }))
      .sort((a, b) => a.espacio.localeCompare(b.espacio, 'es', { numeric: true }));
  }, [horarios, diaTxt, busqueda, filtroEspacio]);

  const hayFiltros = Boolean(busqueda || filtroEspacio);
  const paginacion = usePaginacion(grupos, 10);

  async function eliminarClase(id) {
    if (!window.confirm('¿Eliminar este bloque de clase?')) return;
    try {
      await horariosApi.eliminar(id);
      recargar();
    } catch (err) {
      window.alert(mensajeDeError(err, 'No se pudo eliminar.'));
    }
  }

  return (
    <Layout>
      <PageHeader
        titulo="Horarios"
        descripcion="Malla fija de clases: se repite igual todas las semanas del ciclo."
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalReserva(true)}>
            Reservar
          </Button>
          <Button onClick={() => setModalClase({})}>Agregar bloque de clase</Button>
        </div>
      </PageHeader>

      <div className="mt-6 flex gap-1.5 max-w-md">
        {DIAS_MOSTRADOS.map((dia, i) => (
          <button
            key={dia}
            type="button"
            onClick={() => setDiaIndice(i)}
            className={`flex-1 rounded-md border px-2 py-2 text-center text-sm font-medium transition-colors ${
              i === diaIndice
                ? 'bg-azul border-azul text-white'
                : 'bg-white border-line text-ink/70 hover:border-azul/40'
            }`}
          >
            {ABREV_DIA[dia]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Buscador
          className="flex-1"
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por hora (ej. 10 o 10:00), curso, docente o aula…"
        />
        <div className="sm:w-64">
          <Select value={filtroEspacio} onChange={(e) => setFiltroEspacio(e.target.value)}>
            <option value="">Todas las aulas</option>
            {[...espacios]
              .sort((a, b) => a.nom_esp.localeCompare(b.nom_esp, 'es', { numeric: true }))
              .map((e) => (
                <option key={e.id_esp} value={e.id_esp}>
                  {e.nom_esp}
                </option>
              ))}
          </Select>
        </div>
      </div>

      {hayFiltros && !cargando && (
        <div className="mt-2 flex items-center gap-3 text-sm text-ink/50">
          <span>{grupos.reduce((n, g) => n + g.items.length, 0)} bloque(s) encontrados</span>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEspacio('');
            }}
            className="text-azul font-medium hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <DataState
          cargando={cargando}
          error={error}
          vacio={grupos.length === 0}
          mensajeVacio={
            hayFiltros
              ? `Ninguna clase del ${ETIQUETA_DIA[diaTxt]} coincide con la búsqueda.`
              : `No hay clases el ${ETIQUETA_DIA[diaTxt]}.`
          }
        >
          {paginacion.visibles.map((g) => (
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
                    <Badge className="shrink-0 bg-amber-500/10 text-amber-700">Clase</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{e.titulo}</p>
                      <p className="text-xs text-ink/50 truncate">{e.docente}</p>
                    </div>
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
                  </div>
                ))}
              </div>
            </details>
          ))}
        </DataState>
      </div>
      {!cargando && !error && <Paginacion {...paginacion} className="mt-4" />}

      <Modal
        abierto={Boolean(modalClase)}
        onCerrar={() => setModalClase(null)}
        titulo={modalClase?.horario ? 'Editar bloque de clase' : 'Nuevo bloque de clase'}
      >
        {modalClase && (
          <FormularioClase
            horario={modalClase.horario}
            espacios={espacios}
            paralelos={paralelos}
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
    </Layout>
  );
}

// El bloque se asigna a un paralelo (materia + nivel + docente): el nombre del curso
// y el docente los completa el backend a partir de él.
function FormularioClase({ horario, espacios, paralelos, diaPorDefecto, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_esp: horario?.id_esp ? String(horario.id_esp) : '',
    id_par: horario?.id_par ? String(horario.id_par) : '',
    dia_semana: horario?.dia_semana || diaPorDefecto,
    hora_ini: horario?.hora_ini || '',
    hora_fin: horario?.hora_fin || '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const opcionesParalelo = useMemo(
    () =>
      paralelos.map((p) => ({
        value: p.id_par,
        label: `${p.materia?.nom_mat} · Paralelo ${p.nom_par}`,
        detalle: `${p.nivel?.nom_niv} · ${p.nivel?.carrera?.nom_car} · ${p.docente?.nombres} ${p.docente?.apellidos}`,
      })),
    [paralelos]
  );
  const paraleloElegido = paralelos.find((p) => String(p.id_par) === String(valores.id_par));

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.id_par) {
      setError('Selecciona el paralelo (materia y curso) de la clase.');
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
    if (cruzaAlmuerzo(valores.hora_ini, valores.hora_fin)) {
      setError('De 13:00 a 14:00 es hora de almuerzo: no se programan clases.');
      return;
    }
    setEnviando(true);
    const payload = {
      id_esp: Number(valores.id_esp),
      id_par: Number(valores.id_par),
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
        <SelectBuscable
          label="Paralelo"
          required
          opciones={opcionesParalelo}
          value={valores.id_par}
          onChange={(id) => setCampo('id_par', id)}
          placeholder="Escribe materia, nivel, carrera o docente…"
          mensajeVacio="Ningún paralelo coincide."
        />
        {paraleloElegido && (
          <p className="text-xs text-ink/50 mt-1">
            Docente: {paraleloElegido.docente?.nombres} {paraleloElegido.docente?.apellidos}
          </p>
        )}
      </div>

      <div className="col-span-2">
        <Select label="Día" name="dia_semana" value={valores.dia_semana} onChange={handleChange} options={OPCIONES_DIA} />
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
    if (esFinDeSemana(valores.fecha)) {
      setError('Sábado y domingo no hay actividades: elige un día de lunes a viernes.');
      return;
    }
    if (cruzaAlmuerzo(valores.hora_ini, valores.hora_fin)) {
      setError('De 13:00 a 14:00 es hora de almuerzo: no se puede reservar.');
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
