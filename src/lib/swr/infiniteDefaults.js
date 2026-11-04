/**
 * Opciones compartidas para useSWRInfinite («Cargar más»).
 * El default revalidateFirstPage=true refetcha page=1 en cada setSize → ráfaga.
 */
export const swrInfiniteDefaults = {
  revalidateFirstPage: false,
};
