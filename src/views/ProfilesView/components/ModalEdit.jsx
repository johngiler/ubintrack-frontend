"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { getProfileUserTypeLabel } from "@/lib/wmsUserDisplay";
import {
  createProfile,
  updateProfile,
  getPermissions,
} from "@/services/coreService";

const EMPTY_PROFILE = {
  name: "",
  user_type: "",
  permissions: [],
  is_active: true,
};

const PROFILE_USER_TYPES = [
  { value: "cliente", label: "Cliente" },
  { value: "empleado", label: "Empleado" },
];

function isBlank(value) {
  return !String(value ?? "").trim();
}

const MODULE_ORDER = ["task", "storage", "order", "inventory", "core", "finance", "dashboard"];

function groupPermissionsByModule(permissions) {
  const grouped = new Map();

  for (const permission of permissions) {
    const moduleKey = permission.module || "Otros";
    if (!grouped.has(moduleKey)) {
      grouped.set(moduleKey, []);
    }
    grouped.get(moduleKey).push(permission);
  }

  const modules = [...grouped.keys()].sort((a, b) => {
    const indexA = MODULE_ORDER.indexOf(a);
    const indexB = MODULE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return modules.map((moduleKey) => ({
    module: moduleKey,
    permissions: grouped.get(moduleKey) || [],
  }));
}

export default function ModalEdit({ show, onHide, profile, mode, onSave, showAlert }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PROFILE);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setIsLoadingPermissions(true);

    getPermissions()
      .then((data) => {
        if (cancelled) return;
        setAllPermissions(data);
      })
      .catch(() => {
        if (!cancelled) setAllPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPermissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        permissions: profile.permissions || [],
      });
    } else {
      setFormData(EMPTY_PROFILE);
    }
    if (!show) {
      setShowValidation(false);
    }
  }, [profile, show]);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(allPermissions),
    [allPermissions],
  );

  const isPermissionSelected = (permissionId) =>
    formData.permissions?.some((p) => p.id === permissionId) || false;

  const handlePermissionChange = (permission) => {
    const current = [...(formData.permissions || [])];
    const index = current.findIndex((p) => p.id === permission.id);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(permission);
    }

    setFormData({ ...formData, permissions: current });
  };

  const handleSave = async () => {
    const nameMissing = isBlank(formData.name);
    const userTypeMissing = !formData.user_type;
    const permissionsMissing = !(formData.permissions?.length > 0);

    if (nameMissing || userTypeMissing || permissionsMissing) {
      setShowValidation(true);
      if (nameMissing && permissionsMissing && userTypeMissing) {
        showAlert("danger", "Complete el nombre, el tipo de usuario y al menos un permiso.");
      } else if (nameMissing) {
        showAlert("danger", "El nombre del perfil es obligatorio.");
      } else if (userTypeMissing) {
        showAlert("danger", "Seleccione el tipo de usuario del perfil.");
      } else {
        showAlert("danger", "Seleccione al menos un permiso para el perfil.");
      }
      return;
    }

    setShowValidation(false);
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        user_type: formData.user_type,
        is_active: formData.is_active,
        permission_ids: (formData.permissions || []).map((p) => p.id),
      };

      if (formData.id) {
        await updateProfile(formData.id, payload);
      } else {
        await createProfile(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Perfil guardado correctamente");
    } catch {
      showAlert("danger", "Error al guardar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly
    ? "Ver perfil"
    : formData?.id
      ? "Editar perfil"
      : "Nuevo perfil";

  const nameMissing = showValidation && isBlank(formData.name);
  const userTypeMissing = showValidation && !formData.user_type;
  const permissionsMissing = showValidation && !(formData.permissions?.length > 0);

  const handleUserTypeChange = (userType) => {
    if (readOnly) return;
    setFormData((prev) => ({
      ...prev,
      user_type: prev.user_type === userType ? "" : userType,
    }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-y-auto">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Modal.Section title="Datos del perfil" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={12} className="mb-0">
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
              <Col md={12} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tipo de usuario <span className="text-red-500">*</span>
                  </Form.Label>
                  {readOnly ? (
                    <div className="pt-1">
                      <Badge variant={formData.user_type === "cliente" ? "info" : "secondary"} dot={false}>
                        {getProfileUserTypeLabel(formData.user_type)}
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-4">
                        {PROFILE_USER_TYPES.map(({ value, label }) => (
                          <Form.Check
                            key={value}
                            type="checkbox"
                            id={`profile-user-type-${value}`}
                            checked={formData.user_type === value}
                            onChange={() => handleUserTypeChange(value)}
                            label={label}
                          />
                        ))}
                      </div>
                      {userTypeMissing && (
                        <Form.Text className="text-danger">
                          Seleccione Cliente o Empleado.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </Modal.Section>

          <Modal.Section
            title={
              <>
                Permisos <span className="text-red-500">*</span>
              </>
            }
            className={`!p-3.5 ${permissionsMissing ? "ring-1 ring-red-300" : ""}`}
          >
            {permissionsMissing && (
              <Form.Text className="mb-3 block text-danger">
                Seleccione al menos un permiso.
              </Form.Text>
            )}
            {isLoadingPermissions ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Cargando permisos…</span>
                </div>
              </div>
            ) : permissionGroups.length === 0 ? (
              <p className="mb-0 text-sm text-slate-500">No hay permisos disponibles.</p>
            ) : (
              permissionGroups.map(({ module, permissions }) => (
                <div key={module} className="mb-4 last:mb-0">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {String(module).toUpperCase()}
                  </h4>
                  <Row className="gap-y-2">
                    {permissions.map((permission) => (
                      <Col md={6} key={permission.id}>
                        <Form.Check
                          type="checkbox"
                          id={`permission-${permission.id}`}
                          checked={isPermissionSelected(permission.id)}
                          disabled={readOnly}
                          onChange={() => handlePermissionChange(permission)}
                          label={
                            <span>
                              <span className="font-medium text-slate-800">{permission.name}</span>
                              {permission.django_permissions?.length > 0 && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  {permission.django_permissions.map((dp) => dp.name).join(", ")}
                                </span>
                              )}
                            </span>
                          }
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              ))
            )}
          </Modal.Section>

          <Modal.Section title="Estado" className="!p-3.5">
            <Form.Check
              type="switch"
              id="profile-is-active"
              label={formData.is_active ? "Activo" : "Inactivo"}
              checked={formData.is_active}
              disabled={readOnly}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </Modal.Section>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" icon={X} onClick={onHide} disabled={isSaving}>
          Cerrar
        </Button>
        {isEditMode && (
          <Button variant="primary" icon={Save} onClick={handleSave} disabled={isSaving} loading={isSaving}>
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
