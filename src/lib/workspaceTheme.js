const DEFAULT_PRIMARY = "#0ea5e9";
const DEFAULT_SECONDARY = "#6366f1";

const BRAND_CSS_KEYS = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-gradient",
  "--brand-gradient-hover",
  "--accent",
  "--accent-hover",
  "--accent-muted",
  "--sidebar-text-active",
];

/**
 * @param {string | null | undefined} color
 * @param {string} fallback
 */
export function normalizeHexColor(color, fallback) {
  if (!color || typeof color !== "string") return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(trimmed)) return trimmed;
  if (/^[0-9A-Fa-f]{3,8}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 */
export function buildWorkspaceBrandVars(workspace) {
  const primary = normalizeHexColor(workspace?.primary_color, DEFAULT_PRIMARY);
  const secondary = normalizeHexColor(workspace?.secondary_color, DEFAULT_SECONDARY);

  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-gradient": `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    "--brand-gradient-hover": `linear-gradient(135deg, color-mix(in srgb, ${primary} 88%, black) 0%, color-mix(in srgb, ${secondary} 88%, black) 100%)`,
    "--accent": primary,
    "--accent-hover": `color-mix(in srgb, ${primary} 85%, black)`,
    "--accent-muted": `color-mix(in srgb, ${primary} 14%, white)`,
    "--sidebar-text-active": primary,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 */
export function applyWorkspaceTheme(workspace) {
  if (typeof document === "undefined") return;

  const vars = buildWorkspaceBrandVars(workspace);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function clearWorkspaceTheme() {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  BRAND_CSS_KEYS.forEach((key) => {
    root.style.removeProperty(key);
  });
}
