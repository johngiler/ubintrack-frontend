"use client";

import { useEffect, useState } from "react";

/** Valor con debounce (búsquedas de listados). */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Vaciar búsqueda al instante (limpiar filtros); el resto con debounce.
    if (value === "" || value === null || value === undefined) {
      setDebounced(value ?? "");
      return undefined;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
