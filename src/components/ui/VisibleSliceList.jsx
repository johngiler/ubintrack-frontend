"use client";

import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";

/**
 * Lista embebida con lote inicial + 「Cargar más」 (acordeones / modales).
 * `children(visibleItems)` recibe el slice; los índices 0..n-1 coinciden con el array original.
 */
export default function VisibleSliceList({
  items = [],
  initialSize = 12,
  step = 12,
  itemLabel = "ítems",
  className,
  children,
}) {
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(items, initialSize, step);

  return (
    <div className={className}>
      {typeof children === "function" ? children(visibleItems) : null}
      <LoadMoreFooter
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadedCount={visibleCount}
        totalCount={totalCount}
        itemLabel={itemLabel}
      />
    </div>
  );
}
