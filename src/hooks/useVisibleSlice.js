"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Pagina en cliente arrays embebidos (acordeones) — patrón PortPax «Cargar más».
 * @param {unknown[]} items
 * @param {number} [initialSize=12]
 * @param {number} [step=12]
 */
export function useVisibleSlice(items = [], initialSize = 12, step = 12) {
  const total = Array.isArray(items) ? items.length : 0;
  const [visibleCount, setVisibleCount] = useState(initialSize);

  // Reinicia solo al cambiar de colección (otro padre), no al añadir/quitar líneas.
  const firstId =
    Array.isArray(items) && items[0]
      ? String(items[0].id ?? items[0].bep_id ?? items[0].bin_id ?? items[0].exit_id ?? "")
      : "";
  const resetKey = Array.isArray(items) && items.length ? firstId || "nonempty" : "empty";

  useEffect(() => {
    setVisibleCount(initialSize);
  }, [resetKey, initialSize]);


  const safeVisible = Math.min(visibleCount, total);
  const visibleItems = useMemo(
    () => (Array.isArray(items) ? items.slice(0, safeVisible) : []),
    [items, safeVisible],
  );

  const hasMore = safeVisible < total;

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + step);
  }, [step]);

  const reset = useCallback(() => {
    setVisibleCount(initialSize);
  }, [initialSize]);

  return {
    visibleItems,
    visibleCount: safeVisible,
    totalCount: total,
    hasMore,
    loadMore,
    reset,
  };
}
