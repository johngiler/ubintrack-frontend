"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ImageIcon, Save } from "lucide-react";

import { Alert, Button, Card, Col, Form, Row } from "@/components/ui/bootstrap";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { isWorkspaceAdministrator } from "@/lib/wmsUserDisplay";
import { getOwnerSettings, updateOwnerSettings } from "@/services/workspaceService";

const EMPTY_FORM = {
  name: "",
  legal_name: "",
  rif: "",
  primary_color: "",
  secondary_color: "",
  support_email: "",
  phone: "",
  app_title: "",
  app_tagline: "",
  invoice_prefix: "",
};

function ReadOnlyField({ label, value, hint }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="font-mono text-sm font-medium text-[var(--foreground)]">{value || "—"}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{hint}</p> : null}
    </div>
  );
}

function ImagePreview({ label, url, file, onChange }) {
  const previewUrl = file ? URL.createObjectURL(file) : url;

  useEffect(() => {
    if (!file) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [file, previewUrl]);

  return (
    <Form.Group className="mb-0 h-full">
      <Form.Label>{label}</Form.Label>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        {previewUrl ? (
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={label} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)]">
            <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        <Form.Control type="file" accept="image/*,.svg,.ico" onChange={onChange} className="w-full text-xs" />
      </div>
    </Form.Group>
  );
}

export default function OwnerSettingsView() {
  const router = useRouter();
  const { user } = useAuth();
  const { reloadWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [mediaUrls, setMediaUrls] = useState({
    logo_url: null,
    logo_mark_url: null,
    favicon_url: null,
  });
  const [files, setFiles] = useState({
    logo: null,
    logo_mark: null,
    favicon: null,
  });

  const isAdmin = isWorkspaceAdministrator(user);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.replace("/dashboards/sales");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    (async () => {
      try {
        const data = await getOwnerSettings();
        if (!active) return;
        setSlug(data.slug || "");
        setForm({
          name: data.name || "",
          legal_name: data.legal_name || "",
          rif: data.rif || "",
          primary_color: data.primary_color || "",
          secondary_color: data.secondary_color || "",
          support_email: data.support_email || "",
          phone: data.phone || "",
          app_title: data.app_title || "",
          app_tagline: data.app_tagline || "",
          invoice_prefix: data.invoice_prefix || "",
        });
        setMediaUrls({
          logo_url: data.logo_url || null,
          logo_mark_url: data.logo_mark_url || null,
          favicon_url: data.favicon_url || null,
        });
      } catch {
        if (active) setError("No se pudo cargar la configuración del owner.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(null);
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [field]: file }));
    setSuccess(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const hasFiles = Boolean(files.logo || files.logo_mark || files.favicon);
      let payload;

      if (hasFiles) {
        payload = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          payload.append(key, value ?? "");
        });
        if (files.logo) payload.append("logo", files.logo);
        if (files.logo_mark) payload.append("logo_mark", files.logo_mark);
        if (files.favicon) payload.append("favicon", files.favicon);
      } else {
        payload = { ...form };
      }

      const updated = await updateOwnerSettings(payload);
      setForm({
        name: updated.name || "",
        legal_name: updated.legal_name || "",
        rif: updated.rif || "",
        primary_color: updated.primary_color || "",
        secondary_color: updated.secondary_color || "",
        support_email: updated.support_email || "",
        phone: updated.phone || "",
        app_title: updated.app_title || "",
        app_tagline: updated.app_tagline || "",
        invoice_prefix: updated.invoice_prefix || "",
      });
      setMediaUrls({
        logo_url: updated.logo_url || null,
        logo_mark_url: updated.logo_mark_url || null,
        favicon_url: updated.favicon_url || null,
      });
      setFiles({ logo: null, logo_mark: null, favicon: null });
      setSuccess("Configuración del owner actualizada correctamente.");
      await reloadWorkspace();
    } catch (err) {
      const data = err?.response?.data;
      const firstFieldError = data && typeof data === "object"
        ? Object.values(data).flat().find((msg) => typeof msg === "string")
        : null;
      setError(firstFieldError || data?.detail || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <WmsPageHeader
        title="Configuración del propietario"
        icon={Building2}
        description="Parámetros del workspace. El identificador de URL (slug) no se puede modificar."
        breadcrumbs={[
          { title: "Mi cuenta", href: "/account/profile" },
          { title: "Configuración del propietario", active: true },
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
        </div>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col xl={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h2 className="mb-0 text-base font-semibold text-[var(--foreground)]">Identificación</h2>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <ReadOnlyField
                        label="Slug (URL)"
                        value={slug}
                        hint="Determina el subdominio del WMS. No es editable."
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="name">Nombre comercial</Form.Label>
                        <Form.Control
                          id="name"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="legal_name">Razón social</Form.Label>
                        <Form.Control
                          id="legal_name"
                          name="legal_name"
                          value={form.legal_name}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="rif">RIF</Form.Label>
                        <Form.Control id="rif" name="rif" value={form.rif} onChange={handleChange} />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xl={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h2 className="mb-0 text-base font-semibold text-[var(--foreground)]">Marca y apariencia</h2>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="app_title">Título del WMS</Form.Label>
                        <Form.Control
                          id="app_title"
                          name="app_title"
                          value={form.app_title}
                          onChange={handleChange}
                          placeholder="Nombre visible en la interfaz"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="app_tagline">Eslogan</Form.Label>
                        <Form.Control
                          id="app_tagline"
                          name="app_tagline"
                          value={form.app_tagline}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="primary_color">Color primario</Form.Label>
                        <div className="flex gap-2">
                          <Form.Control
                            id="primary_color"
                            name="primary_color"
                            value={form.primary_color}
                            onChange={handleChange}
                            placeholder="#0066cc"
                          />
                          <input
                            type="color"
                            value={form.primary_color?.startsWith("#") ? form.primary_color : "#0066cc"}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, primary_color: e.target.value }));
                              setSuccess(null);
                            }}
                            className="h-[38px] w-10 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                            aria-label="Selector color primario"
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="secondary_color">Color secundario</Form.Label>
                        <div className="flex gap-2">
                          <Form.Control
                            id="secondary_color"
                            name="secondary_color"
                            value={form.secondary_color}
                            onChange={handleChange}
                            placeholder="#ff6600"
                          />
                          <input
                            type="color"
                            value={form.secondary_color?.startsWith("#") ? form.secondary_color : "#ff6600"}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, secondary_color: e.target.value }));
                              setSuccess(null);
                            }}
                            className="h-[38px] w-10 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                            aria-label="Selector color secundario"
                          />
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row className="g-3 mt-1">
                    <Col xs={12} md={4}>
                      <ImagePreview
                        label="Logo"
                        url={mediaUrls.logo_url}
                        file={files.logo}
                        onChange={handleFileChange("logo")}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <ImagePreview
                        label="Isotipo"
                        url={mediaUrls.logo_mark_url}
                        file={files.logo_mark}
                        onChange={handleFileChange("logo_mark")}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <ImagePreview
                        label="Favicon"
                        url={mediaUrls.favicon_url}
                        file={files.favicon}
                        onChange={handleFileChange("favicon")}
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xl={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h2 className="mb-0 text-base font-semibold text-[var(--foreground)]">Contacto y facturación</h2>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="support_email">Correo de soporte</Form.Label>
                        <Form.Control
                          id="support_email"
                          name="support_email"
                          type="email"
                          value={form.support_email}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="phone">Teléfono</Form.Label>
                        <Form.Control id="phone" name="phone" value={form.phone} onChange={handleChange} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-0">
                        <Form.Label htmlFor="invoice_prefix">Prefijo de factura</Form.Label>
                        <Form.Control
                          id="invoice_prefix"
                          name="invoice_prefix"
                          value={form.invoice_prefix}
                          onChange={handleChange}
                          placeholder="Ej. RBCOLD"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={saving} icon={Save}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
