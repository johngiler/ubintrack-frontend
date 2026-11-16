"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert, Tabs, Tab } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import AsyncSelect from "@/components/ui/AsyncSelect";
import { getApiErrorMessage } from "@/services/httpClient";
import { getUsers, getClients } from "@/services/coreService";
import { getCavas, getPositionHalls } from "@/services/storageService";
import { getProducts } from "@/services/inventoryService";
import { createTask, updateTask } from "@/services/taskService";
import TaskLogsPanel from "./TaskLogsPanel";

import {
  EMPTY_TASK,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_HINTS,
  TASK_TYPE_OPTIONS,
} from "../taskLabels";

function toOption(item, labelKeys = ["name", "full_name", "code", "email"]) {
  if (!item) return null;
  const label =
    labelKeys.map((k) => item[k]).find(Boolean) || String(item.id);
  return { value: item.id, label, ...item };
}

export default function ModalEdit({
  show,
  onHide,
  task,
  mode,
  onSave,
  initialTab = "details",
}) {
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const readOnly = mode === "view";
  const isNew = !formData?.id;

  useEffect(() => {
    if (!show) return;
    setActiveTab(initialTab || "details");
  }, [show, initialTab]);

  useEffect(() => {
    if (!show) return;
    setFormError(null);
    if (!task) {
      setFormData({ ...EMPTY_TASK });
      return;
    }
    const cavaList = task.cavas || [];
    const productList = task.products || [];
    setFormData({
      ...EMPTY_TASK,
      ...task,
      assigned_to_ids: (task.assigned_to || []).map((u) => u.id),
      client_id: task.client?.id ?? task.client_id ?? null,
      cavas: cavaList,
      cava_ids: cavaList.map((c) => c.id),
      halls: Array.isArray(task.halls) ? task.halls : [],
      products: productList,
      product_ids: productList.map((p) => p.id),
    });
  }, [task, show]);

  const typeHint = TASK_TYPE_HINTS[formData.task_type] || "";
  const isInventarioGeneral = formData.task_type === "inventario_general";
  const showProduct = formData.task_type !== "inventario_inicial";

  const cavaIdsKey = (formData.cava_ids || []).slice().sort().join(",");

  const { data: hallsData, isLoading: hallsLoading } = useSWR(
    show ? ["task-halls", cavaIdsKey || "all"] : null,
    () =>
      getPositionHalls({
        cavaIds: formData.cava_ids?.length ? formData.cava_ids : undefined,
      }),
    { revalidateOnFocus: false },
  );

  const hallOptions = useMemo(() => {
    return (Array.isArray(hallsData) ? hallsData : []).map((row) => {
      const value = String(row.value ?? row).trim();
      return { value, label: row.label || value };
    });
  }, [hallsData]);

  useEffect(() => {
    if (!hallOptions.length) return;
    const allowed = new Set(hallOptions.map((o) => o.value));
    setFormData((prev) => {
      const nextHalls = (prev.halls || []).filter((h) => allowed.has(h));
      if (nextHalls.length === (prev.halls || []).length) return prev;
      return { ...prev, halls: nextHalls };
    });
  }, [hallOptions]);

  const assignedValue = useMemo(
    () =>
      (formData.assigned_to || []).map((u) =>
        toOption(u, ["full_name", "email", "username"]),
      ),
    [formData.assigned_to],
  );

  const clientValue = useMemo(() => {
    if (formData.client) return toOption(formData.client);
    if (formData.client_id)
      return { value: formData.client_id, label: `Cliente #${formData.client_id}` };
    return null;
  }, [formData.client, formData.client_id]);

  const cavasValue = useMemo(
    () =>
      (formData.cavas || []).map((c) => toOption(c, ["name", "code"])),
    [formData.cavas],
  );

  const productsValue = useMemo(
    () =>
      (formData.products || []).map((p) => ({
        value: p.id ?? p.value,
        label:
          p.label ||
          (p.client_sku ? `${p.name} (${p.client_sku})` : p.name) ||
          String(p.id ?? p.value),
        ...p,
      })),
    [formData.products],
  );

  const loadUsers = async (inputValue) => {
    const res = await getUsers(1, inputValue || "", {
      staff_only: true,
      is_active: "true",
    });
    const rows = res.results || res || [];
    return rows.map((u) => toOption(u, ["full_name", "email", "username"]));
  };

  const loadClients = async (inputValue) => {
    const res = await getClients(1, inputValue || "", { is_active: "true" });
    return (res.results || []).map((c) => toOption(c));
  };

  const loadCavas = async (inputValue) => {
    const res = await getCavas(1, inputValue || "", 50);
    return (res.results || []).map((c) => toOption(c, ["name", "code"]));
  };

  const loadProducts = async (inputValue) => {
    const filters = formData.client_id ? { client: formData.client_id } : {};
    const res = await getProducts(1, filters, inputValue || "");
    return (res.results || []).map((p) => ({
      value: p.id,
      label: p.client_sku ? `${p.name} (${p.client_sku})` : p.name,
      ...p,
    }));
  };

  const handleSave = async () => {
    if (!formData.task_type || !formData.status || !formData.priority) {
      setFormError("Complete tipo, estado y prioridad");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: formData.title || "",
        task_type: formData.task_type,
        status: formData.status,
        priority: formData.priority,
        observations: formData.observations || "",
        halls: formData.halls || [],
        include_empty_positions: Boolean(formData.include_empty_positions),
        require_approval: Boolean(formData.require_approval),
        assigned_to_ids: formData.assigned_to_ids || [],
        client_id: formData.client_id || null,
        cava_ids: formData.cava_ids || [],
        product_ids: showProduct ? formData.product_ids || [] : [],
        is_active: formData.is_active !== false,
      };
      if (formData.id) {
        await updateTask(formData.id, payload);
      } else {
        await createTask(payload);
      }
      await onSave?.();
      onHide();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No se pudo guardar la tarea."));
    } finally {
      setIsSaving(false);
    }
  };

  const modalTitle = readOnly
    ? "Ver tarea"
    : isNew
      ? "Nueva tarea"
      : "Modificar tarea";

  const detailsForm = (
        <Form onSubmit={(e) => e.preventDefault()}>
          <Modal.Section title="Datos generales" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              {!isNew ? (
                <Col md={4}>
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Código
                    </Form.Label>
                    <Form.Control value={formData.code || "—"} disabled />
                  </Form.Group>
                </Col>
              ) : null}
              <Col md={isNew ? 12 : 8}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Título
                  </Form.Label>
                  <Form.Control
                    value={formData.title || ""}
                    disabled={readOnly}
                    placeholder="Ej. Conteo cíclico cámara 9"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tipo <span className="text-danger">*</span>
                  </Form.Label>
                  <Select
                    options={TASK_TYPE_OPTIONS}
                    value={formData.task_type}
                    isDisabled={readOnly || !isNew}
                    onChange={(e) => {
                      const value = e?.target?.value || "conteo_ciclico";
                      setFormData((prev) => ({
                        ...prev,
                        task_type: value,
                        include_empty_positions:
                          value === "inventario_general"
                            ? true
                            : prev.include_empty_positions,
                        require_approval:
                          value === "inventario_general"
                            ? true
                            : prev.require_approval,
                        ...(value === "inventario_inicial"
                          ? { products: [], product_ids: [] }
                          : null),
                      }));
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Estado <span className="text-danger">*</span>
                  </Form.Label>
                  <Select
                    options={TASK_STATUS_OPTIONS}
                    value={formData.status}
                    isDisabled={readOnly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e?.target?.value || "pendiente",
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Prioridad <span className="text-danger">*</span>
                  </Form.Label>
                  <Select
                    options={TASK_PRIORITY_OPTIONS}
                    value={formData.priority}
                    isDisabled={readOnly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: e?.target?.value || "medium",
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              {typeHint ? (
                <Col md={12}>
                  <p className="mb-0 text-xs text-slate-500">{typeHint}</p>
                </Col>
              ) : null}
            </Row>
          </Modal.Section>

          <Modal.Section title="Alcance" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Cliente
                  </Form.Label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadClients}
                    value={clientValue}
                    isDisabled={readOnly}
                    isClearable
                    placeholder="Seleccione un cliente"
                    onChange={(opt) =>
                      setFormData((prev) => ({
                        ...prev,
                        client: opt || null,
                        client_id: opt?.value ?? null,
                        products: [],
                        product_ids: [],
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Cámaras
                  </Form.Label>
                  <AsyncSelect
                    isMulti
                    cacheOptions
                    defaultOptions
                    loadOptions={loadCavas}
                    value={cavasValue}
                    isDisabled={readOnly}
                    isClearable
                    placeholder="Todas las cámaras"
                    onChange={(opts) => {
                      const list = opts || [];
                      setFormData((prev) => ({
                        ...prev,
                        cavas: list,
                        cava_ids: list.map((o) => o.value),
                        halls: [],
                      }));
                    }}
                  />
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    Vacío = todas. Una o varias acotan el recorrido.
                  </p>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Pasillos
                  </Form.Label>
                  <Select
                    isMulti
                    isClearable
                    isSearchable
                    options={hallOptions}
                    value={formData.halls || []}
                    isDisabled={readOnly || hallsLoading}
                    placeholder={
                      hallsLoading
                        ? "Cargando…"
                        : hallOptions.length
                          ? "Todos los pasillos"
                          : "Sin pasillos"
                    }
                    noOptionsMessage={() => "Sin pasillos"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        halls: Array.isArray(e?.target?.value)
                          ? e.target.value
                          : [],
                      }))
                    }
                  />
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    Lista según las cámaras elegidas (igual que en posiciones).
                  </p>
                </Form.Group>
              </Col>
              {showProduct ? (
                <Col md={6}>
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Productos
                    </Form.Label>
                    <AsyncSelect
                      key={`products-${formData.client_id || "all"}`}
                      isMulti
                      cacheOptions
                      defaultOptions
                      loadOptions={loadProducts}
                      value={productsValue}
                      isDisabled={readOnly}
                      isClearable
                      placeholder="Todos los productos"
                      onChange={(opts) => {
                        const list = opts || [];
                        setFormData((prev) => ({
                          ...prev,
                          products: list,
                          product_ids: list.map((o) => o.value),
                        }));
                      }}
                    />
                    <p className="mb-0 mt-1 text-xs text-slate-500">
                      Vacío = todos. Varios acotan el conteo.
                    </p>
                  </Form.Group>
                </Col>
              ) : null}
              <Col md={12}>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <Form.Check
                    type="checkbox"
                    id="include-empty"
                    label="Incluir posiciones vacías"
                    disabled={readOnly || isInventarioGeneral}
                    checked={Boolean(formData.include_empty_positions)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        include_empty_positions: e.target.checked,
                      }))
                    }
                  />
                  <Form.Check
                    type="checkbox"
                    id="require-approval"
                    label="Requiere aprobación"
                    disabled={readOnly || isInventarioGeneral}
                    checked={Boolean(formData.require_approval)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        require_approval: e.target.checked,
                      }))
                    }
                  />
                </div>
                {isInventarioGeneral ? (
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    En inventario general estas opciones quedan activas.
                  </p>
                ) : null}
              </Col>
            </Row>
          </Modal.Section>

          <Modal.Section title="Asignación" className="!p-3.5">
            <Form.Group className="mb-0">
              <Form.Label className="!text-xs !font-medium !text-slate-600">
                Asignados
              </Form.Label>
              <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions
                loadOptions={loadUsers}
                value={assignedValue}
                isDisabled={readOnly}
                placeholder="Seleccione usuarios"
                onChange={(opts) => {
                  const list = opts || [];
                  setFormData((prev) => ({
                    ...prev,
                    assigned_to: list,
                    assigned_to_ids: list.map((o) => o.value),
                  }));
                }}
              />
            </Form.Group>
          </Modal.Section>

          <Modal.Section title="Observaciones" className="!p-3.5">
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.observations || ""}
              disabled={readOnly}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  observations: e.target.value,
                }))
              }
            />
          </Modal.Section>
        </Form>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {formError ? (
          <Alert variant="danger" className="mb-3">
            {formError}
          </Alert>
        ) : null}

        {formData.id ? (
          <Tabs activeKey={activeTab} onSelect={setActiveTab}>
            <Tab eventKey="details" title="Detalles">
              <div className="pt-1">{detailsForm}</div>
            </Tab>
            <Tab eventKey="history" title="Historial">
              <div className="pt-3">
                {activeTab === "history" ? (
                  <TaskLogsPanel taskId={formData.id} />
                ) : null}
              </div>
            </Tab>
          </Tabs>
        ) : (
          detailsForm
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          {readOnly ? "Cerrar" : "Cancelar"}
        </Button>
        {!readOnly ? (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}
