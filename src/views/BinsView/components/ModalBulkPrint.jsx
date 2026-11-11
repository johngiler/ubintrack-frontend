"use client";

import { useState } from "react";
import { Printer, X } from "lucide-react";

import { Modal, Button, Alert } from "@/components/ui/bootstrap";
import { bulkPrintBins } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";
import { followBulkJob, isBulkJobOpen } from "@/lib/bulkJobs";

export default function ModalBulkPrint({
  show,
  onHide,
  binIds = [],
  onPrinted,
  showAlert,
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handlePrint() {
    if (!binIds.length) return;
    setFormError("");
    setIsPrinting(true);
    try {
      const result = await bulkPrintBins(binIds);
      followBulkJob(result, {
        showAlert,
        onFinished: (job) => {
          if (job?.status === "failed" || job?.success === false) return;
          void onPrinted?.();
        },
      });
      onHide();
      if (isBulkJobOpen(result)) void onPrinted?.();
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, "No se pudo completar la operación."),
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
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
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
