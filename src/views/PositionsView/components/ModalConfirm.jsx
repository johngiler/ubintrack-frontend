"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkDeletePositions, deletePosition } from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalConfirm({
  show,
  onHide,
  position,
  positionIds,
  onDelete,
  showAlert,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const fromSelection = Array.isArray(positionIds) && positionIds.length > 0;
  const ids = fromSelection
    ? positionIds
    : position?.id
      ? [position.id]
      : [];
  const isBulk = fromSelection;

  async function handleDelete() {
    if (!ids.length) return;
    setFormError("");
    setIsDeleting(true);
    try {
      if (isBulk) {
        const result = await bulkDeletePositions(ids);
        followBulkJob(result, {
          showAlert,
          onFinished: (job) => {
            if (job?.status === "failed" || job?.success === false) return;
            void onDelete?.();
          },
        });
        onHide();
        if (isBulkJobOpen(result)) void onDelete?.();
      } else {
        await deletePosition(ids[0]);
        await onDelete?.();
        onHide();
        showAlert?.("success", "Posición eliminada");
      }
    } catch (error) {
      const msg = getApiErrorMessage(
        error,
        isBulk
          ? "No se pudo completar la operación."
          : "No se pudo eliminar la posición.",
      );
      if (isBulk) {
        setFormError(msg);
      } else {
        showAlert?.("danger", msg);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          {isBulk ? "Confirmar eliminación masiva" : "Confirmar eliminación"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        {isBulk ? (
          <>
            ¿Eliminar <strong>{ids.length}</strong> posiciones seleccionadas? Solo se
            borran las que estén libres.
          </>
        ) : (
          <>
            ¿Eliminar la posición <strong>{position?.code}</strong>?
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={handleDelete}
          disabled={isDeleting}
          loading={isDeleting}
        >
          {isDeleting ? "Eliminando…" : "Eliminar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
