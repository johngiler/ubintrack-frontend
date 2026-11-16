"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";
import { formatDateTime } from "@/lib/format";
import { getTaskLogs } from "@/services/taskService";

const KIND_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "workflow", label: "Solo movimientos" },
];

function logTone(kind = "", message = "") {
  if (kind === "workflow") {
    const text = message.toLowerCase();
    if (text.includes("creó") || text.includes("creada"))
      return "border-emerald-500 bg-emerald-50";
    if (text.includes("completad")) return "border-emerald-600 bg-emerald-50";
    if (text.includes("cancelad")) return "border-red-500 bg-red-50";
    if (text.includes("pasó") || text.includes("estado") || text.includes("asign"))
      return "border-amber-500 bg-amber-50";
    return "border-sky-500 bg-sky-50";
  }
  if (kind === "scope") return "border-slate-400 bg-slate-50";
  return "border-slate-300 bg-white";
}

export default function TaskLogsPanel({ taskId, logs: logsProp }) {
  const [kindFilter, setKindFilter] = useState("all");

  const { data, isLoading } = useSWR(
    taskId && !logsProp
      ? ["task-logs", taskId, kindFilter]
      : null,
    () =>
      getTaskLogs(1, {
        task: taskId,
        kind: kindFilter === "workflow" ? "workflow" : undefined,
        ordering: "created_at",
        pageSize: 100,
      }),
    { revalidateOnFocus: false },
  );

  const logs = useMemo(() => {
    if (logsProp) {
      const list = [...logsProp];
      const filtered =
        kindFilter === "workflow"
          ? list.filter((row) => row.kind === "workflow")
          : list;
      return filtered.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return data?.results || [];
  }, [logsProp, data, kindFilter]);

  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(logs, 12, 12);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h6 className="text-sm font-semibold text-slate-800">Historial</h6>
          <p className="mb-0 text-xs text-slate-500">
            {logs.length} {logs.length === 1 ? "evento" : "eventos"} · orden de ejecución
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {KIND_FILTERS.map((opt) => {
            const active = kindFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setKindFilter(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && !logs.length ? (
        <p className="py-2 text-center text-sm text-slate-500">Cargando historial…</p>
      ) : !logs.length ? (
        <p className="py-2 text-center text-sm text-slate-500">Sin eventos registrados</p>
      ) : (
        <>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {visibleItems.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl border-l-4 px-3 py-2 ${logTone(log.kind, log.message)}`}
              >
                <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                <p className="mb-0 text-sm text-slate-700">{log.message}</p>
              </div>
            ))}
          </div>
          <LoadMoreFooter
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadedCount={visibleCount}
            totalCount={totalCount}
            itemLabel="eventos"
          />
        </>
      )}
    </div>
  );
}
