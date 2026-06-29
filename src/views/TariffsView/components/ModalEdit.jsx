"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Box,
  Save,
  Settings,
  Snowflake,
  Sun,
  Thermometer,
  Wrench,
  X,
} from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert } from "@/components/ui/bootstrap";
import { createTariff, updateTariff } from "@/services/financeService";
import { CONDITION_SECTIONS, EMPTY_TARIFF } from "../tariffLabels";

const CONDITION_ICONS = {
  frozen: Snowflake,
  refrigerated: Thermometer,
  dry: Sun,
};

function ConditionRateFields({ section, formData, readOnly, onChange }) {
  const Icon = CONDITION_ICONS[section.key];

  return (
    <Modal.Section className={`!p-3.5 ${section.bg}`}>
      <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${section.accent}`}>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${section.bg}`}>
          <Icon className="h-4 w-4" />
        </span>
        {section.label}
      </div>
      <Row className="gap-y-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="text-xs">Entrada pallet ($)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData[section.inPallet] ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange(section.inPallet, e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="text-xs">Entrada piso ($)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData[section.inFloor] ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange(section.inFloor, e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="text-xs">Salida ($)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData[section.out] ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange(section.out, e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
    </Modal.Section>
  );
}

export default function ModalEdit({ show, onHide, tariff, mode, onSave, showAlert }) {
  const [formData, setFormData] = useState(EMPTY_TARIFF);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit" || mode === "new";
  const isNew = mode === "new" || !tariff?.id;

  useEffect(() => {
    if (tariff) {
      setFormData({ ...EMPTY_TARIFF, ...tariff });
    } else {
      setFormData(EMPTY_TARIFF);
    }
    if (!show) setShowValidation(false);
  }, [tariff, show]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!String(formData.name ?? "").trim()) {
      setShowValidation(true);
      showAlert("danger", "El nombre de la tarifa es obligatorio.");
      return;
    }

    setShowValidation(false);
    setIsSaving(true);
    try {
      if (isNew) {
        await createTariff(formData);
        showAlert("success", "Tarifa creada correctamente");
      } else {
        await updateTariff(formData.id, formData);
        showAlert("success", "Tarifa actualizada correctamente");
      }
      await onSave();
      onHide();
    } catch {
      showAlert("danger", `Error al ${isNew ? "crear" : "actualizar"} la tarifa`);
    } finally {
      setIsSaving(false);
    }
  };

  const title =
    mode === "view" ? "Ver tarifa" : isNew ? "Nueva tarifa" : "Editar tarifa";

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
        {formData.name ? <Modal.Subtitle>{formData.name}</Modal.Subtitle> : null}
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Modal.Section title="Datos generales" className="!p-3.5">
            <Form.Group>
              <Form.Label className="text-xs">
                Nombre de la tarifa <span className="text-red-500">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.name ?? ""}
                disabled={readOnly}
                isInvalid={showValidation && !String(formData.name ?? "").trim()}
                placeholder="Ej: Tarifa General, Tarifa Premium…"
                onChange={(e) => handleChange("name", e.target.value)}
              />
              {showValidation && !String(formData.name ?? "").trim() ? (
                <Form.Text className="text-danger">Ingrese un nombre para la tarifa.</Form.Text>
              ) : null}
            </Form.Group>
          </Modal.Section>

          <Modal.Section title="Tarifa dinámica / estática" className="!p-3.5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Settings className="h-4 w-4 text-sky-600" />
              Configuración de rotación
            </div>
            <Alert variant="info" className="mb-4 py-2.5 text-xs">
              <p>
                <strong>Dinámica (≥ umbral):</strong> cobra almacenamiento (promedio × tarifa × días)
                + movimientos reales.
              </p>
              <p className="mt-1">
                <strong>Estática (&lt; umbral):</strong> cobra almacenamiento igual + penalización
                sobre todos los pallets promedio. Sin picking.
              </p>
            </Alert>
            <Row className="gap-y-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs">Umbral de rotación (0–1)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.rotation_threshold ?? "0.40"}
                    disabled={readOnly}
                    onChange={(e) => handleChange("rotation_threshold", e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    0.40 = 40% de rotación mínima para tarifa dinámica
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs">Penalización estática (0–1)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.static_penalty_rate ?? "0.80"}
                    disabled={readOnly}
                    onChange={(e) => handleChange("static_penalty_rate", e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    0.80 = 80% de entrada/salida cuando rotación &lt; umbral
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Section>

          <div className="mb-4 flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
            <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
            Tarifas de entrada y salida por condición
          </div>

          {CONDITION_SECTIONS.map((section) => (
            <ConditionRateFields
              key={section.key}
              section={section}
              formData={formData}
              readOnly={readOnly}
              onChange={handleChange}
            />
          ))}

          <Modal.Section title="Almacenamiento mensual por condición" className="!p-3.5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Box className="h-4 w-4 text-sky-600" />
              Tarifa por pallet promedio
            </div>
            <Alert variant="info" className="mb-4 py-2.5 text-xs">
              La tarifa mensual se multiplica por el promedio de pallets almacenados. Ejemplo: 30
              pallets × $32/mes = $960
            </Alert>
            <Row className="gap-y-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Refrigerado ($/mes)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.refrigerated_storage ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("refrigerated_storage", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Congelado ($/mes)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.frozen_storage ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("frozen_storage", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Seco ($/mes)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.dry_storage ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("dry_storage", e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Section>

          <Modal.Section title="Servicios adicionales" className="!p-3.5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Wrench className="h-4 w-4 text-violet-600" />
              Picking y servicios
            </div>

            <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3.5">
              <Row className="items-center gap-y-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="text-xs">Picking ($)</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.picking ?? ""}
                      disabled={readOnly}
                      onChange={(e) => handleChange("picking", e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Check
                    type="switch"
                    id="has_picking_tariff"
                    disabled={readOnly}
                    checked={Boolean(formData.has_picking_tariff)}
                    onChange={(e) => handleChange("has_picking_tariff", e.target.checked)}
                    label={
                      <span>
                        <span className="text-sm font-medium text-slate-800">
                          Activar tarifa picking
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Multiplica el total de cajas de cada bin por el valor de picking
                        </span>
                      </span>
                    }
                  />
                </Col>
              </Row>
            </div>

            <Row className="gap-y-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Crossdocking ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.crossdocking ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("crossdocking", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Restiba ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.restiba ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("restiba", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Pallet adicional ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.added_pallet ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("added_pallet", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="text-xs">Wrap/Strech ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.wrap ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleChange("wrap", e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Section>

          {readOnly && (formData.created_at || formData.updated_at) ? (
            <Modal.Section title="Auditoría" className="!p-3.5">
              <Row className="gap-y-3">
                {formData.created_at ? (
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-xs text-slate-500">Fecha de creación</Form.Label>
                      <Form.Control
                        type="text"
                        value={new Date(formData.created_at).toLocaleString("es-ES")}
                        disabled
                        className="bg-slate-50"
                      />
                    </Form.Group>
                  </Col>
                ) : null}
                {formData.updated_at ? (
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-xs text-slate-500">Última actualización</Form.Label>
                      <Form.Control
                        type="text"
                        value={new Date(formData.updated_at).toLocaleString("es-ES")}
                        disabled
                        className="bg-slate-50"
                      />
                    </Form.Group>
                  </Col>
                ) : null}
              </Row>
            </Modal.Section>
          ) : null}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          Cerrar
        </Button>
        {isEditMode ? (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : isNew ? "Crear tarifa" : "Guardar cambios"}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}
