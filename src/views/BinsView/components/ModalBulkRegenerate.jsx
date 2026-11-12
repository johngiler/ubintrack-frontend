"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkRegenerateBinTags } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalBulkRegenerate({
  show,
  onHide,
  binIds = [],
  onDone,
  showAlert,
  trackAsyncJob,
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleConfirm() {
    if (!binIds.length) return;
    setFormError("");
    setIsWorking(true);
    try {
      const result = await bulkRegenerateBinTags(binIds);
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
        ¿Regenerar etiquetas de <strong>{binIds.length}</strong> bins seleccionados?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isWorking}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={RefreshCw}
          onClick={handleConfirm}
          disabled={
            isWorking || trackAsyncJob?.hasKind?.("bin_regenerate_tags")
          }
          loading={isWorking}
        >
          {isWorking ? "Regenerando…" : "Regenerar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
