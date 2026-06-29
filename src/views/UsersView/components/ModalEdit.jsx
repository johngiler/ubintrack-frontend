"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, EyeOff, Save, X } from "lucide-react";

import { Modal, Button, Form, Row, Col, Alert } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { createUser, updateUser, getProfiles } from "@/services/coreService";
import { getUserRoleLabel } from "@/lib/wmsUserDisplay";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import { useAuth } from "@/context/AuthContext";

const EMPTY_USER = {
  full_name: "",
  email: "",
  user_type: "",
  profile_id: null,
  profile: null,
  is_active: true,
  plain_password: "",
};

const STAFF_USER_TYPES = [
  { value: "administrador", label: "Administrador" },
  { value: "empleado", label: "Empleado" },
];

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function ModalEdit({ show, onHide, user, mode, onSave, showAlert }) {
  const authUser = useAuth().user;
  const navigate = useWmsNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_USER);
  const [employeeProfiles, setEmployeeProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const readOnly = mode === "view";
  const isEditMode = mode === "edit";
  const isEmployee = formData.user_type === "empleado";
  const isSelf = Boolean(formData.id && authUser?.id && formData.id === authUser.id);

  useEffect(() => {
    if (!show || readOnly || !isEmployee) return undefined;

    let cancelled = false;
    setIsLoadingProfiles(true);

    getProfiles(1, "", { is_active: "true", user_type: "empleado" }, 100)
      .then((response) => {
        if (cancelled) return;
        setEmployeeProfiles(response.results || []);
      })
      .catch(() => {
        if (!cancelled) setEmployeeProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfiles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, readOnly, isEmployee]);

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        profile_id: user.profile_id ?? null,
        profile: user.profile ?? null,
        plain_password: "",
      });
    } else {
      setFormData(EMPTY_USER);
    }
    if (!show) {
      setShowValidation(false);
      setShowPassword(false);
    }
  }, [user, show]);

  const profileOptions = useMemo(
    () =>
      employeeProfiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    [employeeProfiles],
  );

  const handleUserTypeChange = (userType) => {
    if (readOnly || isSelf) return;
    setFormData((prev) => ({
      ...prev,
      user_type: prev.user_type === userType ? "" : userType,
      profile_id: userType === "empleado" ? prev.profile_id : null,
      profile: userType === "empleado" ? prev.profile : null,
    }));
  };

  const handleProfileChange = (selectedId) => {
    const selected = employeeProfiles.find((p) => String(p.id) === String(selectedId));
    setFormData((prev) => ({
      ...prev,
      profile_id: selected?.id ?? null,
      profile: selected?.name ?? null,
    }));
  };

  const handleSave = async () => {
    const nameMissing = isBlank(formData.full_name);
    const emailMissing = isBlank(formData.email);
    const userTypeMissing = !formData.user_type;
    const profileMissing = formData.user_type === "empleado" && !formData.profile_id;
    const passwordMissing = !formData.id && isBlank(formData.plain_password);

    if (nameMissing || emailMissing || userTypeMissing || profileMissing || passwordMissing) {
      setShowValidation(true);
      if (passwordMissing) {
        showAlert("danger", "La contraseña es obligatoria para usuarios nuevos.");
      } else if (profileMissing) {
        showAlert("danger", "Seleccione un perfil de tipo Empleado.");
      } else if (userTypeMissing) {
        showAlert("danger", "Seleccione Administrador o Empleado.");
      } else {
        showAlert("danger", "Complete todos los campos obligatorios del usuario.");
      }
      return;
    }

    setShowValidation(false);
    setIsSaving(true);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        ...(isSelf
          ? {}
          : {
              is_active: formData.is_active,
              user_type: formData.user_type,
              ...(formData.user_type === "empleado"
                ? { profile_id: formData.profile_id }
                : { profile_id: null }),
            }),
        ...(formData.plain_password ? { plain_password: formData.plain_password } : {}),
      };

      if (formData.id) {
        await updateUser(formData.id, payload);
      } else {
        await createUser(payload);
      }

      await onSave();
      onHide();
      showAlert("success", "Usuario guardado correctamente");
    } catch {
      showAlert("danger", "Error al guardar el usuario");
    } finally {
      setIsSaving(false);
    }
  };

  const title = readOnly ? "Ver usuario" : formData?.id ? "Editar usuario" : "Nuevo usuario";

  const nameMissing = showValidation && isBlank(formData.full_name);
  const emailMissing = showValidation && isBlank(formData.email);
  const userTypeMissing = showValidation && !formData.user_type;
  const profileMissing = showValidation && isEmployee && !formData.profile_id;
  const passwordMissing = showValidation && !formData.id && isBlank(formData.plain_password);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="overflow-y-auto">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Modal.Section title="Datos del usuario" className="!p-3.5">
            <Row className="mb-0 gap-y-3">
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Nombre completo <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    required
                    isInvalid={nameMissing}
                    value={formData.full_name || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                  {nameMissing && (
                    <Form.Text className="text-danger">El nombre completo es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    required
                    isInvalid={emailMissing}
                    value={formData.email || ""}
                    readOnly={readOnly}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {emailMissing && (
                    <Form.Text className="text-danger">El email es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={12} className="mb-0">
                <Form.Group className="mb-0">
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Tipo de usuario <span className="text-red-500">*</span>
                  </Form.Label>
                  {readOnly || isSelf ? (
                    <div className="pt-1">
                      <Badge variant="secondary" dot={false}>
                        {getUserRoleLabel(formData)}
                      </Badge>
                      {isSelf && !readOnly && (
                        <Form.Text className="text-muted">
                          No puede cambiar su propio tipo de usuario.
                        </Form.Text>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-4">
                        {STAFF_USER_TYPES.map(({ value, label }) => (
                          <Form.Check
                            key={value}
                            type="checkbox"
                            id={`user-type-${value}`}
                            checked={formData.user_type === value}
                            onChange={() => handleUserTypeChange(value)}
                            label={label}
                          />
                        ))}
                      </div>
                      {userTypeMissing && (
                        <Form.Text className="text-danger">
                          Seleccione Administrador o Empleado.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
              {isEmployee && (
                <Col md={12} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      Perfil <span className="text-red-500">*</span>
                    </Form.Label>
                    {readOnly ? (
                      <Form.Control value={formData.profile || "—"} readOnly />
                    ) : isLoadingProfiles ? (
                      <Form.Control value="Cargando perfiles…" readOnly disabled />
                    ) : employeeProfiles.length === 0 ? (
                      <Alert variant="warning" className="mb-0 text-sm">
                        <p className="mb-2">
                          No hay perfiles activos de tipo Empleado. Cree uno antes de asignarlo.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ExternalLink}
                          onClick={() => navigate("/core/profiles")}
                        >
                          Ir a crear perfil
                        </Button>
                      </Alert>
                    ) : (
                      <>
                        <Select
                          inputId="staff-user-profile"
                          name="staff-user-profile"
                          options={profileOptions}
                          value={formData.profile_id ?? ""}
                          placeholder="Seleccione un perfil"
                          isSearchable={false}
                          autoComplete="off"
                          isInvalid={profileMissing}
                          onChange={(e) => handleProfileChange(e.target.value)}
                        />
                        {profileMissing && (
                          <Form.Text className="text-danger">
                            Debe seleccionar un perfil de tipo Empleado.
                          </Form.Text>
                        )}
                      </>
                    )}
                  </Form.Group>
                </Col>
              )}
              {!readOnly && (
                <Col md={12} className="mb-0">
                  <Form.Group className="mb-0">
                    <Form.Label className="!text-xs !font-medium !text-slate-600">
                      {formData.id ? "Nueva contraseña" : "Contraseña"}
                      {!formData.id && <span className="text-red-500"> *</span>}
                    </Form.Label>
                    <div className="relative">
                      <Form.Control
                        id="staff-user-password"
                        name="staff-user-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required={!formData.id}
                        isInvalid={passwordMissing}
                        className="!pr-10"
                        placeholder={
                          formData.id ? "Dejar vacío para mantener la actual" : undefined
                        }
                        value={formData.plain_password || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, plain_password: e.target.value })
                        }
                      />
                      <IconButton
                        size="sm"
                        type="button"
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-slate-100"
                        onClick={() => setShowPassword((prev) => !prev)}
                        title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </IconButton>
                    </div>
                    {passwordMissing ? (
                      <Form.Text className="text-danger">La contraseña es obligatoria.</Form.Text>
                    ) : formData.id ? (
                      <Form.Text className="text-muted">
                        Solo complete este campo si desea cambiar la contraseña.
                      </Form.Text>
                    ) : null}
                  </Form.Group>
                </Col>
              )}
              <Col md={12} className="mb-0">
                <Form.Check
                  type="switch"
                  id="staff-user-is-active"
                  label={formData.is_active ? "Activo" : "Inactivo"}
                  checked={formData.is_active}
                  disabled={readOnly || isSelf}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                {isSelf && !readOnly && (
                  <Form.Text className="text-muted">
                    No puede desactivar su propio usuario.
                  </Form.Text>
                )}
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
          <Button variant="primary" icon={Save} onClick={handleSave} disabled={isSaving} loading={isSaving}>
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
