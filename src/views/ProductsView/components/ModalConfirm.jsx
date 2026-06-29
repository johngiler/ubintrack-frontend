"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { deleteProduct } from "@/services/inventoryService";

export default function ModalConfirm({ show, onHide, product, onDelete, showAlert }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      await onDelete();
      onHide();
      showAlert("success", "Producto eliminado correctamente");
    } catch {
      showAlert("danger", "Error al eliminar el producto");
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
        ¿Está seguro que desea eliminar el producto{" "}
        <strong>{product?.name || product?.code}</strong>?
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
