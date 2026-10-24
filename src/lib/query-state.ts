/**
 * Cambia la query de la URL sin pedirle la página al servidor. Next sincroniza
 * history.replaceState con useSearchParams, así los componentes que leen la URL
 * (la lista, los filtros) se actualizan al instante. No agrega entradas al
 * historial: "atrás" sale de la lista, no deshace un filtro.
 */
export function replaceQuery(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
}
