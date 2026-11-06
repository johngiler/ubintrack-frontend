"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { createPosition, updatePosition, getCavas } from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";
import { cavaTitleOf, statusLabels } from "../positionLabels";

const EMPTY_POSITION = {
  cava_id: "",
  hall: "",
  rack: "",
  level: 1,
  place: "",
  status: "libre",
  is_active: true,
  is_picking: false,
  is_push: false,
};

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function ModalEdit({ show, onHide, position, mode, onSave, showAlert }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_POSITION);
  const [cavas, setCavas] = useState([]);
  const [isLoadingCavas, setIsLoadingCavas] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [formError, setFormError] = useState(null);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setIsLoadingCavas(true);

    getCavas(1, "", 200)
      .then((response) => {
        if (cancelled) return;
        setCavas(response.results || []);
      })
      .catch(() => {
        if (!cancelled) setCavas([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCavas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(() => {
    if (position) {
      setFormData({
        ...position,
        cava_id: position.cava?.id ?? position.cava_id ?? "",
        rack: position.rack != null ? String(position.rack) : "",
        level: position.level ?? 1,
        is_active: position.is_active !== false,
        is_picking: Boolean(position.is_picking),
        is_push: Boolean(position.is_push),
      });
    } else {
      setFormData(EMPTY_POSITION);
    }
    if (!show) {
      setShowValidation(false);
      setFormError(null);
    }
  }, [position, show]);

  const handleSave = async () => {
    const cavaMissing = !formData.cava_id;
    const rackMissing = isBlank(formData.rack);
    const placeMissing = isBlank(formData.place);
    const levelMissing = formData.level == null || formData.level === "";

    if (cavaMissing || rackMissing || placeMissing || levelMissing) {
      setShowValidation(true);
      setFormError("Complete cava, rack, nivel y profundidad.");
      return;
    }

    setShowValidation(false);
    setFormError(null);
    setIsSaving(true);
    try {
      const payload = {
        cava_id: Number(formData.cava_id),
        hall: String(formData.hall || "").trim(),
        rack: String(formData.rack).trim(),
        level: Number(formData.level),
        place: String(formData.place).trim(),
        status: formData.status || "libre",
        is_active: Boolean(formData.is_active),
        is_picking: Boolean(formData.is_picking),
        is_push: Boolean(formData.is_push),
      };

      if (formData.id) {
        await updatePosition(formData.id, payload);
      } else {
        await createPosition(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Posición guardada correctamente");
    } catch (err) {
      const fieldPush = err?.response?.data?.is_push;
      const apiMsg = Array.isArray(fieldPush)
        ? fieldPush[0]
        : typeof fieldPush === "string"
          ? fieldPush
          : getApiErrorMessage(err, "Error al guardar la posición");
      setFormError(apiMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly
    ? "Ver posición"
    : formData?.id
      ? "Editar posición"
      : "Nueva posición";

  const cavaMissing = showValidation && !formData.cava_id;
  const rackMissing = showValidation && isBlank(formData.rack);
  const placeMissing = showValidation && isBlank(formData.place);
  const levelMissing = showValidation && (formData.level == null || formData.level === "");

  const cavaOptions = cavas.map((cava) => ({
    value: String(cava.id),
    label: `${cavaTitleOf(cava.name, cava.code)} (${cava.condition}) - ${cava.storage?.name ?? ""}`,
  }));

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setFormError(null)}
            className="mb-3"
          >
            {formError}
          </Alert>
        ) : null}
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="gap-y-3">
            {readOnly && formData.code && (
              <Col md={6}>
                <Form.Group className="mb-0">
                  <Form.Label>Código</Form.Label>
                  <Form.Control value={formData.code} readOnly />
                </Form.Group>
              </Col>
            )}

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Cava <span className="text-red-500">*</span>
                </Form.Label>
                {readOnly ? (
                  <Form.Control
                    value={
                      formData.cava
                        ? `${cavaTitleOf(formData.cava.name, formData.cava.code)} (${formData.cava.condition})`
                        : "—"
                    }
                    readOnly
                  />
                ) : (
                  <Select
                    id="position-cava"
                    value={formData.cava_id ? String(formData.cava_id) : ""}
                    isDisabled={isLoadingCavas}
                    isInvalid={cavaMissing}
                    placeholder={
                      isLoadingCavas ? "Cargando cavas…" : "Seleccione una cava"
                    }
                    options={[
                      { value: "", label: "Seleccione una cava" },
                      ...cavaOptions,
                    ]}
                    onChange={(e) =>
                      setFormData({ ...formData, cava_id: e.target.value || "" })
                    }
                  />
                )}
                {cavaMissing && (
                  <Form.Text className="text-danger">Seleccione una cava.</Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Estado</Form.Label>
                {readOnly ? (
                  <Form.Control value={statusLabels[formData.status] || formData.status} readOnly />
                ) : (
                  <Select
                    id="position-status"
                    value={formData.status || "libre"}
                    options={Object.entries(statusLabels).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  />
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Pasillo</Form.Label>
                <Form.Control
                  value={formData.hall || ""}
                  readOnly={readOnly}
                  placeholder="1"
                  onChange={(e) => setFormData({ ...formData, hall: e.target.value })}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Rack <span className="text-red-500">*</span>
                </Form.Label>
                <Form.Control
                  value={formData.rack || ""}
                  readOnly={readOnly}
                  isInvalid={rackMissing}
                  placeholder="1"
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                />
                {rackMissing && (
                  <Form.Text className="text-danger">Indique el rack.</Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Nivel <span className="text-red-500">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={formData.level ?? ""}
                  readOnly={readOnly}
                  isInvalid={levelMissing}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                />
                {levelMissing && (
                  <Form.Text className="text-danger">Indique el nivel.</Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Profundidad <span className="text-red-500">*</span>
                </Form.Label>
                <Form.Control
                  value={formData.place || ""}
                  readOnly={readOnly}
                  isInvalid={placeMissing}
                  placeholder="A"
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                />
                {placeMissing && (
                  <Form.Text className="text-danger">Indique la profundidad.</Form.Text>
                )}
              </Form.Group>
            </Col>

            {readOnly && formData.qr_code_image && (
              <Col md={12}>
                <Form.Group className="mb-0">
                  <Form.Label>Código QR</Form.Label>
                  <div className="text-center">
                    <img
                      src={formData.qr_code_image}
                      alt={`QR ${formData.code}`}
                      className="mx-auto max-w-[200px] rounded-lg border border-slate-200"
                    />
                  </div>
                </Form.Group>
              </Col>
            )}

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Estado</Form.Label>
                <Form.Check
                  type="switch"
                  id="position-is-active"
                  label={formData.is_active ? "Activo" : "Inactivo"}
                  checked={Boolean(formData.is_active)}
                  disabled={readOnly}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Picking</Form.Label>
                <Form.Check
                  type="switch"
                  id="position-is-picking"
                  label={formData.is_picking ? "Sí" : "No"}
                  checked={Boolean(formData.is_picking)}
                  disabled={readOnly}
                  onChange={(e) => setFormData({ ...formData, is_picking: e.target.checked })}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Push (conducto)</Form.Label>
                <Form.Check
                  type="switch"
                  id="position-is-push"
                  label={formData.is_push ? "Sí" : "No"}
                  checked={Boolean(formData.is_push)}
                  disabled={readOnly}
                  onChange={(e) => {
                    setFormError(null);
                    setFormData({ ...formData, is_push: e.target.checked });
                  }}
                />
                <Form.Text className="text-muted">
                  Requiere profundidad de al menos 5. Aplica a todo el conducto.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          Cerrar
        </Button>
        {isEditMode && (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
