"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { bulkUpdatePositionFlags } from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";

const UNCHANGED = "";

const triOptions = [
  { value: UNCHANGED, label: "Sin cambio" },
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

const activeOptions = [
  { value: UNCHANGED, label: "Sin cambio" },
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

function parseTri(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function ModalBulkFlags({
  show,
  onHide,
  positionIds = [],
  onSaved,
  showAlert,
}) {
  const [is_active, setIsActive] = useState(UNCHANGED);
  const [is_picking, setIsPicking] = useState(UNCHANGED);
  const [is_push, setIsPush] = useState(UNCHANGED);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setIsActive(UNCHANGED);
    setIsPicking(UNCHANGED);
    setIsPush(UNCHANGED);
    setFormError(null);
    setIsSaving(false);
  }, [show]);

  const flagsPayload = useMemo(() => {
    const payload = {};
    const active = parseTri(is_active);
    const picking = parseTri(is_picking);
    const push = parseTri(is_push);
    if (typeof active === "boolean") payload.is_active = active;
    if (typeof picking === "boolean") payload.is_picking = picking;
    if (typeof push === "boolean") payload.is_push = push;
    return payload;
  }, [is_active, is_picking, is_push]);

  const hasChanges = Object.keys(flagsPayload).length > 0;

  const clientError = useMemo(() => {
    const { is_active: active, is_picking: picking, is_push: push } = flagsPayload;
    if (active === false && (picking === true || push === true)) {
      return "Inactiva no puede ser push ni picking.";
    }
    if (picking === true && push === true) {
      return "Push y picking no pueden activarse a la vez.";
    }
    return null;
  }, [flagsPayload]);

  const handleActiveChange = (value) => {
    setFormError(null);
    setIsActive(value);
    if (value === "false") {
      // Inactivo apaga push/picking en el payload.
      if (is_picking === "true") setIsPicking("false");
      if (is_push === "true") setIsPush("false");
    }
  };

  const handlePickingChange = (value) => {
    setFormError(null);
    setIsPicking(value);
    if (value === "true") {
      if (is_active === "false") setIsActive("true");
      if (is_push === "true") setIsPush("false");
    }
  };

  const handlePushChange = (value) => {
    setFormError(null);
    setIsPush(value);
    if (value === "true") {
      if (is_active === "false") setIsActive("true");
      if (is_picking === "true") setIsPicking("false");
    }
  };

  const handleSave = async () => {
    if (!positionIds.length) return;
    if (!hasChanges) {
      setFormError("Indique al menos un cambio.");
      return;
    }
    if (clientError) {
      setFormError(clientError);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const result = await bulkUpdatePositionFlags(positionIds, flagsPayload);
      await onSaved?.();
      onHide();
      showAlert?.("success", result?.message || "Posiciones actualizadas");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No se pudo completar la operación."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Cambiar flags ({positionIds.length})</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        <Form>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group className="mb-0">
                <Form.Label>Estado</Form.Label>
                <Select
                  size="sm"
                  aria-label="Estado masivo"
                  options={activeOptions}
                  value={is_active}
                  onChange={(e) => handleActiveChange(e.target.value || UNCHANGED)}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-0">
                <Form.Label>Picking</Form.Label>
                <Select
                  size="sm"
                  aria-label="Picking masivo"
                  options={triOptions}
                  value={is_picking}
                  onChange={(e) => handlePickingChange(e.target.value || UNCHANGED)}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-0">
                <Form.Label>Push (conducto)</Form.Label>
                <Select
                  size="sm"
                  aria-label="Push masivo"
                  options={triOptions}
                  value={is_push}
                  onChange={(e) => handlePushChange(e.target.value || UNCHANGED)}
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
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={Save}
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          loading={isSaving}
        >
          {isSaving ? "Aplicando…" : "Aplicar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
