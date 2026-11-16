"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { formatDocumentCode } from "@/lib/format";
import { deleteTask } from "@/services/taskService";

export default function ModalConfirm({ show, onHide, task, onDelete, showAlert }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      await onDelete();
      onHide();
    } catch {
      showAlert?.("danger", "No se pudo eliminar la tarea.");
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
        ¿Está seguro que desea eliminar la tarea{" "}
        <strong>{formatDocumentCode(task?.code)}</strong>?
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
