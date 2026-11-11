"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkRegeneratePositionTags } from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalBulkRegenerate({
  show,
  onHide,
  positionIds = [],
  onDone,
  showAlert,
  trackAsyncJob,
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleConfirm() {
    if (!positionIds.length) return;
    setFormError("");
    setIsWorking(true);
    try {
      const result = await bulkRegeneratePositionTags(positionIds);
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
        <Modal.Title>Regenerar etiquetas</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        ¿Regenerar QR de <strong>{positionIds.length}</strong> posiciones seleccionadas?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isWorking}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={RefreshCw}
          onClick={handleConfirm}
          disabled={isWorking}
          loading={isWorking}
        >
          {isWorking ? "Regenerando…" : "Regenerar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
