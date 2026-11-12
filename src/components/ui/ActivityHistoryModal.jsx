"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Shell compartido para historial macro de una vista (estilo PortPax).
 */
export default function ActivityHistoryModal({
  open,
  onClose,
  title = "Historial de movimientos",
  toolbar,
  children,
}) {
  return (
    <Modal show={open} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {toolbar ? <div className="mb-4">{toolbar}</div> : null}
        <div className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain">
          {children}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
