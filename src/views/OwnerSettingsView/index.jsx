"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ImageIcon, Save } from "lucide-react";

import { Alert, Button, Card, Col, Form, Row } from "@/components/ui/bootstrap";
import Select from "@/components/ui/Select";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/cn";
import { isWorkspaceAdministrator } from "@/lib/wmsUserDisplay";
import {
  normalizeSidebarLogoGradientMode,
  shouldShowSidebarLogoGradient,
  SIDEBAR_LOGO_GRADIENT_MODES,
} from "@/lib/workspaceMedia";
import { getOwnerSettings, updateOwnerSettings } from "@/services/workspaceService";
import OwnerSettingsSkeleton from "./OwnerSettingsSkeleton";

const GRADIENT_MODE_OPTIONS = [
  { value: SIDEBAR_LOGO_GRADIENT_MODES.NONE, label: "Desactivado" },
  { value: SIDEBAR_LOGO_GRADIENT_MODES.LIGHT, label: "Solo modo claro" },
  { value: SIDEBAR_LOGO_GRADIENT_MODES.DARK, label: "Solo modo oscuro" },
  { value: SIDEBAR_LOGO_GRADIENT_MODES.BOTH, label: "Ambos modos" },
];

const PRINTER_LANGUAGE_OPTIONS = [{ value: "zpl", label: "ZPL" }];

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
  sidebar_logo_gradient_mode: SIDEBAR_LOGO_GRADIENT_MODES.NONE,
  printer_ip: "",
  printer_port: 9100,
  label_width_in: "4.00",
  label_height_in: "2.00",
  printer_dpi: 203,
  printer_language: "zpl",
};

function formFromWorkspace(data) {
  return {
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
    sidebar_logo_gradient_mode: normalizeSidebarLogoGradientMode(data),
    printer_ip: data.printer_ip || "",
    printer_port: data.printer_port ?? 9100,
    label_width_in:
      data.label_width_in != null && data.label_width_in !== ""
        ? String(data.label_width_in)
        : "4.00",
    label_height_in:
      data.label_height_in != null && data.label_height_in !== ""
        ? String(data.label_height_in)
        : "2.00",
    printer_dpi: data.printer_dpi ?? 203,
    printer_language: data.printer_language || "zpl",
  };
}

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

function ImagePreview({ label, url, file, onChange, gradientPreview = false }) {
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
          <div
            className={cn(
              "flex h-20 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] px-2",
              !gradientPreview && "bg-[var(--background)]",
            )}
            style={gradientPreview ? { background: "var(--brand-gradient)" } : undefined}
          >
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
  const { isDark } = useTheme();
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
      router.replace("/dashboard");
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
        setForm(formFromWorkspace(data));
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
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSuccess(null);
  };

  const buildSavePayload = () => {
    const base = { ...form };
    base.printer_port = Number(form.printer_port) || 9100;
    base.printer_dpi = Number(form.printer_dpi) || 203;
    base.label_width_in = form.label_width_in || "4.00";
    base.label_height_in = form.label_height_in || "2.00";
    base.printer_language = form.printer_language || "zpl";
    return base;
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
      const formPayload = buildSavePayload();
      let payload;

      if (hasFiles) {
        payload = new FormData();
        Object.entries(formPayload).forEach(([key, value]) => {
          if (typeof value === "boolean") {
            payload.append(key, value ? "true" : "false");
          } else {
            payload.append(key, value ?? "");
          }
        });
        if (files.logo) payload.append("logo", files.logo);
        if (files.logo_mark) payload.append("logo_mark", files.logo_mark);
        if (files.favicon) payload.append("favicon", files.favicon);
      } else {
        payload = formPayload;
      }

      const updated = await updateOwnerSettings(payload);
      setForm(formFromWorkspace(updated));
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
        <OwnerSettingsSkeleton />
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
                            className="h-[38px] w-10 shrink-0 cursor-pointer rounded border border-[var(--input-border)] bg-transparent"
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
                            className="h-[38px] w-10 shrink-0 cursor-pointer rounded border border-[var(--input-border)] bg-transparent"
                            aria-label="Selector color secundario"
                          />
                        </div>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group className="mb-0">
                        <Form.Label htmlFor="sidebar_logo_gradient_mode">
                          Fondo gradiente en el logo del menú lateral
                        </Form.Label>
                        <Form.Select
                          id="sidebar_logo_gradient_mode"
                          name="sidebar_logo_gradient_mode"
                          value={form.sidebar_logo_gradient_mode}
                          onChange={handleChange}
                        >
                          {GRADIENT_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-[var(--foreground-muted)]">
                          Usa los colores primario y secundario detrás del logo según el tema activo.
                          La vista previa refleja el modo que tienes ahora (
                          {isDark ? "oscuro" : "claro"}).
                        </Form.Text>
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
                        gradientPreview={shouldShowSidebarLogoGradient(
                          form.sidebar_logo_gradient_mode,
                          isDark,
                        )}
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
                          placeholder="Ej. ACME"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xl={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h2 className="mb-0 text-base font-semibold text-[var(--foreground)]">Impresora</h2>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="printer_ip">IP o host</Form.Label>
                        <Form.Control
                          id="printer_ip"
                          name="printer_ip"
                          value={form.printer_ip}
                          onChange={handleChange}
                          placeholder="192.168.1.50"
                          autoComplete="off"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="printer_port">Puerto</Form.Label>
                        <Form.Control
                          id="printer_port"
                          name="printer_port"
                          type="number"
                          min={1}
                          max={65535}
                          value={form.printer_port}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="label_width_in">Ancho (pulgadas)</Form.Label>
                        <Form.Control
                          id="label_width_in"
                          name="label_width_in"
                          type="number"
                          min={0.5}
                          max={12}
                          step={0.01}
                          value={form.label_width_in}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="label_height_in">Alto (pulgadas)</Form.Label>
                        <Form.Control
                          id="label_height_in"
                          name="label_height_in"
                          type="number"
                          min={0.5}
                          max={12}
                          step={0.01}
                          value={form.label_height_in}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label htmlFor="printer_dpi">DPI</Form.Label>
                        <Form.Control
                          id="printer_dpi"
                          name="printer_dpi"
                          type="number"
                          min={72}
                          max={600}
                          value={form.printer_dpi}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-0">
                        <Form.Label htmlFor="printer_language">Lenguaje</Form.Label>
                        <Select
                          inputId="printer_language"
                          name="printer_language"
                          options={PRINTER_LANGUAGE_OPTIONS}
                          value={form.printer_language || "zpl"}
                          onChange={handleChange}
                          isClearable={false}
                          isSearchable={false}
                        />
                        <Form.Text className="text-[var(--foreground-muted)]">
                          IP, puerto y lenguaje son obligatorios para imprimir. Si cambias
                          medida o DPI, regenera las etiquetas en posiciones y bins.
                        </Form.Text>
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
