"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import VisibleSliceList from "@/components/ui/VisibleSliceList";
import { formatDateTime } from "@/lib/format";

import { getUsers } from "@/services/coreService";
import { getEntries, getExits } from "@/services/orderService";
import {
  EMPTY_TASK,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "../taskLabels";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";

function formatDateTimeForInput(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

export default function ModalEdit({ show, onHide, task, mode, onSave, showAlert }) {
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [exits, setExits] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const readOnly = mode === "view";
  const isNew = !formData?.id;

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setIsLoadingData(true);

    Promise.all([
      getUsers(1, "", { staff_only: true, is_active: "true" }),
      getEntries(1, {}, ""),
      getExits(1, {}, ""),
    ])
      .then(([usersData, entriesData, exitsData]) => {
        if (cancelled) return;
        setUsers(usersData.results || usersData || []);
        setEntries(entriesData.results || []);
        setExits(exitsData.results || []);
      })
      .catch(() => {
        if (!cancelled) showAlert("danger", "Error al cargar datos del formulario");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, showAlert]);

  useEffect(() => {
    if (!show) return;
    setFormData(
      task
        ? {
            ...task,
            assigned_to_ids: (task.assigned_to || []).map((u) => u.id),
          }
        : { ...EMPTY_TASK },
    );
  }, [task, show]);

  const assignedUserOptions = useMemo(
    () =>
      users
        .filter((user) => !(formData.assigned_to_ids || []).includes(user.id))
        .map((user) => ({ value: user.id, label: user.full_name || user.email })),
    [users, formData.assigned_to_ids],
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUser = (userId) => {
    if (!userId) return;
    const user = users.find((u) => String(u.id) === String(userId));
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      assigned_to: [...(prev.assigned_to || []), user],
      assigned_to_ids: [...(prev.assigned_to_ids || []), user.id],
    }));
  };

  const handleRemoveUser = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assigned_to: (prev.assigned_to || []).filter((u) => u.id !== userId),
      assigned_to_ids: (prev.assigned_to_ids || []).filter((id) => id !== userId),
    }));
  };

  const handleSave = async () => {
    if (!formData.task_type || !formData.status || !formData.priority) {
      showAlert("danger", "Complete tipo, estado y prioridad de la tarea");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        task_type: formData.task_type,
        status: formData.status,
        priority: formData.priority,
        observations: formData.observations,
        is_active: formData.is_active,
        assigned_to_ids: formData.assigned_to_ids || [],
        entry_id: formData.entry?.id || null,
        exit_id: formData.exit?.id || null,
        started_at: formData.started_at,
        completed_at: formData.completed_at,
      });
      onHide();
    } catch {
      showAlert("danger", "Error al guardar la tarea");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly ? "Ver tarea" : isNew ? "Nueva tarea" : "Editar tarea";

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-y-auto">
        <Row className="gap-y-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tipo de tarea *</Form.Label>
              <select
                className={selectClass}
                value={formData.task_type || ""}
                disabled={readOnly}
                onChange={(e) => handleChange("task_type", e.target.value)}
              >
                {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Estado *</Form.Label>
              <select
                className={selectClass}
                value={formData.status || ""}
                disabled={readOnly}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Prioridad *</Form.Label>
              <select
                className={selectClass}
                value={formData.priority || ""}
                disabled={readOnly}
                onChange={(e) => handleChange("priority", e.target.value)}
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Código</Form.Label>
              <Form.Control value={formData.code || "Se genera automáticamente"} readOnly disabled />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Fecha de inicio</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formatDateTimeForInput(formData.started_at)}
                readOnly={readOnly}
                onChange={(e) =>
                  handleChange("started_at", e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Fecha de completado</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formatDateTimeForInput(formData.completed_at)}
                readOnly={readOnly}
                disabled={readOnly || formData.status !== "completada"}
                onChange={(e) =>
                  handleChange(
                    "completed_at",
                    e.target.value ? new Date(e.target.value).toISOString() : null,
                  )
                }
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Usuarios asignados</Form.Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {(formData.assigned_to || []).length ? (
                  formData.assigned_to.map((user) => (
                    <Badge key={user.id} variant="primary" dot={false}>
                      {user.full_name}
                      {!readOnly ? (
                        <button
                          type="button"
                          className="ml-1 text-sky-100 hover:text-white"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          ×
                        </button>
                      ) : null}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">Sin asignar</span>
                )}
              </div>
              {!readOnly ? (
                <Select
                  options={assignedUserOptions}
                  value=""
                  placeholder={
                    isLoadingData
                      ? "Cargando usuarios…"
                      : assignedUserOptions.length
                        ? "Agregar usuario"
                        : "No hay usuarios disponibles"
                  }
                  isDisabled={isLoadingData || assignedUserOptions.length === 0}
                  onChange={(e) => handleAddUser(e.target.value)}
                />
              ) : null}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Orden de entrada</Form.Label>
              <select
                className={selectClass}
                value={formData.entry?.id || ""}
                disabled={readOnly || isLoadingData}
                onChange={(e) => {
                  const entry = entries.find((item) => String(item.id) === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    entry: entry || null,
                    exit: e.target.value ? null : prev.exit,
                  }));
                }}
              >
                <option value="">Seleccione una entrada</option>
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.code}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Orden de salida</Form.Label>
              <select
                className={selectClass}
                value={formData.exit?.id || ""}
                disabled={readOnly || isLoadingData}
                onChange={(e) => {
                  const exit = exits.find((item) => String(item.id) === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    exit: exit || null,
                    entry: e.target.value ? null : prev.entry,
                  }));
                }}
              >
                <option value="">Seleccione una salida</option>
                {exits.map((exit) => (
                  <option key={exit.id} value={exit.id}>
                    {exit.code}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.observations || ""}
                readOnly={readOnly}
                onChange={(e) => handleChange("observations", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Check
              type="switch"
              id="task-is-active"
              label={formData.is_active ? "Activa" : "Inactiva"}
              checked={Boolean(formData.is_active)}
              disabled={readOnly}
              onChange={(e) => handleChange("is_active", e.target.checked)}
            />
          </Col>
        </Row>

        {formData.task_logs?.length ? (
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <h6 className="mb-2 text-sm font-semibold text-slate-800">Historial</h6>
            <VisibleSliceList
              items={formData.task_logs}
              itemLabel="eventos"
              className="max-h-40 space-y-2 overflow-y-auto"
            >
              {(visibleLogs) =>
                visibleLogs.map((log) => (
                  <div key={log.id} className="border-b border-slate-100 pb-2 text-sm">
                    <p className="mb-0 text-xs text-slate-500">
                      {formatDateTime(log.created_at)}
                    </p>
                    <p className="mb-0 text-slate-700">{log.message}</p>
                  </div>
                ))
              }
            </VisibleSliceList>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          {readOnly ? "Cerrar" : "Cancelar"}
        </Button>
        {!readOnly ? (
          <Button variant="primary" icon={Save} onClick={handleSave} loading={isSaving} disabled={isSaving}>
            {isSaving ? "Guardando…" : isNew ? "Crear tarea" : "Guardar cambios"}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}
