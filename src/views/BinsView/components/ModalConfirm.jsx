"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkDeleteBins, deleteBin } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalConfirm({
  show,
  onHide,
  bin,
  binIds,
  onDelete,
  showAlert,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const fromSelection = Array.isArray(binIds) && binIds.length > 0;
  const ids = fromSelection ? binIds : bin?.id ? [bin.id] : [];
  const isBulk = fromSelection;

  async function handleDelete() {
    if (!ids.length) return;
    setFormError("");
    setIsDeleting(true);
    try {
      if (isBulk) {
        const result = await bulkDeleteBins(ids);
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
        await deleteBin(ids[0]);
        await onDelete?.();
        onHide();
        showAlert?.("success", "Bin eliminado");
      }
    } catch (error) {
      const msg = getApiErrorMessage(
        error,
        isBulk ? "No se pudo completar la operación." : "No se pudo eliminar el bin.",
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
            ¿Eliminar <strong>{ids.length}</strong> bins seleccionados? No se borran
            los que tengan salidas asociadas.
          </>
        ) : (
          <>
            ¿Eliminar el bin <strong>{bin?.code}</strong>?
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
