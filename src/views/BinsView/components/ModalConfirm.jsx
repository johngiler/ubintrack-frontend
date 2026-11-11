"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { bulkDeleteBins, deleteBin } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";

export default function ModalConfirm({
  show,
  onHide,
  bin,
  binIds,
  onDelete,
  showAlert,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const fromSelection = Array.isArray(binIds) && binIds.length > 0;
  const ids = fromSelection ? binIds : bin?.id ? [bin.id] : [];
  const isBulk = fromSelection;

  async function handleDelete() {
    if (!ids.length) return;
    setIsDeleting(true);
    try {
      if (isBulk) {
        const result = await bulkDeleteBins(ids);
        await onDelete?.();
        onHide();
        showAlert?.("success", result?.message || "Bins eliminados");
      } else {
        await deleteBin(ids[0]);
        await onDelete?.();
        onHide();
        showAlert?.("success", "Bin eliminado correctamente");
      }
    } catch (error) {
      showAlert?.(
        "danger",
        getApiErrorMessage(
          error,
          isBulk ? "Error al eliminar los bins" : "Error al eliminar el bin",
        ),
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
            ¿Eliminar <strong>{ids.length}</strong> bins seleccionados? No se borran
            los que tengan salidas asociadas.
          </>
        ) : (
          <>
            ¿Está seguro que desea eliminar el bin <strong>{bin?.code}</strong>?
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
