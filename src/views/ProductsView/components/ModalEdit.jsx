"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import AsyncSelect from "@/components/ui/AsyncSelect";
import { useAuth } from "@/context/AuthContext";
import { getClients } from "@/services/coreService";
import { createProduct, updateProduct, getCategories } from "@/services/inventoryService";
import { conditionLabels, rotationTypeLabels, uomLabels } from "@/lib/productLabels";

const EMPTY_PRODUCT = {
  name: "",
  code: "",
  client_sku: "",
  rotation_type: "",
  uom: "",
  kg_uom: "0.00",
  units_in_uom: "0",
  qty_uom_pallet: "0",
  condition: "",
  storage_temperature: "",
  supplier: "",
  comment: "",
  is_picking: false,
  is_active: true,
  category: null,
  client: null,
};

function normalizeProductForm(product, authUser, isClientUser) {
  if (!product) {
    return {
      ...EMPTY_PRODUCT,
      client: isClientUser ? authUser?.client ?? null : null,
    };
  }

  return {
    ...EMPTY_PRODUCT,
    ...product,
    name: product.name ?? "",
    code: product.code ?? "",
    client_sku: product.client_sku ?? "",
    rotation_type: product.rotation_type ?? "",
    uom: product.uom ?? "",
    kg_uom: product.kg_uom != null && product.kg_uom !== "" ? String(product.kg_uom) : "0.00",
    units_in_uom:
      product.units_in_uom != null && product.units_in_uom !== ""
        ? String(product.units_in_uom)
        : "0",
    qty_uom_pallet:
      product.qty_uom_pallet != null && product.qty_uom_pallet !== ""
        ? String(product.qty_uom_pallet)
        : "0",
    condition: product.condition ?? "",
    storage_temperature:
      product.storage_temperature != null && product.storage_temperature !== ""
        ? String(product.storage_temperature)
        : "",
    supplier: product.supplier ?? "",
    comment: product.comment ?? "",
    is_picking: Boolean(product.is_picking),
    is_active: product.is_active !== false,
    category: product.category ?? null,
    client: product.client ?? (isClientUser ? authUser?.client ?? null : null),
  };
}

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function ModalEdit({ show, onHide, product, mode, onSave, showAlert }) {
  const authUser = useAuth().user;
  const isClientUser = !!authUser?.client && !authUser?.is_superuser;

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PRODUCT);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!show || readOnly) return undefined;

    let cancelled = false;
    setIsLoadingCategories(true);

    getCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, readOnly]);

  useEffect(() => {
    if (!show || readOnly) return undefined;

    let cancelled = false;
    setIsLoadingClients(true);

    const loadClients = async () => {
      try {
        if (isClientUser) {
          setClients(authUser.client ? [authUser.client] : []);
        } else {
          const response = await getClients(1, "");
          if (!cancelled) setClients(response.results || []);
        }
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setIsLoadingClients(false);
      }
    };

    loadClients();

    return () => {
      cancelled = true;
    };
  }, [show, readOnly, isClientUser, authUser?.client]);

  useEffect(() => {
    if (!show) {
      setShowValidation(false);
      setFormData(EMPTY_PRODUCT);
      return;
    }
    setFormData(normalizeProductForm(product, authUser, isClientUser));
  }, [product, show, isClientUser, authUser]);

  const loadClientOptions = useCallback(
    async (inputValue) => {
      if (readOnly || isClientUser) return [];

      try {
        const response = await getClients(1, inputValue);
        return (response.results || []).map((client) => ({
          value: client.id,
          label: client.name,
          ...client,
        }));
      } catch {
        return [];
      }
    },
    [readOnly, isClientUser],
  );

  const handleSave = async () => {
    const nameMissing = isBlank(formData.name);
    const clientMissing = !formData.client?.id && !isClientUser;
    const rotationMissing = !formData.rotation_type;
    const uomMissing = !formData.uom;

    if (nameMissing || clientMissing || rotationMissing || uomMissing) {
      setShowValidation(true);
      if (clientMissing) {
        showAlert("danger", "Seleccione un cliente.");
      } else if (rotationMissing) {
        showAlert("danger", "Seleccione un tipo de rotación.");
      } else if (uomMissing) {
        showAlert("danger", "Seleccione una presentación.");
      } else {
        showAlert("danger", "Complete todos los campos obligatorios del producto.");
      }
      return;
    }

    setShowValidation(false);
    setIsSaving(true);

    try {
      const payload = {
        client_id: formData.client?.id || null,
        name: formData.name.trim(),
        client_sku: formData.client_sku || "",
        rotation_type: formData.rotation_type,
        uom: formData.uom,
        kg_uom: parseFloat(formData.kg_uom) || 0,
        units_in_uom: parseInt(formData.units_in_uom, 10) || 0,
        qty_uom_pallet: parseInt(formData.qty_uom_pallet, 10) || 0,
        condition: formData.condition || null,
        storage_temperature:
          formData.storage_temperature === "" ? null : parseFloat(formData.storage_temperature),
        category_id: formData.category?.id || null,
        supplier: formData.supplier || null,
        comment: formData.comment || "",
        is_picking: Boolean(formData.is_picking),
        is_active: Boolean(formData.is_active),
      };

      if (formData.id) {
        await updateProduct(formData.id, payload);
      } else {
        await createProduct(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Producto guardado correctamente");
    } catch (error) {
      const data = error?.response?.data;
      if (data && typeof data === "object") {
        const messages = Object.entries(data).flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((msg) => `${key}: ${msg}`) : [`${key}: ${value}`],
        );
        showAlert("danger", messages.join(", ") || "Error al guardar el producto");
      } else {
        showAlert("danger", "Error al guardar el producto");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly ? "Ver producto" : formData?.id ? "Editar producto" : "Nuevo producto";

  const nameMissing = showValidation && isBlank(formData.name);
  const clientMissing = showValidation && !formData.client?.id && !isClientUser;
  const rotationMissing = showValidation && !formData.rotation_type;
  const uomMissing = showValidation && !formData.uom;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-y-auto">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Modal.Section title="Datos del producto" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
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
              {formData.id ? (
                <Col md={6} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">Código</Form.Label>
                    <Form.Control value={formData.code || ""} readOnly />
                  </Form.Group>
                </Col>
              ) : (
                <Col md={6} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Cliente <span className="text-red-500">*</span>
                    </Form.Label>
                    {readOnly ? (
                      <Form.Control value={formData.client?.name || "—"} readOnly />
                    ) : (
                      <>
                        <AsyncSelect
                          inputId="product-client"
                          name="product-client"
                          value={
                            formData.client
                              ? {
                                  value: formData.client.id,
                                  label: formData.client.name,
                                  ...formData.client,
                                }
                              : null
                          }
                          loadOptions={loadClientOptions}
                          defaultOptions={clients.map((client) => ({
                            value: client.id,
                            label: client.name,
                            ...client,
                          }))}
                          isDisabled={isClientUser}
                          isLoading={isLoadingClients}
                          isInvalid={clientMissing}
                          onChange={(selected) =>
                            setFormData({
                              ...formData,
                              client: selected
                                ? { id: selected.value, name: selected.label }
                                : null,
                            })
                          }
                          placeholder={
                            isLoadingClients ? "Cargando clientes…" : "Seleccione un cliente"
                          }
                          isClearable={!isClientUser}
                          noOptionsMessage={({ inputValue }) =>
                            inputValue ? "No hay resultados" : "Escriba para buscar"
                          }
                        />
                        {clientMissing && (
                          <Form.Text className="text-danger">El cliente es obligatorio.</Form.Text>
                        )}
                      </>
                    )}
                  </Form.Group>
                </Col>
              )}
              {formData.id && (
                <Col md={6} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Cliente <span className="text-red-500">*</span>
                    </Form.Label>
                    {readOnly ? (
                      <Form.Control value={formData.client?.name || "—"} readOnly />
                    ) : (
                      <>
                        <AsyncSelect
                          inputId="product-client"
                          name="product-client"
                          value={
                            formData.client
                              ? {
                                  value: formData.client.id,
                                  label: formData.client.name,
                                  ...formData.client,
                                }
                              : null
                          }
                          loadOptions={loadClientOptions}
                          defaultOptions={clients.map((client) => ({
                            value: client.id,
                            label: client.name,
                            ...client,
                          }))}
                          isDisabled={isClientUser}
                          isLoading={isLoadingClients}
                          isInvalid={clientMissing}
                          onChange={(selected) =>
                            setFormData({
                              ...formData,
                              client: selected
                                ? { id: selected.value, name: selected.label }
                                : null,
                            })
                          }
                          placeholder={
                            isLoadingClients ? "Cargando clientes…" : "Seleccione un cliente"
                          }
                          isClearable={!isClientUser}
                          noOptionsMessage={({ inputValue }) =>
                            inputValue ? "No hay resultados" : "Escriba para buscar"
                          }
                        />
                        {clientMissing && (
                          <Form.Text className="text-danger">El cliente es obligatorio.</Form.Text>
                        )}
                      </>
                    )}
                  </Form.Group>
                </Col>
              )}
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Categoría</Form.Label>
                  {readOnly ? (
                    <Form.Control value={formData.category?.name || "—"} readOnly />
                  ) : (
                    <Select
                      inputId="product-category"
                      name="product-category"
                      options={categories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                      value={formData.category?.id ?? ""}
                      placeholder={
                        isLoadingCategories ? "Cargando categorías…" : "Seleccione una categoría"
                      }
                      isSearchable={false}
                      disabled={isLoadingCategories}
                      onChange={(e) => {
                        const categoryId = parseInt(e.target.value, 10);
                        const category = categories.find((item) => item.id === categoryId);
                        setFormData({ ...formData, category: category || null });
                      }}
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">SKU Cliente</Form.Label>
                  <Form.Control
                    value={formData.client_sku || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, client_sku: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tipo de rotación <span className="text-red-500">*</span>
                  </Form.Label>
                  {readOnly ? (
                    <Form.Control
                      value={rotationTypeLabels[formData.rotation_type] || formData.rotation_type || "—"}
                      readOnly
                    />
                  ) : (
                    <>
                      <Select
                        inputId="product-rotation"
                        name="product-rotation"
                        options={Object.entries(rotationTypeLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        value={formData.rotation_type || ""}
                        placeholder="Seleccione un tipo de rotación"
                        isSearchable={false}
                        isInvalid={rotationMissing}
                        onChange={(e) =>
                          setFormData({ ...formData, rotation_type: e.target.value })
                        }
                      />
                      {rotationMissing && (
                        <Form.Text className="text-danger">
                          El tipo de rotación es obligatorio.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Presentación <span className="text-red-500">*</span>
                  </Form.Label>
                  {readOnly ? (
                    <Form.Control
                      value={uomLabels[formData.uom] || formData.uom || "—"}
                      readOnly
                    />
                  ) : (
                    <>
                      <Select
                        inputId="product-uom"
                        name="product-uom"
                        options={Object.entries(uomLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        value={formData.uom || ""}
                        placeholder="Seleccione una unidad de medida"
                        isSearchable={false}
                        isInvalid={uomMissing}
                        onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                      />
                      {uomMissing && (
                        <Form.Text className="text-danger">
                          La presentación es obligatoria.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Kg por presentación
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.kg_uom}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, kg_uom: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Unidades dentro de presentación
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.units_in_uom}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, units_in_uom: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    UOM por pallet
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.qty_uom_pallet}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, qty_uom_pallet: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Condición</Form.Label>
                  {readOnly ? (
                    <Form.Control
                      value={conditionLabels[formData.condition] || formData.condition || "—"}
                      readOnly
                    />
                  ) : (
                    <Select
                      inputId="product-condition"
                      name="product-condition"
                      options={Object.entries(conditionLabels).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={formData.condition || ""}
                      placeholder="Seleccione una condición"
                      isSearchable={false}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Temperatura de almacenamiento
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={formData.storage_temperature}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, storage_temperature: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Proveedor</Form.Label>
                  <Form.Control
                    value={formData.supplier || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">Comentario</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.comment || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Check
                  type="switch"
                  id="product-is-active"
                  label={formData.is_active ? "Activo" : "Inactivo"}
                  checked={Boolean(formData.is_active)}
                  disabled={readOnly}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Col>
              <Col md={6} className="mb-0">
                <Form.Check
                  type="switch"
                  id="product-is-picking"
                  label={formData.is_picking ? "Picking: Sí" : "Picking: No"}
                  checked={Boolean(formData.is_picking)}
                  disabled={readOnly}
                  onChange={(e) => setFormData({ ...formData, is_picking: e.target.checked })}
                />
              </Col>
            </Row>
          </Modal.Section>
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
