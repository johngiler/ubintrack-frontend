"use client";

import { useState, useEffect } from "react";
import { Check, ScanLine, X } from "lucide-react";
import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { Scanner } from "@yudiel/react-qr-scanner";
import { updateBin, getBin } from "@/services/inventoryService";
import { statusBadgeVariant, statusLabels } from "../binLabels";

const ModalQRValidation = ({
  showModal,
  handleCloseModal,
  selectedBin,
  onProcessSuccess,
}) => {
  const [qrTagValue, setQrTagValue] = useState("");
  const [qrPositionValue, setQrPositionValue] = useState("");
  const [showQrTagScanner, setShowQrTagScanner] = useState(false);
  const [showQrPositionScanner, setShowQrPositionScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [currentBin, setCurrentBin] = useState(null);
  const [isLoadingBinData, setIsLoadingBinData] = useState(false);
  const [requireQrValidation, setRequireQrValidation] = useState(true);

  useEffect(() => {
    if (showModal) {
      setQrTagValue("");
      setQrPositionValue("");
      setShowQrTagScanner(false);
      setShowQrPositionScanner(false);
      setValidationError("");
      setCurrentBin(null);
      setRequireQrValidation(true);

      if (selectedBin?.id) {
        loadBinData();
      }
    }
  }, [showModal, selectedBin?.id]);

  const loadBinData = async () => {
    setIsLoadingBinData(true);
    try {
      const binData = await getBin(selectedBin.id);
      setCurrentBin(binData);
    } catch (error) {
      console.error("Error al cargar datos del bin:", error);
      setValidationError("Error al cargar los datos del bin");
    } finally {
      setIsLoadingBinData(false);
    }
  };

  const handleQrTagScan = (detectedCodes) => {
    if (detectedCodes?.length > 0) {
      setQrTagValue(detectedCodes[0].rawValue);
      setShowQrTagScanner(false);
      setValidationError("");
    }
  };

  const handleQrPositionScan = (detectedCodes) => {
    if (detectedCodes?.length > 0) {
      setQrPositionValue(detectedCodes[0].rawValue);
      setShowQrPositionScanner(false);
      setValidationError("");
    }
  };

  const validateQRCodes = () => {
    if (!requireQrValidation) return true;

    const binCode = selectedBin?.code;
    const positionCode = selectedBin?.position?.code;

    if (!qrTagValue || !qrPositionValue) {
      setValidationError(
        "Debe escanear tanto el QR del tag como el QR de la posición",
      );
      return false;
    }

    if (qrTagValue !== binCode) {
      setValidationError(
        `El QR del tag escaneado (${qrTagValue}) no coincide con el código del bin (${binCode})`,
      );
      return false;
    }

    if (qrPositionValue !== positionCode) {
      setValidationError(
        `El QR de la posición escaneado (${qrPositionValue}) no coincide con el código de la posición (${positionCode})`,
      );
      return false;
    }

    return true;
  };

  const handleProcess = async () => {
    if (!validateQRCodes()) return;

    if (!currentBin) {
      setValidationError("No se han cargado los datos del bin");
      return;
    }

    setIsProcessing(true);
    setValidationError("");

    try {
      await updateBin(selectedBin.id, {
        entry_id: currentBin.entry.id,
        client_id: currentBin.client?.id,
        status: "almacenado",
        is_processed: true,
      });

      onProcessSuccess?.();
      handleCloseModalWithReset();
    } catch (error) {
      console.error("Error al procesar:", error);
      setValidationError(
        error.message ||
          "Error al procesar el cambio de estado del bin. Intente nuevamente.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModalWithReset = () => {
    setQrTagValue("");
    setQrPositionValue("");
    setShowQrTagScanner(false);
    setShowQrPositionScanner(false);
    setValidationError("");
    setCurrentBin(null);
    setIsLoadingBinData(false);
    setRequireQrValidation(true);
    handleCloseModal();
  };

  const productSummary =
    currentBin?.bin_products
      ?.map(
        (bep) =>
          `${bep.entry_product?.product?.name || "—"} ${bep.quantity} ${bep.entry_product?.product?.uom || ""}`.trim(),
      )
      .join(", ") || "—";

  const binStatus = selectedBin?.status || currentBin?.status || "en_recibo";

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
            <Modal.Title>Almacenar bin</Modal.Title>
            {selectedBin?.code ? (
              <Modal.Subtitle>
                Código:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {selectedBin.code}
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

          <Modal.Section title="Validación QR" className="!p-3.5">
            <Form.Group controlId="require-qr-validation" className="mb-0">
              <Form.Check
                type="checkbox"
                id="require-qr-validation-checkbox"
                label="Requerir validación QR"
                checked={requireQrValidation}
                onChange={(e) => {
                  setRequireQrValidation(e.target.checked);
                  setValidationError("");
                }}
              />
              <Form.Text className="!mt-1.5 block text-xs leading-relaxed text-slate-500">
                {requireQrValidation
                  ? "Se requiere escanear los códigos QR del tag y la posición antes de procesar."
                  : "El bin se procesará sin validación de códigos QR."}
              </Form.Text>
            </Form.Group>
          </Modal.Section>

          <Modal.Section title="Detalle del bin" className="!p-3.5">
            {isLoadingBinData ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
                Cargando datos del bin…
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Código</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {selectedBin?.code || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Estado actual</dt>
                  <dd className="mt-0.5">
                    <Badge
                      variant={statusBadgeVariant[binStatus] || "warning"}
                      dot={false}
                    >
                      {statusLabels[binStatus] || binStatus}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Posición</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {selectedBin?.position?.code || "Sin posición"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Cliente</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {selectedBin?.client?.name || currentBin?.client?.name || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Producto</dt>
                  <dd className="text-sm font-medium text-slate-900">{productSummary}</dd>
                </div>
              </dl>
            )}
          </Modal.Section>

          {requireQrValidation ? (
            <Modal.Section title="Escaneo QR" className="!p-3.5">
              <div className="space-y-3">
                <Form.Group controlId="qr-tag" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    QR de tag
                  </Form.Label>
                  <div className="flex items-center gap-2">
                    <Form.Control
                      type="text"
                      size="sm"
                      value={qrTagValue}
                      readOnly
                      placeholder={selectedBin?.code || "Código del bin"}
                      className="font-mono text-sm"
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 text-sky-600 hover:bg-sky-50"
                      onClick={() => setShowQrTagScanner(true)}
                      title="Escanear QR de tag"
                      aria-label="Escanear QR de tag"
                    >
                      <ScanLine className="h-4 w-4" />
                    </IconButton>
                    {qrTagValue ? (
                      <Check
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        aria-label="QR de tag validado"
                      />
                    ) : null}
                  </div>
                  <Form.Text className="!mt-1.5 block text-xs text-slate-500">
                    Debe coincidir con el código del bin:{" "}
                    <span className="font-medium text-slate-700">
                      {selectedBin?.code || "Sin código"}
                    </span>
                  </Form.Text>
                </Form.Group>

                <Form.Group controlId="qr-position" className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    QR de posición
                  </Form.Label>
                  <div className="flex items-center gap-2">
                    <Form.Control
                      type="text"
                      size="sm"
                      value={qrPositionValue}
                      readOnly
                      placeholder={selectedBin?.position?.code || "Código de la posición"}
                      className="font-mono text-sm"
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 text-sky-600 hover:bg-sky-50"
                      onClick={() => setShowQrPositionScanner(true)}
                      title="Escanear QR de posición"
                      aria-label="Escanear QR de posición"
                    >
                      <ScanLine className="h-4 w-4" />
                    </IconButton>
                    {qrPositionValue ? (
                      <Check
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        aria-label="QR de posición validado"
                      />
                    ) : null}
                  </div>
                  <Form.Text className="!mt-1.5 block text-xs text-slate-500">
                    Debe coincidir con el código de la posición:{" "}
                    <span className="font-medium text-slate-700">
                      {selectedBin?.position?.code || "Sin posición"}
                    </span>
                  </Form.Text>
                </Form.Group>
              </div>
            </Modal.Section>
          ) : null}
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
            onClick={handleProcess}
            disabled={
              isProcessing ||
              (requireQrValidation && (!qrTagValue || !qrPositionValue)) ||
              isLoadingBinData ||
              !currentBin
            }
            loading={isProcessing}
          >
            {isProcessing ? "Almacenando…" : "Procesar"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showQrTagScanner}
        onHide={() => setShowQrTagScanner(false)}
        centered
        size="lg"
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Escanear QR del bin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mx-auto w-full max-w-[400px]">
            <Scanner
              onScan={handleQrTagScan}
              onError={(error) => console.log(error?.message)}
              constraints={{ facingMode: "environment" }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Esperando:{" "}
            <span className="font-medium text-slate-700">
              {selectedBin?.code || "Código del bin"}
            </span>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" icon={X} onClick={() => setShowQrTagScanner(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showQrPositionScanner}
        onHide={() => setShowQrPositionScanner(false)}
        centered
        size="lg"
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Escanear QR de la posición</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mx-auto w-full max-w-[400px]">
            <Scanner
              onScan={handleQrPositionScan}
              onError={(error) => console.log(error?.message)}
              constraints={{ facingMode: "environment" }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Esperando:{" "}
            <span className="font-medium text-slate-700">
              {selectedBin?.position?.code || "Código de la posición"}
            </span>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => setShowQrPositionScanner(false)}
          >
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalQRValidation;
