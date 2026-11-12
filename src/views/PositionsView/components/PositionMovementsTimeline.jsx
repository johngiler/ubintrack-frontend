"use client";

import useSWRInfinite from "swr/infinite";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/bootstrap";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import WmsFeedSkeleton from "@/components/wms/WmsFeedSkeleton";
import { formatDateTime } from "@/lib/format";
import { swrInfiniteDefaults } from "@/lib/swr/infiniteDefaults";
import { swrKeys } from "@/lib/swr/keys";
import { getPositionMovements } from "@/services/storageService";

const PAGE_SIZE = 20;

const TYPE_LABELS = {
  created: "Posición creada",
  status_changed: "Cambio de estado",
  flags_changed: "Cambio de flags",
  label_regenerated: "Etiqueta regenerada",
  printed: "Impresa",
  deleted: "Eliminada",
  bin_linked: "Bin vinculado",
  bin_unlinked: "Bin desvinculado",
};

export default function PositionMovementsTimeline({ positionId, active }) {
  const enabled = Boolean(active && positionId);
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (previousPageData && !previousPageData.next) return null;
      return swrKeys.positionMovements(positionId, pageIndex + 1, PAGE_SIZE);
    },
    ([, , page, pageSize]) => getPositionMovements(positionId, page, pageSize),
    swrInfiniteDefaults,
  );

  const pages = data || [];
  const movements = pages.flatMap((p) => p.results || p.movements || []);
  const total = pages[0]?.count ?? pages[0]?.total ?? 0;
  const hasMore = Boolean(pages.length && pages[pages.length - 1]?.next);

  if (!enabled) return null;
  if (isLoading) return <WmsFeedSkeleton rows={3} />;
  if (error) {
    return (
      <p className="text-sm text-red-600">No se pudo cargar el historial.</p>
    );
  }
  if (movements.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--foreground-muted)]">
        Sin movimientos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {movements.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-[var(--border-subtle)] px-4 py-3"
          >
            <p className="text-sm font-medium">
              {m.movement_type_display || TYPE_LABELS[m.movement_type] || m.movement_type}
            </p>
            {m.old_status || m.new_status ? (
              <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[var(--foreground-muted)]">
                <Badge variant="secondary" className="text-[10px]">
                  {m.old_status_display || m.old_status || "—"}
                </Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="secondary" className="text-[10px]">
                  {m.new_status_display || m.new_status || "—"}
                </Badge>
              </p>
            ) : null}
            {m.bin_code ? (
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Bin {m.bin_code}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              {m.created_by_display || "Sistema"} · {formatDateTime(m.created_at)}
            </p>
          </li>
        ))}
      </ul>
      <LoadMoreFooter
        hasMore={hasMore}
        loading={isValidating && !isLoading}
        onLoadMore={() => setSize(size + 1)}
        loadedCount={movements.length}
        totalCount={total}
        itemLabel="movimientos"
      />
    </div>
  );
}
