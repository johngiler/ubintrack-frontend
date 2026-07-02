"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { deleteTaskTracking } from "@/services/taskService";

export default function ModalConfirm({ show, onHide, tracking, onDelete, showAlert }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTaskTracking(tracking.id);
      await onDelete();
      onHide();
      showAlert("success", "Seguimiento eliminado correctamente");
    } catch {
      showAlert("danger", "Error al eliminar el seguimiento");
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
        ¿Está seguro que desea eliminar el seguimiento de la tarea{" "}
        <strong>{tracking?.task?.code}</strong>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button variant="danger" icon={Trash2} onClick={handleDelete} disabled={isDeleting} loading={isDeleting}>
          {isDeleting ? "Eliminando…" : "Eliminar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
