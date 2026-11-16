"use client";

import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { ClipboardCheck, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import WmsFeedSkeleton from "@/components/wms/WmsFeedSkeleton";
import { formatDateTime, formatDocumentCode } from "@/lib/format";
import { swrInfiniteDefaults } from "@/lib/swr/infiniteDefaults";
import { swrKeys } from "@/lib/swr/keys";
import { getBinAudits } from "@/services/inventoryService";

const PAGE_SIZE = 20;

const LINE_STATUS_LABELS = {
  contado: "Completo",
  diferencia: "Incompleto",
  no_existe: "No existe bin",
};

const LINE_STATUS_VARIANTS = {
  contado: "success",
  diferencia: "danger",
  no_existe: "secondary",
};

export default function BinAuditsTimeline({ binId, active }) {
  const enabled = Boolean(active && binId);
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (previousPageData && !previousPageData.next) return null;
      return swrKeys.binAudits(binId, pageIndex + 1, PAGE_SIZE);
    },
    ([, , page, pageSize]) => getBinAudits(binId, page, pageSize),
    swrInfiniteDefaults,
  );

  const pages = data || [];
  const audits = pages.flatMap((p) => p.results || p.movements || []);
  const total = pages[0]?.count ?? pages[0]?.total ?? 0;
  const hasMore = Boolean(pages.length && pages[pages.length - 1]?.next);

  if (!enabled) return null;
  if (isLoading) return <WmsFeedSkeleton rows={4} />;
  if (error) {
    return (
      <p className="text-sm text-red-600">No se pudo cargar las auditorías.</p>
    );
  }
  if (!audits.length) {
    return (
      <p className="py-6 text-center text-sm text-[var(--foreground-muted)]">
        Sin auditorías registradas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="mb-0 text-xs text-slate-500">
        {total} {total === 1 ? "auditoría" : "auditorías"}
      </p>
      <ul className="m-0 list-none space-y-2 p-0">
        {audits.map((row) => {
          const when = row.verified_at || row.updated_at;
          const taskLabel = formatDocumentCode(row.task_code) || row.task_code;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-[var(--border-subtle)] border-l-4 border-l-sky-500 bg-[var(--surface-hover)]/30 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-sky-600" />
                    <Link
                      href={`/tasks/tasks?search=${encodeURIComponent(row.task_code || "")}`}
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                    >
                      {taskLabel}
                      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                    </Link>
                  </div>
                  {row.task_title ? (
                    <p className="mb-0 mt-0.5 text-xs text-slate-500">
                      {row.task_title}
                    </p>
                  ) : null}
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    {formatDateTime(when)}
                    {row.position_code ? ` · ${row.position_code}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={LINE_STATUS_VARIANTS[row.line_status] || "secondary"}
                    dot={false}
                  >
                    {LINE_STATUS_LABELS[row.line_status] || row.line_status}
                  </Badge>
                  {row.line_status !== "no_existe" &&
                  row.counted_quantity != null ? (
                    <span className="text-xs tabular-nums text-slate-600">
                      Contada {row.counted_quantity}
                      {row.system_quantity != null
                        ? ` · sistema ${row.system_quantity}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <LoadMoreFooter
        hasMore={hasMore}
        loading={isValidating && !isLoading}
        onLoadMore={() => setSize(size + 1)}
        loadedCount={audits.length}
        totalCount={total}
        itemLabel="auditorías"
      />
    </div>
  );
}
