"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form } from "@/components/ui/bootstrap";
import { createStorage, updateStorage } from "@/services/storageService";

const EMPTY_STORAGE = {
  name: "",
  is_active: true,
};

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function ModalEdit({ show, onHide, storage, mode, onSave, showAlert }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_STORAGE);
  const [showValidation, setShowValidation] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (storage) {
      setFormData({
        ...storage,
        is_active: storage.is_active !== false,
      });
    } else {
      setFormData(EMPTY_STORAGE);
    }
    if (!show) {
      setShowValidation(false);
    }
  }, [storage, show]);

  const handleSave = async () => {
    if (isBlank(formData.name)) {
      setShowValidation(true);
      showAlert("danger", "El nombre de la bodega es obligatorio.");
      return;
    }

    setShowValidation(false);
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        is_active: Boolean(formData.is_active),
      };

      if (formData.id) {
        await updateStorage(formData.id, payload);
      } else {
        await createStorage(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Bodega guardada correctamente");
    } catch {
      showAlert("danger", "Error al guardar la bodega");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly
    ? "Ver bodega"
    : formData?.id
      ? "Editar bodega"
      : "Nueva bodega";

  const nameMissing = showValidation && isBlank(formData.name);

  return (
    <Modal show={show} onHide={onHide} size="md">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={(e) => e.preventDefault()}>
          <Form.Group className="mb-3">
            <Form.Label>
              Nombre <span className="text-red-500">*</span>
            </Form.Label>
            <Form.Control
              required
              isInvalid={nameMissing}
              value={formData.name || ""}
              readOnly={readOnly}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {nameMissing && (
              <Form.Text className="text-danger">El nombre es obligatorio.</Form.Text>
            )}
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label>Estado</Form.Label>
            <Form.Check
              type="switch"
              id="storage-is-active"
              label={formData.is_active ? "Activo" : "Inactivo"}
              checked={Boolean(formData.is_active)}
              disabled={readOnly}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </Form.Group>
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
