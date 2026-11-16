"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Check,
  ExternalLink,
  ListTodo,
  RotateCcw,
  ScanBarcode,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import NumberInput from "@/components/ui/NumberInput";
import { Alert } from "@/components/ui/bootstrap";
import { useVisibleSlice } from "@/hooks/useVisibleSlice";
import { getApiErrorMessage } from "@/services/httpClient";
import {
  generateTaskLines,
  getTaskLines,
  patchTaskLine,
} from "@/services/taskService";
import {
  TASK_LINE_STATUS_LABELS,
  TASK_LINE_STATUS_VARIANTS,
} from "../taskLabels";
import ModalVerifyPosition from "./ModalVerifyPosition";

function CatalogLink({ href, children, className = "" }) {
  if (!href || !children) return <span className={className}>—</span>;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline ${className}`}
      title="Abrir en catálogo"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}

export default function TaskLinesPanel({
  taskId,
  taskStatus = "",
  canEdit = false,
  onChanged,
}) {
  const [error, setError] = useState("");
  const [qtyDraft, setQtyDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [verifyLine, setVerifyLine] = useState(null);
  const [generating, setGenerating] = useState(false);
  const autoGenRef = useRef(false);

  const { data, isLoading, mutate } = useSWR(
    taskId ? ["task-lines", taskId] : null,
    () => getTaskLines(1, { task: taskId }, 100),
    { revalidateOnFocus: false },
  );

  const lines = data?.results || [];
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useVisibleSlice(lines, 12, 12);

  const pendingCount = useMemo(
    () => lines.filter((row) => row.line_status === "pendiente").length,
    [lines],
  );

  const refresh = async () => {
    await mutate();
    onChanged?.();
  };

  const runGenerate = async ({ force = false } = {}) => {
    if (!taskId || generating) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateTaskLines(taskId, { force });
      await refresh();
      if (!res?.lines_count) {
        setError("No hay bins almacenados en el alcance de esta tarea.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo generar el recorrido."));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    autoGenRef.current = false;
  }, [taskId]);

  useEffect(() => {
    if (!taskId || !canEdit || isLoading || lines.length > 0) return;
    if (!["en_proceso", "asignada", "verificacion"].includes(taskStatus)) return;
    if (autoGenRef.current) return;
    autoGenRef.current = true;
    void runGenerate();
    // Solo auto-generar al abrir vacío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, canEdit, isLoading, lines.length, taskStatus]);

  const runPatch = async (lineId, payload) => {
    setBusyId(lineId);
    setError("");
    try {
      await patchTaskLine(lineId, payload);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar la línea."));
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading && !lines.length && !generating) {
    return <p className="py-3 text-center text-sm text-slate-500">Cargando recorrido…</p>;
  }

  if (!lines.length) {
    return (
      <div className="space-y-2 py-3 text-center">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <p className="mb-0 text-sm text-slate-500">
          {generating
            ? "Generando recorrido…"
            : "Sin recorrido para esta tarea."}
        </p>
        {canEdit ? (
          <Button
            variant="outline"
            size="sm"
            icon={ListTodo}
            loading={generating}
            onClick={() => void runGenerate({ force: true })}
          >
            Generar recorrido
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-0 text-sm font-semibold text-slate-800">Recorrido</p>
        <p className="mb-0 text-xs text-slate-500">
          {lines.length - pendingCount}/{lines.length} resueltas
          {pendingCount ? ` · faltan ${pendingCount}` : ""}
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Posición</th>
              <th className="px-3 py-2 font-medium">Bin</th>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">Qty sist.</th>
              <th className="px-3 py-2 font-medium">Qty contada</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              {canEdit ? (
                <th className="px-3 py-2 text-end font-medium">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((line) => {
              const verified = Boolean(line.verified_at);
              const resolved = line.line_status !== "pendiente";
              const draft =
                qtyDraft[line.id] !== undefined
                  ? qtyDraft[line.id]
                  : line.counted_quantity ?? "";
              const preview =
                draft === "" || draft === null
                  ? null
                  : Number(draft) === Number(line.system_quantity)
                    ? "Completo"
                    : "Incompleto";

              const positionHref = line.position_code
                ? `/storage/positions?search=${encodeURIComponent(line.position_code)}`
                : null;
              const binHref = line.bin_code
                ? `/inventory/bins?bin_code=${encodeURIComponent(line.bin_code)}`
                : null;
              const productHref = line.product_sku
                ? `/inventory/products?search=${encodeURIComponent(line.product_sku)}`
                : line.product_name
                  ? `/inventory/products?search=${encodeURIComponent(line.product_name)}`
                  : null;

              return (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <CatalogLink
                      href={positionHref}
                      className="font-medium"
                    >
                      {line.position_code}
                    </CatalogLink>
                    <div className="text-xs text-slate-500">
                      {[line.cava_name, line.position_hall].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    <CatalogLink href={binHref}>{line.bin_code}</CatalogLink>
                  </td>
                  <td className="px-3 py-2">
                    <CatalogLink href={productHref} className="font-medium">
                      {line.product_name}
                    </CatalogLink>
                    <div className="text-xs text-slate-500">
                      {line.product_sku ? `SKU: ${line.product_sku}` : "SKU: —"}
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{line.system_quantity ?? 0}</td>
                  <td className="px-3 py-2">
                    {canEdit && verified && !resolved ? (
                      <div className="flex flex-col gap-1">
                        <NumberInput
                          className="!h-8 w-24 rounded-md px-2 text-xs"
                          value={draft}
                          commitEmptyAs=""
                          emptyValue=""
                          onChange={(next) =>
                            setQtyDraft((prev) => ({ ...prev, [line.id]: next }))
                          }
                        />
                        {preview ? (
                          <span className="text-[11px] text-slate-500">{preview}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="tabular-nums">
                        {line.counted_quantity ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={TASK_LINE_STATUS_VARIANTS[line.line_status] || "secondary"}
                      dot={false}
                    >
                      {TASK_LINE_STATUS_LABELS[line.line_status] || line.line_status}
                    </Badge>
                    {verified && line.line_status === "pendiente" ? (
                      <span className="mt-1 block text-[11px] text-emerald-600">
                        Posición verificada
                      </span>
                    ) : null}
                  </td>
                  {canEdit ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {!verified && !resolved ? (
                          <IconButton
                            variant="ghost"
                            size="sm"
                            className="text-sky-600"
                            title="Verificar posición"
                            disabled={busyId === line.id || !line.position_code}
                            onClick={() => setVerifyLine(line)}
                          >
                            <ScanBarcode className="h-4 w-4" />
                          </IconButton>
                        ) : null}
                        {verified && !resolved ? (
                          <>
                            <IconButton
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600"
                              title="Guardar conteo"
                              disabled={busyId === line.id || draft === "" || draft === null}
                              onClick={() =>
                                void runPatch(line.id, {
                                  counted_quantity: Number(draft),
                                })
                              }
                            >
                              <Check className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              variant="ghost"
                              size="sm"
                              className="text-slate-600"
                              title="No existe bin"
                              disabled={busyId === line.id}
                              onClick={() =>
                                void runPatch(line.id, { missing_bin: true })
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </IconButton>
                          </>
                        ) : null}
                        {resolved ? (
                          <IconButton
                            variant="ghost"
                            size="sm"
                            title="Reabrir"
                            disabled={busyId === line.id}
                            onClick={() => void runPatch(line.id, { reopen: true })}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </IconButton>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LoadMoreFooter
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadedCount={visibleCount}
        totalCount={totalCount}
        itemLabel="líneas"
      />

      <ModalVerifyPosition
        show={Boolean(verifyLine)}
        onHide={() => setVerifyLine(null)}
        taskId={taskId}
        lineId={verifyLine?.id}
        expectedCode={verifyLine?.position_code || ""}
        onVerified={() => {
          void refresh();
        }}
      />
    </div>
  );
}
