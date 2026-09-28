import { useEffect, useMemo, useState } from 'react';

/**
 * Paginación en memoria para listas ya cargadas.
 * Vuelve a la página 1 cuando cambia la cantidad de elementos (p. ej. al filtrar o buscar),
 * y nunca deja la página actual fuera de rango.
 *
 * @returns {{ pagina, setPagina, totalPaginas, visibles, desde, hasta, total, porPagina }}
 */
export function usePaginacion(items = [], porPagina = 15) {
  const [pagina, setPagina] = useState(1);
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  useEffect(() => {
    setPagina(1);
  }, [total]);

  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;

  const visibles = useMemo(() => items.slice(inicio, inicio + porPagina), [items, inicio, porPagina]);

  return {
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    visibles,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + porPagina, total),
    total,
    porPagina,
  };
}
