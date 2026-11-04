"use client";

import useSWR from "swr";

/**
 * Listado DRF paginado (`results` + `count`) con caché SWR.
 * @param {object} opts
 * @param {unknown} opts.key — clave SWR o null para no fetchear
 * @param {() => Promise<{results?: unknown[], count?: number}>} opts.fetcher
 * @param {number} [opts.pageSize=20]
 */
export function usePaginatedList({ key, fetcher, pageSize = 20 }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,
  });

  const count = data?.count ?? 0;

  return {
    results: data?.results ?? [],
    count,
    totalPages: Math.ceil(count / pageSize),
    isLoading: Boolean(key) && isLoading && !data,
    isValidating,
    error,
    mutate,
    data,
  };
}
