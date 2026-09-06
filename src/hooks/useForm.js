import { useCallback, useRef, useState } from 'react';

/**
 * Maneja el estado de un formulario controlado.
 * Reemplaza el patrón repetido `setForm(prev => ({ ...prev, [campo]: valor }))`.
 *
 * Uso con inputs que tienen `name`:
 *   <Input name="correo" value={valores.correo} onChange={handleChange} />
 * Uso manual:
 *   setCampo('correo', 'texto')
 */
export function useForm(valoresIniciales) {
  const [valores, setValores] = useState(valoresIniciales);
  const inicialesRef = useRef(valoresIniciales);

  const setCampo = useCallback((campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const handleChange = useCallback((evento) => {
    const { name, value, type, checked } = evento.target;
    setValores((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const reset = useCallback(() => setValores(inicialesRef.current), []);

  return { valores, setValores, setCampo, handleChange, reset };
}
