"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { formatDateTime } from "@/lib/format";
import { getUsers } from "@/services/coreService";
import { getTasks } from "@/services/taskService";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";

function toInputDateTime(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function fromInputDateTime(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export default function ModalEdit({ show, onHide, tracking, mode, onSave, showAlert }) {
  const [formData, setFormData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const readOnly = mode === "view";
  const isNew = !formData?.id;

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setIsLoadingData(true);

    Promise.all([
      getTasks(1, {}, "", 200),
      getUsers(1, "", { staff_only: true, is_active: "true" }),
    ])
      .then(([tasksData, usersData]) => {
        if (cancelled) return;
        setTasks(tasksData.results || []);
        setUsers(usersData.results || usersData || []);
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
      tracking || {
        is_active: true,
        timer_start: new Date().toISOString(),
        timer_stop: null,
        task: null,
        user: null,
      },
    );
  }, [tracking, show]);

  const handleSave = async () => {
    if (!formData?.task?.id || !formData?.user?.id) {
      showAlert("danger", "Seleccione tarea y usuario");
      return;
    }
    if (!formData.timer_start) {
      showAlert("danger", "La fecha de inicio es obligatoria");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        task_id: formData.task.id,
        user_id: formData.user.id,
        timer_start: formData.timer_start,
        timer_stop: formData.timer_stop,
        is_active: formData.is_active,
      });
      onHide();
    } catch {
      showAlert("danger", "Error al guardar el seguimiento");
    } finally {
      setIsSaving(false);
    }
  };

  if (!formData) return null;

  const title = readOnly ? "Ver seguimiento" : isNew ? "Nuevo seguimiento" : "Editar seguimiento";

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="gap-y-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tarea *</Form.Label>
              <select
                className={selectClass}
                value={formData.task?.id || ""}
                disabled={readOnly || isLoadingData}
                onChange={(e) => {
                  const task = tasks.find((item) => String(item.id) === e.target.value);
                  setFormData((prev) => ({ ...prev, task: task || null }));
                }}
              >
                <option value="">Seleccione una tarea</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.code}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Usuario *</Form.Label>
              <select
                className={selectClass}
                value={formData.user?.id || ""}
                disabled={readOnly || isLoadingData}
                onChange={(e) => {
                  const user = users.find((item) => String(item.id) === e.target.value);
                  setFormData((prev) => ({ ...prev, user: user || null }));
                }}
              >
                <option value="">Seleccione un usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Inicio *</Form.Label>
              <Form.Control
                type="datetime-local"
                value={toInputDateTime(formData.timer_start)}
                readOnly={readOnly}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timer_start: fromInputDateTime(e.target.value),
                  }))
                }
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Fin</Form.Label>
              <Form.Control
                type="datetime-local"
                value={toInputDateTime(formData.timer_stop)}
                readOnly={readOnly}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timer_stop: fromInputDateTime(e.target.value),
                  }))
                }
              />
            </Form.Group>
          </Col>
          {formData.duration ? (
            <Col md={12}>
              <Form.Group>
                <Form.Label>Duración</Form.Label>
                <Form.Control value={String(formData.duration)} readOnly disabled />
              </Form.Group>
            </Col>
          ) : null}
          <Col md={12}>
            <Form.Check
              type="switch"
              id="tracking-is-active"
              label={formData.is_active ? "Activo" : "Inactivo"}
              checked={Boolean(formData.is_active)}
              disabled={readOnly}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
          </Col>
          {readOnly ? (
            <>
              <Col md={6}>
                <Form.Label>Creado</Form.Label>
                <Form.Control value={formatDateTime(formData.created_at)} readOnly disabled />
              </Col>
              <Col md={6}>
                <Form.Label>Actualizado</Form.Label>
                <Form.Control value={formatDateTime(formData.updated_at)} readOnly disabled />
              </Col>
            </>
          ) : null}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          {readOnly ? "Cerrar" : "Cancelar"}
        </Button>
        {!readOnly ? (
          <Button variant="primary" icon={Save} onClick={handleSave} loading={isSaving} disabled={isSaving}>
            {isSaving ? "Guardando…" : isNew ? "Crear seguimiento" : "Guardar cambios"}
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}
