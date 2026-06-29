"use client";

import { useState, useEffect } from "react";
import { Check, RefreshCw, ScanLine, X } from "lucide-react";
import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { Scanner } from "@yudiel/react-qr-scanner";
import { replaceExitProductBin } from "@/services/orderService";
import { formatDate } from "@/lib/format";

const ModalReplaceBin = ({
  showModal,
  handleCloseModal,
  selectedBin,
  onReplaceSuccess,
}) => {
  const [qrBinValue, setQrBinValue] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    if (showModal) {
      setQrBinValue("");
      setShowQrScanner(false);
      setValidationError("");
      setSuccessInfo(null);
      setIsProcessing(false);
    }
  }, [showModal]);

  const handleQrScan = (detectedCodes) => {
    if (detectedCodes?.length > 0) {
      setQrBinValue(detectedCodes[0].rawValue);
      setShowQrScanner(false);
      setValidationError("");
    }
  };

  const validateBinCode = () => {
    if (!qrBinValue?.trim()) {
      setValidationError("Debe escanear o ingresar el código del nuevo bin");
      return false;
    }

    if (qrBinValue.trim().toUpperCase() === selectedBin?.bin_code?.toUpperCase()) {
      setValidationError(
        "El código ingresado es el mismo bin actual. Seleccione un bin diferente.",
      );
      return false;
    }

    return true;
  };

  const handleReplace = async () => {
    if (!validateBinCode()) return;

    setIsProcessing(true);
    setValidationError("");
    setSuccessInfo(null);

    try {
      const result = await replaceExitProductBin(selectedBin.id, qrBinValue.trim());

      if (!result.success) {
        throw new Error(result.message || "Error al reemplazar el bin");
      }

      setSuccessInfo(result.data || result);

      setTimeout(() => {
        onReplaceSuccess?.();
        handleCloseModalWithReset();
      }, 2000);
    } catch (error) {
      console.error("Error al reemplazar bin:", error);
      setValidationError(
        error.message || "Error al reemplazar el bin. Intente nuevamente.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModalWithReset = () => {
    setQrBinValue("");
    setShowQrScanner(false);
    setValidationError("");
    setSuccessInfo(null);
    setIsProcessing(false);
    handleCloseModal();
  };

  return (
    <>
      <Modal
        show={showModal}
        onHide={handleCloseModalWithReset}
        centered
        size="md"
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <div>
            <Modal.Title>Reemplazar bin</Modal.Title>
            {selectedBin?.bin_code ? (
              <Modal.Subtitle>
                Bin actual:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {selectedBin.bin_code}
                </span>
              </Modal.Subtitle>
            ) : null}
          </div>
        </Modal.Header>

        <Modal.Body>
          {validationError ? (
            <Alert variant="danger" className="mb-3">
              {validationError}
            </Alert>
          ) : null}

          {successInfo ? (
            <Alert variant="success" className="mb-3">
              <p className="font-semibold">
                {successInfo.merged
                  ? "Cantidades fusionadas exitosamente"
                  : "Bin reemplazado exitosamente"}
              </p>
              <dl className="mt-2 space-y-1 text-xs">
                <div>
                  <span className="text-emerald-800/70">Bin anterior: </span>
                  <span className="font-medium">{successInfo.original_bin_code}</span>
                </div>
                <div>
                  <span className="text-emerald-800/70">Nuevo bin: </span>
                  <span className="font-medium">{successInfo.new_bin_code}</span>
                </div>
                {successInfo.merged ? (
                  <>
                    <div>
                      <span className="text-emerald-800/70">Cantidad agregada: </span>
                      <span className="font-medium">
                        {successInfo.quantity_added} {selectedBin?.product_uom}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-800/70">Total asignado: </span>
                      <span className="font-medium">
                        {successInfo.new_total_assigned} {selectedBin?.product_uom}
                      </span>
                    </div>
                  </>
                ) : null}
                {successInfo.new_bin_position ? (
                  <div>
                    <span className="text-emerald-800/70">Nueva posición: </span>
                    <span className="font-medium">{successInfo.new_bin_position}</span>
                  </div>
                ) : null}
              </dl>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {successInfo.same_batch ? (
                  <Badge variant="success" dot={false}>
                    Mismo lote
                  </Badge>
                ) : null}
                {successInfo.merged ? (
                  <Badge variant="info" dot={false}>
                    Fusionado
                  </Badge>
                ) : null}
              </div>
            </Alert>
          ) : null}

          <Modal.Section title="Bin actual a reemplazar" className="!p-3.5">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Código</dt>
                <dd className="text-sm font-semibold text-sky-600">{selectedBin?.bin_code || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Posición</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {selectedBin?.position || "Sin posición"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Cantidad requerida</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {selectedBin?.quantity} {selectedBin?.product_uom || ""}
                </dd>
              </div>
              {selectedBin?.batch ? (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Lote</dt>
                  <dd className="text-sm font-medium text-slate-900">{selectedBin.batch}</dd>
                </div>
              ) : null}
              {selectedBin?.expiration_date ? (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Vence</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {formatDate(selectedBin.expiration_date)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {selectedBin?.has_stock_conflict ? (
              <Badge variant="warning" dot={false} className="mt-2.5">
                Conflicto de stock
              </Badge>
            ) : null}
          </Modal.Section>

          <Modal.Section title="Escanear nuevo bin" className="!p-3.5">
            <Form.Group controlId="new-bin-code" className="mb-0">
              <Form.Label className="!text-xs !font-medium !text-slate-600">
                Código del nuevo bin
              </Form.Label>
              <div className="flex items-center gap-2">
                <Form.Control
                  type="text"
                  size="sm"
                  value={qrBinValue}
                  onChange={(e) => {
                    setQrBinValue(e.target.value);
                    setValidationError("");
                  }}
                  placeholder="BIN-0000001234"
                  disabled={isProcessing || successInfo}
                  className="font-mono text-sm"
                />
                <IconButton
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 text-sky-600 hover:bg-sky-50"
                  onClick={() => setShowQrScanner(true)}
                  title="Escanear QR del bin"
                  aria-label="Escanear QR del bin"
                  disabled={isProcessing || successInfo}
                >
                  <ScanLine className="h-4 w-4" />
                </IconButton>
                {qrBinValue ? (
                  <Check className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Código ingresado" />
                ) : null}
              </div>
              <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                Escanee el QR del nuevo bin o ingrese el código manualmente. Debe tener el
                mismo producto y cantidad suficiente disponible.
              </Form.Text>
            </Form.Group>
          </Modal.Section>

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
            <p className="font-semibold">Validación automática del nuevo bin</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 leading-relaxed">
              <li>Mismo cliente ({selectedBin?.client_name || "—"})</li>
              <li>Mismo producto (SKU: {selectedBin?.product_sku || "—"})</li>
              <li>Cantidad disponible suficiente</li>
              <li>Estado almacenado y activo</li>
            </ul>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={handleCloseModalWithReset}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={handleReplace}
            disabled={isProcessing || !qrBinValue?.trim() || successInfo}
            loading={isProcessing}
          >
            {isProcessing ? "Reemplazando…" : "Reemplazar bin"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showQrScanner}
        onHide={() => setShowQrScanner(false)}
        centered
        size="lg"
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Escanear QR del nuevo bin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mx-auto h-[300px] w-full max-w-[400px]">
            <Scanner
              onScan={handleQrScan}
              onError={(error) => console.error("Error al escanear QR:", error)}
              constraints={{ facingMode: "environment" }}
              styles={{ container: { width: "100%", height: "100%" } }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Apunte la cámara al código QR del nuevo bin
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" icon={X} onClick={() => setShowQrScanner(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalReplaceBin;
