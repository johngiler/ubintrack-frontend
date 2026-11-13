"use client";

import { useEffect, useState } from "react";
import { Printer, RefreshCw, Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert, Tabs, Tab } from "@/components/ui/bootstrap";
import { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  createPosition,
  updatePosition,
  getCavas,
  getPosition,
  printPosition,
  regeneratePositionTag,
} from "@/services/storageService";
import { getApiErrorMessage } from "@/services/httpClient";
import {
  canEnablePicking,
  canEnablePush,
  positionFlagsError,
  withActiveChange,
  withPickingChange,
  withPushChange,
} from "@/lib/positionFlags";
import { bustMediaUrl } from "@/lib/mediaUrl";
import { cavaTitleOf, statusLabels } from "../positionLabels";
import PositionMovementsTimeline from "./PositionMovementsTimeline";

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

function canPrintPosition(position) {
  const hasZpl =
    position?.has_zpl === true ||
    Boolean(String(position?.zpl_code || "").trim());
  return Boolean(position?.qr_code_image && hasZpl);
}

export default function ModalEdit({
  show,
  onHide,
  position,
  mode,
  onSave,
  showAlert,
  initialTab = "details",
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_POSITION);
  const [cavas, setCavas] = useState([]);
  const [isLoadingCavas, setIsLoadingCavas] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [formError, setFormError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || "details");

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";
  const hasSavedPosition = Boolean(formData?.id);

  useEffect(() => {
    if (show) setActiveTab(initialTab || "details");
  }, [show, initialTab]);

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
    if (!show) {
      setShowValidation(false);
      setFormError(null);
      setIsPrinting(false);
      setIsRegenerating(false);
      return;
    }
    // Solo al abrir / cambiar de posición: no pisar imagen tras regenerar.
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
  }, [show, position?.id]);

  const handlePrintTag = async () => {
    if (!formData?.id || isPrinting || !canPrintPosition(formData)) return;
    setIsPrinting(true);
    setFormError(null);
    try {
      await printPosition(formData.id);
      showAlert?.("success", "Etiqueta enviada a impresión");
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "No se pudo imprimir la etiqueta. Verifique la impresora.",
        ),
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleRegenerateTag = async () => {
    if (!formData?.id || isRegenerating) return;
    setIsRegenerating(true);
    setFormError(null);
    try {
      const response = await regeneratePositionTag(formData.id);
      const refreshed = await getPosition(formData.id).catch(() => null);
      const nextQr = bustMediaUrl(
        response?.qr_code_image || refreshed?.qr_code_image || "",
      );
      setFormData((prev) => ({
        ...prev,
        ...(refreshed
          ? {
              ...refreshed,
              cava_id: refreshed.cava?.id ?? refreshed.cava_id ?? prev.cava_id,
              zpl_code: undefined,
            }
          : {}),
        qr_code_image: nextQr || prev.qr_code_image,
        has_zpl:
          response?.has_zpl === true ||
          refreshed?.has_zpl === true ||
          Boolean(nextQr) ||
          prev.has_zpl,
      }));
      await onSave?.();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No se pudo regenerar la etiqueta."));
    } finally {
      setIsRegenerating(false);
    }
  };

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

    const flagsError = positionFlagsError(formData);
    if (flagsError) {
      setShowValidation(true);
      setFormError(flagsError);
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
      const data = err?.response?.data || {};
      const fieldMsg = data.is_push || data.is_picking || data.is_active;
      const apiMsg = Array.isArray(fieldMsg)
        ? fieldMsg[0]
        : typeof fieldMsg === "string"
          ? fieldMsg
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
        <Tabs activeKey={activeTab} onSelect={setActiveTab} id="position-tabs">
          <Tab eventKey="details" title="Detalles">
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

            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Estado</Form.Label>
                <Form.Check
                  type="switch"
                  id="position-is-active"
                  label={formData.is_active ? "Activo" : "Inactivo"}
                  checked={Boolean(formData.is_active)}
                  disabled={readOnly}
                  onChange={(e) => {
                    setFormError(null);
                    setFormData(withActiveChange(formData, e.target.checked));
                  }}
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
                  disabled={readOnly || !canEnablePicking(formData)}
                  onChange={(e) => {
                    setFormError(null);
                    setFormData(withPickingChange(formData, e.target.checked));
                  }}
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
                  disabled={readOnly || !canEnablePush(formData)}
                  onChange={(e) => {
                    setFormError(null);
                    setFormData(withPushChange(formData, e.target.checked));
                  }}
                />
                <Form.Text className="text-muted">
                  Requiere profundidad de al menos 5. Aplica a todo el conducto.
                </Form.Text>
              </Form.Group>
            </Col>

            {hasSavedPosition ? (
              <Col md={12}>
                <Modal.Section
                  title="Etiqueta de posición"
                  className="!mb-0 !p-3.5"
                  actions={
                    <>
                      {canPrintPosition(formData) ? (
                        <IconButton
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                          onClick={handlePrintTag}
                          disabled={isPrinting}
                          title="Imprimir etiqueta"
                          aria-label="Imprimir etiqueta"
                        >
                          {isPrinting ? (
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <Printer className="h-4 w-4" />
                          )}
                        </IconButton>
                      ) : null}
                      <IconButton
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                        onClick={handleRegenerateTag}
                        disabled={isRegenerating}
                        title="Regenerar etiqueta"
                        aria-label="Regenerar etiqueta"
                      >
                        {isRegenerating ? (
                          <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                            role="status"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </IconButton>
                    </>
                  }
                >
                  {formData.qr_code_image ? (
                    <div className="text-center">
                      <a
                        href={formData.qr_code_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          key={formData.qr_code_image}
                          src={formData.qr_code_image}
                          alt={`QR ${formData.code || ""}`}
                          className="mx-auto max-h-[280px] w-auto rounded-md border border-[var(--border-subtle)] object-contain"
                        />
                      </a>
                    </div>
                  ) : (
                    <p className="mb-0 text-sm text-slate-500">
                      Sin imagen de etiqueta. Use regenerar para crearla.
                    </p>
                  )}
                </Modal.Section>
              </Col>
            ) : null}
          </Row>
        </Form>
          </Tab>
          {hasSavedPosition ? (
            <Tab eventKey="movements" title="Historial de movimientos">
              <PositionMovementsTimeline
                positionId={formData.id}
                active={activeTab === "movements"}
              />
            </Tab>
          ) : null}
        </Tabs>
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
