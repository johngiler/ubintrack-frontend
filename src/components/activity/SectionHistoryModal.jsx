"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { History } from "lucide-react";

import ActivityHistoryModal from "@/components/ui/ActivityHistoryModal";
import ActivityBatchDetailModal from "@/components/activity/ActivityBatchDetailModal";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import WmsFeedSkeleton from "@/components/wms/WmsFeedSkeleton";
import { Form } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useActivityInfinite } from "@/hooks/useActivityInfinite";
import { swrKeys } from "@/lib/swr/keys";
import { formatDateTime } from "@/lib/format";
import { fetchActivityActors } from "@/services/activityService";

const ACTION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "create", label: "Creación" },
  { value: "update", label: "Actualización" },
  { value: "delete", label: "Eliminación" },
  { value: "status", label: "Estado" },
  { value: "login", label: "Inicio de sesión" },
  { value: "generate", label: "Generación" },
  { value: "process", label: "Proceso" },
  { value: "reverse", label: "Reversión" },
  { value: "replace", label: "Reemplazo" },
  { value: "reassign", label: "Reasignación" },
  { value: "set_hilera_push", label: "Push de hilera" },
  { value: "bulk_delete", label: "Eliminación masiva" },
  { value: "bulk_flags", label: "Flags masivos" },
  { value: "bulk_print", label: "Impresión masiva" },
  { value: "bulk_regenerate", label: "Regeneración masiva" },
];

/**
 * Historial macro de una sección. Lazy + SWRInfinite solo con open=true.
 */
export default function SectionHistoryModal({
  open,
  onClose,
  section,
  title,
  initialBatchId = null,
  initialAction = "",
  onOpenItem,
}) {
  const [action, setAction] = useState(initialAction || "");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [batchId, setBatchId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAction(initialAction || "");
    if (initialBatchId) setBatchId(initialBatchId);
  }, [open, initialAction, initialBatchId]);

  const filters = useMemo(
    () => ({ action, actor, dateFrom, dateTo }),
    [action, actor, dateFrom, dateTo],
  );

  const { data: actorsData } = useSWR(
    open ? swrKeys.activityActors(section) : null,
    () => fetchActivityActors(section),
  );

  const actorOptions = useMemo(() => {
    const rows = actorsData?.results || [];
    const opts = [{ value: "", label: "Todos" }];
    if (actorsData?.has_system) opts.push({ value: "system", label: "Sistema" });
    rows.forEach((row) => {
      opts.push({ value: String(row.id), label: row.display });
    });
    return opts;
  }, [actorsData]);

  const { items, total, isLoading, hasMore, loadMore, isValidating } =
    useActivityInfinite({ open, section, filters });

  function clearFilters() {
    setAction("");
    setActor("");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters = Boolean(action || actor || dateFrom || dateTo);

  return (
    <>
      <ActivityHistoryModal
        open={open}
        onClose={onClose}
        title={title || "Historial de movimientos"}
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Form.Group className="mb-0">
              <Form.Label className="text-xs">Tipo</Form.Label>
              <Select
                size="sm"
                options={ACTION_OPTIONS}
                value={action}
                onChange={(e) => setAction(e.target.value || "")}
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label className="text-xs">Autor</Form.Label>
              <Select
                size="sm"
                options={actorOptions}
                value={actor}
                onChange={(e) => setActor(e.target.value || "")}
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label className="text-xs">Desde</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label className="text-xs">Hasta</Form.Label>
              <div className="flex gap-2">
                <Form.Control
                  type="date"
                  size="sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpiar
                  </Button>
                ) : null}
              </div>
            </Form.Group>
          </div>
        }
      >
        {isLoading ? (
          <WmsFeedSkeleton rows={4} />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--foreground-muted)]">
            No hay movimientos en este historial.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const isBulk = Boolean(item.batch_id) || (item.affected_count || 1) > 1;
              const clickable =
                isBulk || (item.resource_id && typeof onOpenItem === "function");
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => {
                      if (item.batch_id) {
                        setBatchId(item.batch_id);
                        return;
                      }
                      if (item.resource_id && onOpenItem) {
                        onOpenItem(item);
                        onClose();
                      }
                    }}
                    className={`w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-left transition-colors ${
                      clickable
                        ? "cursor-pointer hover:bg-[var(--surface-hover)]/50"
                        : "cursor-default"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <History className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-muted)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {item.summary}
                        </p>
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                          {item.actor_display || "Sistema"}
                          {" · "}
                          {formatDateTime(item.created_at)}
                          {isBulk
                            ? ` · ${item.affected_count} ítems`
                            : item.resource_code
                              ? ` · ${item.resource_code}`
                              : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <LoadMoreFooter
          hasMore={hasMore}
          loading={isValidating && !isLoading}
          onLoadMore={loadMore}
          loadedCount={items.length}
          totalCount={total}
          itemLabel="movimientos"
        />
      </ActivityHistoryModal>

      <ActivityBatchDetailModal
        open={Boolean(batchId)}
        batchId={batchId}
        onClose={() => setBatchId(null)}
        onOpenItem={(row) => {
          if (onOpenItem) {
            onOpenItem({
              resource_id: row.resource_id,
              resource_code: row.resource_code,
              section,
            });
            setBatchId(null);
            onClose();
          }
        }}
      />
    </>
  );
}
