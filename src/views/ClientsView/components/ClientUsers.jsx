"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Eye, EyeOff, Mail, Plus, Shield, Trash2, User } from "lucide-react";

import { Alert, Button, Form, Row, Col } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { formatDate } from "@/lib/format";
import { getProfiles } from "@/services/coreService";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import ReadOnlyDetail from "./ReadOnlyDetail";

function isBlank(value) {
  return !String(value ?? "").trim();
}

function isFieldInvalid(user, field, showValidation) {
  if (!showValidation) return false;

  switch (field) {
    case "full_name":
      return isBlank(user.full_name);
    case "email":
      return isBlank(user.email);
    case "plain_password":
      return !user.id && isBlank(user.plain_password);
    case "profile_id":
      return !user.profile_id;
    default:
      return false;
  }
}

export default function ClientUsers({ users, onChange, readOnly, validateProfiles = false }) {
  const navigate = useWmsNavigate();
  const [expandedUser, setExpandedUser] = useState(null);
  const [visiblePasswordFor, setVisiblePasswordFor] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  useEffect(() => {
    if (readOnly) return undefined;

    let cancelled = false;
    setIsLoadingProfiles(true);

    getProfiles(1, "", { is_active: "true", user_type: "cliente" }, 100)
      .then((response) => {
        if (cancelled) return;
        setProfiles(response.results || []);
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfiles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const profileOptions = useMemo(
    () =>
      profiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    [profiles],
  );

  const hasProfiles = profiles.length > 0;

  const handleAddUser = () => {
    if (!hasProfiles) return;

    const newIndex = users.length;
    const defaultProfile = profiles.length === 1 ? profiles[0] : null;

    onChange([
      ...users,
      {
        temp_id: Date.now(),
        email: "",
        full_name: "",
        is_active: true,
        plain_password: "",
        profile_id: defaultProfile?.id ?? null,
        profile: defaultProfile?.name ?? null,
      },
    ]);
    setExpandedUser(newIndex);
  };

  const handleUpdateUser = (index, field, value) => {
    const newUsers = [...users];
    newUsers[index] = { ...newUsers[index], [field]: value };
    onChange(newUsers);
  };

  const handleProfileChange = (index, selectedId) => {
    const selected = profiles.find((p) => String(p.id) === String(selectedId));
    const newUsers = [...users];
    newUsers[index] = {
      ...newUsers[index],
      profile_id: selected?.id ?? null,
      profile: selected?.name ?? null,
    };
    onChange(newUsers);
  };

  const handleRemoveUser = (index) => {
    onChange(users.filter((_, i) => i !== index));
    if (expandedUser === index) setExpandedUser(null);
  };

  const getUserLabel = (user) => user.full_name || user.email || "Nuevo usuario";

  const renderNoProfilesAlert = () => (
    <Alert variant="warning" className="mb-3 text-sm">
      <p className="mb-2">
        No hay perfiles activos disponibles. Debe crear al menos un perfil antes de asociar
        usuarios al cliente.
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
  );

  const renderUserForm = (user, index) => {
    const isExpanded = expandedUser === index;
    const fullNameMissing = isFieldInvalid(user, "full_name", validateProfiles);
    const emailMissing = isFieldInvalid(user, "email", validateProfiles);
    const passwordMissing = isFieldInvalid(user, "plain_password", validateProfiles);
    const profileMissing = isFieldInvalid(user, "profile_id", validateProfiles);
    const userKey = user.id || user.temp_id;
    const isPasswordVisible = visiblePasswordFor === userKey;

    return (
      <div
        key={user.id || user.temp_id}
        className="mb-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/60 dark:bg-[var(--surface)]"
      >
        <div
          className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
          onClick={() => setExpandedUser(isExpanded ? null : index)}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Usuario {index + 1}</span>
            <span className="truncate text-sm text-slate-500 dark:text-slate-400">{getUserLabel(user)}</span>
            {user.profile && (
              <span className="truncate text-xs text-slate-400">· {user.profile}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={user.is_active ? "success" : "danger"} dot={false}>
              {user.is_active ? "Activo" : "Inactivo"}
            </Badge>
            <IconButton
              size="sm"
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveUser(index);
              }}
              title="Eliminar usuario"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
        {isExpanded && (
          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-700/60">
            <Row className="gap-y-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Nombre completo <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    id={`client-user-full-name-${user.id || user.temp_id}`}
                    name={`client-user-full-name-${user.id || user.temp_id}`}
                    autoComplete="name"
                    required
                    isInvalid={fullNameMissing}
                    value={user.full_name || ""}
                    onChange={(e) => handleUpdateUser(index, "full_name", e.target.value)}
                  />
                  {fullNameMissing && (
                    <Form.Text className="text-danger">El nombre completo es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </Form.Label>
                  <Form.Control
                    id={`client-user-email-${user.id || user.temp_id}`}
                    name={`client-user-email-${user.id || user.temp_id}`}
                    type="email"
                    autoComplete="email"
                    required
                    isInvalid={emailMissing}
                    value={user.email || ""}
                    onChange={(e) => handleUpdateUser(index, "email", e.target.value)}
                  />
                  {emailMissing && (
                    <Form.Text className="text-danger">El email es obligatorio.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    {user.id ? "Nueva contraseña" : "Contraseña"}
                    {!user.id && <span className="text-red-500"> *</span>}
                  </Form.Label>
                  <div className="relative">
                    <Form.Control
                      id={`client-user-password-${userKey}`}
                      name={`client-user-password-${userKey}`}
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="new-password"
                      required={!user.id}
                      isInvalid={passwordMissing}
                      className="!pr-10"
                      placeholder={user.id ? "Dejar vacío para mantener la actual" : undefined}
                      value={user.plain_password || ""}
                      onChange={(e) => handleUpdateUser(index, "plain_password", e.target.value)}
                    />
                    <IconButton
                      size="sm"
                      type="button"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      onClick={() =>
                        setVisiblePasswordFor(isPasswordVisible ? null : userKey)
                      }
                      title={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </IconButton>
                  </div>
                  {passwordMissing ? (
                    <Form.Text className="text-danger">La contraseña es obligatoria.</Form.Text>
                  ) : user.id ? (
                    <Form.Text className="text-muted">
                      Solo complete este campo si desea cambiar la contraseña.
                    </Form.Text>
                  ) : null}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="!text-xs !font-medium !text-slate-600">
                    Perfil <span className="text-red-500">*</span>
                  </Form.Label>
                  {isLoadingProfiles ? (
                    <Form.Control value="Cargando perfiles…" readOnly disabled />
                  ) : !hasProfiles ? (
                    renderNoProfilesAlert()
                  ) : (
                    <>
                      <Select
                        inputId={`client-user-profile-${user.id || user.temp_id}`}
                        name={`client-user-profile-${user.id || user.temp_id}`}
                        options={profileOptions}
                        value={user.profile_id ?? ""}
                        placeholder="Seleccione un perfil"
                        isSearchable={false}
                        autoComplete="off"
                        isInvalid={profileMissing}
                        onChange={(e) => handleProfileChange(index, e.target.value)}
                      />
                      {profileMissing && (
                        <Form.Text className="text-danger">
                          Debe seleccionar un perfil para este usuario.
                        </Form.Text>
                      )}
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check
                  type="switch"
                  id={`user-active-${user.id || user.temp_id}`}
                  label={user.is_active ? "Activo" : "Inactivo"}
                  checked={user.is_active}
                  onChange={(e) => handleUpdateUser(index, "is_active", e.target.checked)}
                />
              </Col>
            </Row>
          </div>
        )}
      </div>
    );
  };

  const renderUserCard = (user) => (
    <article
      key={user.id || user.temp_id}
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-[var(--surface)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h6 className="mb-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user.full_name || "—"}
            </h6>
            <p className="mb-0 truncate text-xs text-slate-500">{user.email || "Sin email"}</p>
          </div>
        </div>
        <Badge variant={user.is_active ? "success" : "danger"} dot={false}>
          {user.is_active ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReadOnlyDetail label="Email">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{user.email || "—"}</span>
          </span>
        </ReadOnlyDetail>
        <ReadOnlyDetail label="Perfil">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{user.profile || "—"}</span>
          </span>
        </ReadOnlyDetail>
        <ReadOnlyDetail
          label="Fecha de creación"
          value={user.date_joined ? formatDate(user.date_joined) : "—"}
        />
      </div>
    </article>
  );

  return (
    <>
      {!readOnly && !isLoadingProfiles && !hasProfiles && renderNoProfilesAlert()}

      <div className="mb-3 flex items-center justify-end gap-2">
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleAddUser}
            disabled={isLoadingProfiles || !hasProfiles}
            title={
              !hasProfiles && !isLoadingProfiles
                ? "Cree un perfil antes de agregar usuarios"
                : undefined
            }
          >
            Agregar usuario
          </Button>
        )}
      </div>

      {users?.length > 0 ? (
        readOnly ? (
          <div className="space-y-3">{users.map((user) => renderUserCard(user))}</div>
        ) : (
          users.map((user, index) => renderUserForm(user, index))
        )
      ) : (
        <Alert variant="info" className="mb-0 text-sm">
          No hay usuarios registrados
        </Alert>
      )}
    </>
  );
}
