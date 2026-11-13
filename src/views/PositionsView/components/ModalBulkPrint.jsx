"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";

import { Modal, Button, Alert, Form } from "@/components/ui/bootstrap";
import { useWorkspace } from "@/context/WorkspaceContext";
import { bulkPrintPositions } from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

const MIN_PER_LABEL = 1;
const CELL_INCHES = 2;

/** Misma fórmula que el backend: floor(dim/2), mín. 1. */
export function maxPositionsPerLabelFromWorkspace(workspace) {
  const width = Number(workspace?.label_width_in);
  const height = Number(workspace?.label_height_in);
  const fromApi = Number(workspace?.max_positions_per_label);
  if (Number.isFinite(fromApi) && fromApi >= 1) {
    return Math.floor(fromApi);
  }
  const cols = Math.max(1, Math.floor((Number.isFinite(width) ? width : 4) / CELL_INCHES));
  const rows = Math.max(
    1,
    Math.floor((Number.isFinite(height) ? height : 2) / CELL_INCHES),
  );
  return cols * rows;
}

export default function ModalBulkPrint({
  show,
  onHide,
  positionIds = [],
  onPrinted,
  showAlert,
  trackAsyncJob,
}) {
  const { workspace } = useWorkspace();
  const maxPerLabel = useMemo(
    () => maxPositionsPerLabelFromWorkspace(workspace),
    [workspace],
  );

  const [isPrinting, setIsPrinting] = useState(false);
  const [formError, setFormError] = useState("");
  const [perLabel, setPerLabel] = useState(maxPerLabel);
  const [samePositionCopies, setSamePositionCopies] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFormError("");
    setPerLabel(maxPerLabel);
    setSamePositionCopies(false);
    setIsPrinting(false);
  }, [show, maxPerLabel]);

  const selectedCount = positionIds.length;
  const safePerLabel = Math.min(
    maxPerLabel,
    Math.max(MIN_PER_LABEL, Number(perLabel) || 1),
  );
  const sheetCount = useMemo(() => {
    if (!selectedCount) return 0;
    if (samePositionCopies) return selectedCount;
    return Math.ceil(selectedCount / safePerLabel);
  }, [selectedCount, safePerLabel, samePositionCopies]);

  const qrTotal = useMemo(() => {
    if (!selectedCount) return 0;
    if (samePositionCopies) return selectedCount * safePerLabel;
    return selectedCount;
  }, [selectedCount, safePerLabel, samePositionCopies]);

  const widthLabel = workspace?.label_width_in ?? "4";
  const heightLabel = workspace?.label_height_in ?? "2";

  function handlePerLabelChange(value) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) {
      setPerLabel("");
      return;
    }
    setPerLabel(Math.min(maxPerLabel, Math.max(MIN_PER_LABEL, n)));
  }

  async function handlePrint() {
    if (!positionIds.length) return;
    setFormError("");
    setIsPrinting(true);
    try {
      const result = await bulkPrintPositions(positionIds, {
        perLabel: safePerLabel,
        samePositionCopies,
      });
      followBulkJob(result, {
        showAlert,
        onAsyncStart: trackAsyncJob?.start,
        onAsyncEnd: trackAsyncJob?.finish,
        onFinished: (job) => {
          if (job?.status === "failed" || job?.success === false) return;
          void onPrinted?.();
        },
      });
      onHide();
      if (isBulkJobOpen(result)) void onPrinted?.();
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "No se pudo imprimir la etiqueta. Verifique la impresora.",
        ),
      );
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Confirmar impresión</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}

        <p className="mb-3 text-sm text-slate-700">
          Se imprimirán{" "}
          <strong>{selectedCount}</strong> posiciones seleccionadas. Las que no
          tengan etiqueta se omitirán.
        </p>

        <Form.Group className="mb-3">
          <Form.Label className="!text-xs !font-medium !text-slate-600">
            Por etiqueta
          </Form.Label>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span>Se imprimirán</span>
            <Form.Control
              type="number"
              min={MIN_PER_LABEL}
              max={maxPerLabel}
              step={1}
              value={perLabel}
              onChange={(e) => handlePerLabelChange(e.target.value)}
              disabled={isPrinting}
              className="!w-16 !text-center"
              aria-label="Cantidad de posiciones por etiqueta"
            />
            <span>por etiqueta</span>
            <span className="text-xs text-[var(--foreground-muted)]">
              (máx. {maxPerLabel})
            </span>
          </div>
        </Form.Group>

        <Form.Check
          type="checkbox"
          id="position-print-same-copies"
          className="mb-2"
          checked={samePositionCopies}
          disabled={isPrinting}
          onChange={(e) => setSamePositionCopies(e.target.checked)}
          label="Copias de la misma posición"
        />

        <p className="text-xs text-[var(--foreground-muted)]">
          {samePositionCopies ? (
            <>
              {sheetCount} etiqueta{sheetCount === 1 ? "" : "s"} con{" "}
              {safePerLabel} QR iguales c/u ({qrTotal} QR en total).
            </>
          ) : (
            <>
              {sheetCount} etiqueta{sheetCount === 1 ? "" : "s"} · medida{" "}
              {widthLabel}×{heightLabel}&quot; → máx. {maxPerLabel} por hoja; si
              faltan, las celdas libres quedan en blanco.
            </>
          )}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isPrinting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={Printer}
          onClick={handlePrint}
          disabled={
            isPrinting ||
            !selectedCount ||
            trackAsyncJob?.hasKind?.("position_print")
          }
          loading={isPrinting}
        >
          {isPrinting ? "Imprimiendo…" : "Imprimir"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
