"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Save,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Alert, Badge, Button, Card, Col, Form, Row } from "@/components/ui/bootstrap";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  getUserModeKey,
  getUserRoleLabel,
  USER_MODE_INFO,
} from "@/lib/wmsUserDisplay";
import { getMyProfile, updateMyProfile } from "@/services/coreService";

const MODE_ICONS = {
  administrador: Shield,
  cliente: Building2,
  empleado: Users,
};

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default function ProfileView() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    password_confirm: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getMyProfile();
        if (!active) return;
        setProfile(data);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          password: "",
          password_confirm: "",
        });
      } catch {
        if (active) setError("No se pudo cargar la información del usuario.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
      };
      if (form.password) {
        payload.password = form.password;
        payload.password_confirm = form.password_confirm;
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setForm((prev) => ({ ...prev, password: "", password_confirm: "" }));
      setSuccess("Perfil actualizado correctamente.");
      await refreshUser();
    } catch (err) {
      const data = err?.response?.data;
      const message =
        data?.password_confirm?.[0] ||
        data?.password?.[0] ||
        data?.email?.[0] ||
        data?.detail ||
        "No se pudo guardar el perfil.";
      setError(typeof message === "string" ? message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const modeKey = getUserModeKey(profile);
  const modeInfo = modeKey ? USER_MODE_INFO[modeKey] : null;
  const ModeIcon = modeKey ? MODE_ICONS[modeKey] : User;
  const hasAllPermissions = profile?.is_workspace_admin || profile?.user_type === "administrador";

  return (
    <div>
      <WmsPageHeader
        title="Mi cuenta"
        icon={User}
        breadcrumbs={[
          { title: "Cuenta", href: "/account/profile" },
          { title: "Mi cuenta", active: true },
        ]}
      />

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      ) : null}

      <Row>
        <Col xl={12}>
          <Card className="mb-4">
            <Card.Header>
              <h2 className="mb-0 text-base font-semibold text-slate-900">Información del usuario</h2>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="full_name">Nombre completo</Form.Label>
                        <Form.Control
                          id="full_name"
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          placeholder="Nombre y apellido"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="email">Correo electrónico</Form.Label>
                        <Form.Control
                          id="email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="correo@ejemplo.com"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <ReadOnlyField label="Tipo de usuario" value={getUserRoleLabel(profile)} />
                    </Col>
                    <Col md={6}>
                      <ReadOnlyField label="Perfil" value={profile?.profile} />
                    </Col>
                    <Col md={6}>
                      <ReadOnlyField label="Cliente" value={profile?.client?.name} />
                    </Col>
                    <Col md={6}>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Estado
                        </p>
                        <Badge bg="success">Activo</Badge>
                      </div>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="password">Nueva contraseña</Form.Label>
                        <Form.Control
                          id="password"
                          name="password"
                          type="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Dejar vacío para no cambiar"
                          autoComplete="new-password"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="password_confirm">Confirmar contraseña</Form.Label>
                        <Form.Control
                          id="password_confirm"
                          name="password_confirm"
                          type="password"
                          value={form.password_confirm}
                          onChange={handleChange}
                          placeholder="Repetir contraseña"
                          autoComplete="new-password"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="mt-2 flex justify-end">
                    <Button variant="primary" type="submit" disabled={saving} icon={Save}>
                      {saving ? "Guardando…" : "Guardar cambios"}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!loading && modeInfo ? (
        <Row>
          <Col xl={12}>
            <Card className="mb-4 border-sky-200">
              <Card.Body className="flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${modeInfo.iconClass}`}
                  >
                    <ModeIcon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="mb-1 text-base font-semibold text-slate-900">{modeInfo.title}</h2>
                    <p className="max-w-2xl text-sm text-slate-600">{modeInfo.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modeInfo.badges.map((badge) => (
                    <Badge key={badge} bg={modeKey === "administrador" ? "primary" : "secondary"}>
                      {badge}
                    </Badge>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : null}

      {!loading && profile ? (
        <Row>
          <Col xl={12}>
            <Card>
              <Card.Header>
                <h2 className="mb-0 text-base font-semibold text-slate-900">Permisos</h2>
              </Card.Header>
              <Card.Body>
                {hasAllPermissions ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <ShieldCheck className="h-4 w-4 text-sky-600" strokeWidth={2} />
                    Todos los permisos del owner.
                  </div>
                ) : profile.permissions?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {profile.permissions.map((perm) => (
                      <div
                        key={perm.key}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600" strokeWidth={2} />
                          <span className="text-sm font-medium text-slate-900">
                            {perm.friendly_name || perm.name || perm.key}
                          </span>
                        </div>
                        {(perm.description || perm.name) && (
                          <p className="text-xs text-slate-500">{perm.description || perm.name}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">{perm.key}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin permisos</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
