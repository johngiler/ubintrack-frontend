"use client";

import { SWRConfig } from "swr";

import { authJsonFetcher } from "@/lib/swr/fetchers";

/**
 * Defaults globales (Publivalla + toques PortPax).
 * Los hooks con fetcher propio lo sobreescriben; si la clave es ruta `/api/...`,
 * pueden omitir fetcher y usar el global.
 *
 * No usar `revalidateOnMount: false` en recursos concretos (rompe 1ª carga en SWR 2.x).
 */
export function SwrProvider({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher: authJsonFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 3000,
        errorRetryCount: 2,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
