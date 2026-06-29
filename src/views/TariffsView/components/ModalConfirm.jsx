"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { deleteTariff } from "@/services/financeService";

export default function ModalConfirm({ show, onHide, tariff, onDelete, showAlert }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTariff(tariff.id);
      await onDelete();
      onHide();
      showAlert("success", "Tarifa eliminada correctamente");
    } catch {
      showAlert("danger", "Error al eliminar la tarifa");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Confirmar eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        ¿Está seguro que desea eliminar la tarifa <strong>{tariff?.name}</strong>?
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
