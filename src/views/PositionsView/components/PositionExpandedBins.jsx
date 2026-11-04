"use client";

import { Badge } from "@/components/ui/Badge";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";

export default function PositionExpandedBins({ bins = [] }) {
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(bins, 12, 12);

  if (!bins.length) {
    return <div className="px-4 py-3 text-sm text-slate-500">Sin historial</div>;
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="flex flex-wrap gap-3">
        {visibleItems.map((bin) => (
          <div
            key={bin.id}
            className="w-full max-w-[350px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h6 className="mb-0 text-sm font-semibold text-slate-900">{bin.code}</h6>
              <Badge
                variant={
                  bin.status === "almacenado"
                    ? "success"
                    : bin.status === "despachado"
                      ? "secondary"
                      : "warning"
                }
                dot={false}
              >
                {bin.status}
              </Badge>
            </div>
            <div className="text-sm">
              <div className="text-xs text-slate-500">Cliente</div>
              <div className="font-medium text-slate-800">{bin.client?.name || "—"}</div>
            </div>
            {bin.dispatched_date && (
              <div className="mt-2 text-sm">
                <div className="text-xs text-slate-500">Despachado</div>
                <div className="text-slate-700">
                  {new Date(bin.dispatched_date).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <LoadMoreFooter
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadedCount={visibleCount}
        totalCount={totalCount}
        itemLabel="bins"
      />
    </div>
  );
}
