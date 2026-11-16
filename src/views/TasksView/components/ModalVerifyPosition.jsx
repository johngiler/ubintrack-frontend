"use client";

import { useEffect, useState } from "react";
import { ScanBarcode, X } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import { getApiErrorMessage } from "@/services/httpClient";
import { verifyTaskPosition } from "@/services/taskService";

function normalizeCode(raw) {
  let text = String(raw || "").trim();
  if (!text) return "";
  if (text.includes("/")) {
    text = text.replace(/\/+$/, "").split("/").pop() || text;
  }
  return text.trim();
}

export default function ModalVerifyPosition({
  show,
  onHide,
  taskId,
  lineId = null,
  expectedCode = "",
  onVerified,
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const expected = normalizeCode(expectedCode);

  useEffect(() => {
    if (!show) return;
    setCode("");
    setError("");
    setBusy(false);
    setCameraOn(true);
  }, [show, lineId, expectedCode]);

  const submit = async (raw) => {
    const value = normalizeCode(raw);
    if (!value || !taskId) return;
    if (expected && value.toLowerCase() !== expected.toLowerCase()) {
      setError("El código no coincide con esta posición.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await verifyTaskPosition(taskId, value, { lineId });
      onVerified?.(data);
      onHide?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo verificar la posición."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Verificar posición</Modal.Title>
      </Modal.Header>
      <Modal.Body className="space-y-3">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <p className="mb-0 text-sm text-slate-600">
          {expected
            ? `Escanee el QR de ${expected} o escriba ese código.`
            : "Escanee el QR de la posición o escriba el código."}
        </p>
        {expected ? (
          <p className="mb-0 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
            {expected}
          </p>
        ) : null}
        {cameraOn ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Scanner
              onScan={(results) => {
                const text = results?.[0]?.rawValue;
                if (text && !busy) void submit(text);
              }}
              onError={() => setCameraOn(false)}
              constraints={{ facingMode: "environment" }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Cámara no disponible. Use el código manual.</p>
        )}
        <Form.Group className="mb-0">
          <Form.Label className="!text-xs">Código de posición</Form.Label>
          <Form.Control
            value={code}
            disabled={busy}
            placeholder={expected || "Ej. C9-P1-R1-N1"}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit(code);
              }
            }}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={ScanBarcode}
          loading={busy}
          disabled={busy || !code.trim()}
          onClick={() => void submit(code)}
        >
          Verificar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
