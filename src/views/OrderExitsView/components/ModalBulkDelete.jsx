"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkDeleteExits } from "@/services/orderService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalBulkDelete({
  show,
  onHide,
  exitIds = [],
  onDone,
  showAlert,
  trackAsyncJob,
  canDeleteAll = true,
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleConfirm() {
    if (!exitIds.length || !canDeleteAll) return;
    setFormError("");
    setIsWorking(true);
    try {
      const result = await bulkDeleteExits(exitIds);
      followBulkJob(result, {
        showAlert,
        onAsyncStart: trackAsyncJob?.start,
        onAsyncEnd: trackAsyncJob?.finish,
        onFinished: (job) => {
          if (job?.status === "failed" || job?.success === false) return;
          void onDone?.();
        },
      });
      onHide();
      if (isBulkJobOpen(result)) void onDone?.();
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, "No se pudo completar la operación."),
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Confirmar eliminación masiva</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        {!canDeleteAll ? (
          <Alert variant="warning" className="mb-3">
            Hay salidas completadas o con bins procesados. Quite esas de la
            selección.
          </Alert>
        ) : null}
        ¿Eliminar <strong>{exitIds.length}</strong>{" "}
        {exitIds.length === 1 ? "salida seleccionada" : "salidas seleccionadas"}?
        Todas deben poder eliminarse.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isWorking}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={handleConfirm}
          disabled={
            isWorking ||
            !canDeleteAll ||
            trackAsyncJob?.hasKind?.("exit_delete")
          }
          loading={isWorking}
        >
          {isWorking ? "Eliminando…" : "Eliminar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
