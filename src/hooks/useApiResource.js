import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../lib/formato';

/**
 * Encapsula el patrón repetido de "cargar datos de la API":
 * estados `cargando` / `error` / `data` + try/catch/finally + recarga manual.
 *
 * @param {() => Promise<any>} peticion  Función memoizada (useCallback) que hace la llamada.
 * @param {{ auto?: boolean, mensajeError?: string }} opciones
 *        auto: si dispara la carga al montar (por defecto true).
 */
export function useApiResource(peticion, { auto = true, mensajeError } = {}) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(auto);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await peticion();
      setData(resultado);
      return resultado;
    } catch (err) {
      setError(mensajeDeError(err, mensajeError || 'No se pudo cargar la información.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, [peticion, mensajeError]);

  useEffect(() => {
    if (auto) recargar();
  }, [auto, recargar]);

  return { data, cargando, error, recargar, setData };
}
