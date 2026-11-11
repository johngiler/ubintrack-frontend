"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Alert } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { bulkUpdateBinFlags } from "@/services/inventoryService";
import { getApiErrorMessage } from "@/services/httpClient";

const UNCHANGED = "";

const activeOptions = [
  { value: UNCHANGED, label: "Sin cambio" },
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

export default function ModalBulkActive({
  show,
  onHide,
  binIds = [],
  onSaved,
  showAlert,
}) {
  const [is_active, setIsActive] = useState(UNCHANGED);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setIsActive(UNCHANGED);
    setFormError(null);
    setIsSaving(false);
  }, [show]);

  const flagsPayload = useMemo(() => {
    if (is_active === "true") return { is_active: true };
    if (is_active === "false") return { is_active: false };
    return {};
  }, [is_active]);

  const hasChanges = Object.keys(flagsPayload).length > 0;

  const handleSave = async () => {
    if (!binIds.length) return;
    if (!hasChanges) {
      setFormError("Indique activo o inactivo.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const result = await bulkUpdateBinFlags(binIds, flagsPayload);
      await onSaved?.();
      onHide();
      showAlert?.("success", result?.message || "Bins actualizados");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No se pudo completar la operación."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Activar / desactivar ({binIds.length})</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}
        <Form.Group className="mb-0">
          <Form.Label>Estado</Form.Label>
          <Select
            size="sm"
            aria-label="Estado activo masivo"
            options={activeOptions}
            value={is_active}
            onChange={(e) => {
              setFormError(null);
              setIsActive(e.target.value || UNCHANGED);
            }}
          />
        </Form.Group>
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
