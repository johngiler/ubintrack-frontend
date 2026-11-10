"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { bulkDeletePositions, deletePosition } from "@/services/storageService";

export default function ModalConfirm({
  show,
  onHide,
  position,
  positionIds,
  onDelete,
  showAlert,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const fromSelection = Array.isArray(positionIds) && positionIds.length > 0;
  const ids = fromSelection
    ? positionIds
    : position?.id
      ? [position.id]
      : [];
  const isBulk = fromSelection;

  async function handleDelete() {
    if (!ids.length) return;
    setIsDeleting(true);
    try {
      if (isBulk) {
        const result = await bulkDeletePositions(ids);
        await onDelete();
        onHide();
        showAlert("success", result?.message || "Posiciones eliminadas");
      } else {
        await deletePosition(ids[0]);
        await onDelete();
        onHide();
        showAlert("success", "Posición eliminada correctamente");
      }
    } catch {
      showAlert(
        "danger",
        isBulk ? "Error al eliminar las posiciones" : "Error al eliminar la posición",
      );
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
        {isBulk ? (
          <>
            ¿Eliminar <strong>{ids.length}</strong> posiciones seleccionadas? Solo se
            borran las que estén libres.
          </>
        ) : (
          <>
            ¿Está seguro que desea eliminar la posición{" "}
            <strong>{position?.code}</strong>?
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
