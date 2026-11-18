"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkRegenerateExitPdfs } from "@/services/orderService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalBulkRegenerate({
  show,
  onHide,
  exitIds = [],
  onDone,
  showAlert,
  trackAsyncJob,
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleConfirm() {
    if (!exitIds.length) return;
    setFormError("");
    setIsWorking(true);
    try {
      const result = await bulkRegenerateExitPdfs(exitIds);
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
        <Modal.Title>Regenerar pdfs</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        ¿Regenerar el PDF de <strong>{exitIds.length}</strong>{" "}
        {exitIds.length === 1 ? "salida seleccionada" : "salidas seleccionadas"}?
        Solo se regeneran las completadas.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isWorking}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={FileText}
          onClick={handleConfirm}
          disabled={
            isWorking || trackAsyncJob?.hasKind?.("exit_regenerate_pdfs")
          }
          loading={isWorking}
        >
          {isWorking ? "Regenerando…" : "Regenerar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
