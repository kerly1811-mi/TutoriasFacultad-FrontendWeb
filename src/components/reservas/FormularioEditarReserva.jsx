import { useState } from 'react';
import { useForm } from '../../hooks/useForm';
import { reservasApi } from '../../api/endpoints/reservas';
import { fechaISO, formatearHora, horaEnRango, mensajeDeError } from '../../lib/formato';
import { Alert, Button, Input, Select, SelectorHora, Textarea } from '../ui';

const HORA_MIN = 7;
const HORA_MAX = 20;

// Editar aula, fecha, hora y curso/tema de una reserva ya creada. Lo usan
// Control de acceso y el Detalle de tutoría (mismo endpoint PUT /reservas/:id).
export default function FormularioEditarReserva({ reserva, espacios, misParalelos, onCancelar, onListo }) {
  const { valores, handleChange, setCampo } = useForm({
    id_esp: reserva.id_esp ? String(reserva.id_esp) : '',
    fecha: String(reserva.fecha).slice(0, 10),
    hora_ini: formatearHora(reserva.hor_ini),
    hora_fin: formatearHora(reserva.hor_fin),
    tema: reserva.motivo || '',
    id_par: reserva.paralelo?.id_par ? String(reserva.paralelo.id_par) : '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const HOY = fechaISO(new Date());

  async function manejarEnvio(e) {
    e.preventDefault();
    setError(null);
    if (!valores.id_esp) return setError('Selecciona el aula.');
    if (!valores.fecha) return setError('Selecciona la fecha.');
    if (!horaEnRango(valores.hora_ini, HORA_MIN, HORA_MAX) || !horaEnRango(valores.hora_fin, HORA_MIN, HORA_MAX)) {
      return setError(`La hora debe estar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00.`);
    }
    if (valores.hora_fin <= valores.hora_ini) {
      return setError('La hora de fin debe ser posterior a la de inicio.');
    }
    if (!valores.id_par) return setError('Selecciona el curso.');
    setEnviando(true);
    try {
      await reservasApi.actualizar(reserva.id_rev, {
        id_esp: Number(valores.id_esp),
        fecha: valores.fecha,
        hor_ini: valores.hora_ini,
        hor_fin: valores.hora_fin,
        motivo: valores.tema,
        id_par: Number(valores.id_par),
      });
      onListo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo actualizar la reserva.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-4">
      <Select label="Aula" name="id_esp" required value={valores.id_esp} onChange={handleChange}>
        <option value="">Selecciona un aula</option>
        {espacios.map((e) => (
          <option key={e.id_esp} value={e.id_esp}>
            {e.nom_esp}
          </option>
        ))}
      </Select>

      <Select label="Curso" name="id_par" required value={valores.id_par} onChange={handleChange}>
        <option value="">Selecciona un curso</option>
        {misParalelos.map((p) => (
          <option key={p.id_par} value={p.id_par}>
            {p.materia?.nom_mat} · Paralelo {p.nom_par}
          </option>
        ))}
      </Select>

      <Input label="Fecha" type="date" name="fecha" min={HOY} required value={valores.fecha} onChange={handleChange} />

      <div className="flex flex-wrap gap-3">
        <SelectorHora
          label="Desde"
          required
          value={valores.hora_ini}
          onChange={(v) => setCampo('hora_ini', v)}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
        <SelectorHora
          label="Hasta"
          required
          value={valores.hora_fin}
          onChange={(v) => setCampo('hora_fin', v)}
          horaMin={HORA_MIN}
          horaMax={HORA_MAX}
          className="w-40"
        />
      </div>

      <Textarea
        label="Tema de la tutoría"
        rows={2}
        name="tema"
        value={valores.tema}
        onChange={handleChange}
        placeholder="Refuerzo de bases de datos, tema del segundo parcial…"
      />

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando} textoCargando="Guardando…">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
