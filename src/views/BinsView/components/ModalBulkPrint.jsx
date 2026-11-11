"use client";

import { useState } from "react";
import { Printer, X } from "lucide-react";

import { Modal, Button } from "@/components/ui/bootstrap";
import { bulkPrintBins } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";

export default function ModalBulkPrint({
  show,
  onHide,
  binIds = [],
  onPrinted,
  showAlert,
}) {
  const [isPrinting, setIsPrinting] = useState(false);

  async function handlePrint() {
    if (!binIds.length) return;
    setIsPrinting(true);
    try {
      const result = await bulkPrintBins(binIds);
      await onPrinted?.();
      onHide();
      showAlert?.("success", result?.message || "Etiquetas enviadas a impresión");
    } catch (error) {
      showAlert?.(
        "danger",
        getApiErrorMessage(error, "Error al imprimir las etiquetas"),
      );
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Confirmar impresión</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        ¿Imprimir etiquetas de <strong>{binIds.length}</strong> bins seleccionados?
        Los que no tengan etiqueta se omitirán.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isPrinting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={Printer}
          onClick={handlePrint}
          disabled={isPrinting}
          loading={isPrinting}
        >
          {isPrinting ? "Imprimiendo…" : "Imprimir"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
