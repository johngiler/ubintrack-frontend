"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Modal, Button, Form, Alert, Row, Col } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { completeEntry } from "@/services/orderService";

const ModalComplete = ({ show, onHide, entry, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isPiso = entry?.in_type?.toLowerCase() === "piso";
  const binsCount = entry?.bins_count || 0;

  const [formData, setFormData] = useState({
    total_restibas: 0,
    total_wraps: 0,
    total_added_pallets: 0,
  });

  useEffect(() => {
    if (entry) {
      if (isPiso) {
        setFormData({
          total_restibas: binsCount,
          total_wraps: binsCount,
          total_added_pallets: binsCount,
        });
      } else {
        setFormData({
          total_restibas: "",
          total_wraps: "",
          total_added_pallets: "",
        });
      }
    }
  }, [entry, isPiso, binsCount]);

  const handleRestibaChange = (value) => {
    const restiba = value === "" ? "" : parseInt(value, 10) || 0;
    setFormData({
      ...formData,
      total_restibas: restiba,
      total_wraps: restiba,
      total_added_pallets: restiba,
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const dataToSend = {
        total_restibas: formData.total_restibas === "" ? 0 : formData.total_restibas,
        total_wraps: formData.total_wraps === "" ? 0 : formData.total_wraps,
        total_added_pallets:
          formData.total_added_pallets === "" ? 0 : formData.total_added_pallets,
      };
      const result = await completeEntry(entry.id, dataToSend);
      await onComplete(result);
      onHide();
    } catch (err) {
      console.error("Error al completar entrada:", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Error al completar la entrada",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entry) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <div>
          <Modal.Title>Completar entrada</Modal.Title>
          {entry.code ? (
            <Modal.Subtitle>
              Código:{" "}
              <span className="font-medium text-[var(--foreground)]">{entry.code}</span>
            </Modal.Subtitle>
          ) : null}
        </div>
      </Modal.Header>

      <Modal.Body>
        {error ? (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        ) : null}

        <Modal.Section title="Datos de la entrada" className="!p-3.5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Tipo</dt>
              <dd className="mt-0.5">
                <Badge variant={isPiso ? "warning" : "info"} dot={false}>
                  {isPiso ? "Piso" : "Paletizado"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Total bins</dt>
              <dd className="mt-0.5">
                <Badge variant="secondary" dot={false}>
                  {binsCount}
                </Badge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Cliente</dt>
              <dd className="text-sm font-medium text-slate-900">
                {entry.client?.name || "—"}
              </dd>
            </div>
          </dl>
        </Modal.Section>

        <div
          className={`mb-4 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
            isPiso
              ? "border-sky-200 bg-sky-50 text-sky-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {isPiso ? (
            <>
              <p className="font-semibold">Entrada a piso</p>
              <p className="mt-1">
                Restiba y Wrap/Strech se calculan automáticamente ({binsCount} bins).
                Solo puede modificar Pallet adicional.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Entrada paletizada</p>
              <p className="mt-1">
                Indique la cantidad de restibas. Wrap/Strech será igual a las restibas.
              </p>
            </>
          )}
        </div>

        <Modal.Section title="Servicios" className="!p-3.5">
          <Row className="g-3">
            <Col md={4}>
              <Form.Group className="mb-0">
                <Form.Label className="!text-xs !font-medium !text-slate-600">
                  Restiba
                  {isPiso ? (
                    <Badge variant="secondary" dot={false} className="ms-1.5 !py-0 text-[10px]">
                      Auto
                    </Badge>
                  ) : null}
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min="0"
                  value={formData.total_restibas}
                  placeholder="0"
                  onChange={(e) =>
                    isPiso ? null : handleRestibaChange(e.target.value)
                  }
                  disabled={isPiso}
                  readOnly={isPiso}
                />
                {!isPiso ? (
                  <Form.Text className="!mt-1.5 block text-xs text-slate-500">
                    Cantidad de restibas realizadas
                  </Form.Text>
                ) : null}
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-0">
                <Form.Label className="!text-xs !font-medium !text-slate-600">
                  Wrap/Strech
                  <Badge variant="secondary" dot={false} className="ms-1.5 !py-0 text-[10px]">
                    Auto
                  </Badge>
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min="0"
                  value={formData.total_wraps}
                  placeholder="0"
                  disabled
                  readOnly
                />
                <Form.Text className="!mt-1.5 block text-xs text-slate-500">
                  {isPiso ? "= Total bins" : "= Restibas"}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-0">
                <Form.Label className="!text-xs !font-medium !text-slate-600">
                  Pallet adicional
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min="0"
                  value={formData.total_added_pallets}
                  placeholder="0"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_added_pallets:
                        e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
                <Form.Text className="!mt-1.5 block text-xs text-slate-500">
                  = Restiba (editable)
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Section>

        <Modal.Section title="Resumen de servicios" className="!p-3.5">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Restiba</dt>
              <dd className="font-semibold text-slate-900">
                {formData.total_restibas || 0} unidades
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Wrap/Strech</dt>
              <dd className="font-semibold text-slate-900">
                {formData.total_wraps || 0} unidades
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Pallet adicional</dt>
              <dd className="font-semibold text-slate-900">
                {formData.total_added_pallets || 0} unidades
              </dd>
            </div>
          </dl>
        </Modal.Section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={Check}
          onClick={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? "Completando…" : "Completar entrada"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalComplete;
