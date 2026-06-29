"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { createCava, updateCava, getStorages } from "@/services/storageService";
import { conditionLabels } from "../cavaLabels";

const EMPTY_CAVA = {
  name: "",
  storage_id: "",
  storage: null,
  condition: "",
  total_levels: 0,
  temp_min: "",
  temp_max: "",
  is_active: true,
};

function isBlank(value) {
  return !String(value ?? "").trim();
}

function normalizeNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function ModalEdit({ show, onHide, cava, mode, onSave, showAlert }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_CAVA);
  const [storages, setStorages] = useState([]);
  const [isLoadingStorages, setIsLoadingStorages] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setIsLoadingStorages(true);

    getStorages(1, "", 200)
      .then((response) => {
        if (cancelled) return;
        setStorages(response.results || []);
      })
      .catch(() => {
        if (!cancelled) setStorages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStorages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(() => {
    if (cava) {
      setFormData({
        ...cava,
        storage_id: cava.storage?.id ?? cava.storage_id ?? "",
        temp_min: cava.temp_min ?? "",
        temp_max: cava.temp_max ?? "",
        total_levels: cava.total_levels ?? 0,
        is_active: cava.is_active !== false,
      });
    } else {
      setFormData(EMPTY_CAVA);
    }
    if (!show) {
      setShowValidation(false);
    }
  }, [cava, show]);

  const handleSave = async () => {
    const nameMissing = isBlank(formData.name);
    const storageMissing = !formData.storage_id;
    const conditionMissing = !formData.condition;

    if (nameMissing || storageMissing || conditionMissing) {
      setShowValidation(true);
      if (nameMissing && storageMissing && conditionMissing) {
        showAlert("danger", "Complete el nombre, el almacén y la condición.");
      } else if (nameMissing) {
        showAlert("danger", "El nombre de la cava es obligatorio.");
      } else if (storageMissing) {
        showAlert("danger", "Seleccione un almacén.");
      } else {
        showAlert("danger", "Seleccione una condición.");
      }
      return;
    }

    setShowValidation(false);
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        storage_id: Number(formData.storage_id),
        condition: formData.condition,
        temp_min: normalizeNumber(formData.temp_min),
        temp_max: normalizeNumber(formData.temp_max),
        is_active: Boolean(formData.is_active),
      };

      if (formData.id) {
        await updateCava(formData.id, payload);
      } else {
        await createCava(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Cava guardada correctamente");
    } catch {
      showAlert("danger", "Error al guardar la cava");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly ? "Ver cava" : formData?.id ? "Editar cava" : "Nueva cava";

  const nameMissing = showValidation && isBlank(formData.name);
  const storageMissing = showValidation && !formData.storage_id;
  const conditionMissing = showValidation && !formData.condition;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="gap-y-3">
            <Col md={6}>
              <Form.Group className="mb-0">
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
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Almacén <span className="text-red-500">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.storage_id || ""}
                  disabled={readOnly || isLoadingStorages}
                  isInvalid={storageMissing}
                  onChange={(e) =>
                    setFormData({ ...formData, storage_id: e.target.value || "" })
                  }
                >
                  <option value="">
                    {isLoadingStorages ? "Cargando almacenes…" : "Seleccione un almacén"}
                  </option>
                  {storages.map((storage) => (
                    <option key={storage.id} value={storage.id}>
                      {storage.name}
                    </option>
                  ))}
                </Form.Select>
                {storageMissing && (
                  <Form.Text className="text-danger">Seleccione un almacén.</Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>
                  Condición <span className="text-red-500">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.condition || ""}
                  disabled={readOnly}
                  isInvalid={conditionMissing}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="">Seleccione una condición</option>
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
                {conditionMissing && (
                  <Form.Text className="text-danger">Seleccione una condición.</Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Total de niveles</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={formData.total_levels ?? 0}
                  readOnly
                  disabled
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Temperatura mínima (°C)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.temp_min ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => setFormData({ ...formData, temp_min: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Temperatura máxima (°C)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.temp_max ?? ""}
                  readOnly={readOnly}
                  onChange={(e) => setFormData({ ...formData, temp_max: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-0">
                <Form.Label>Estado</Form.Label>
                <Form.Check
                  type="switch"
                  id="cava-is-active"
                  label={formData.is_active ? "Activo" : "Inactivo"}
                  checked={Boolean(formData.is_active)}
                  disabled={readOnly}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
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
