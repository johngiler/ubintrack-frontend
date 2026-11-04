/**
 * Resuelve URLs de media del workspace para el navegador.
 * Prefiere rutas `/media/...` (proxy de Next) frente al host del API.
 */

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function resolveWorkspaceMediaUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/media/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/media/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* URL relativa o inválida */
  }

  if (trimmed.startsWith("/")) return `${apiBase()}${trimmed}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `${apiBase()}/${trimmed}`;
}

/** @typedef {"none" | "light" | "dark" | "both"} SidebarLogoGradientMode */

export const SIDEBAR_LOGO_GRADIENT_MODES = {
  NONE: "none",
  LIGHT: "light",
  DARK: "dark",
  BOTH: "both",
};

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 * @returns {SidebarLogoGradientMode}
 */
export function normalizeSidebarLogoGradientMode(workspace) {
  const mode = workspace?.sidebar_logo_gradient_mode;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.LIGHT) return SIDEBAR_LOGO_GRADIENT_MODES.LIGHT;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.DARK) return SIDEBAR_LOGO_GRADIENT_MODES.DARK;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.BOTH) return SIDEBAR_LOGO_GRADIENT_MODES.BOTH;
  if (workspace?.sidebar_logo_gradient) return SIDEBAR_LOGO_GRADIENT_MODES.BOTH;
  return SIDEBAR_LOGO_GRADIENT_MODES.NONE;
}

/**
 * @param {SidebarLogoGradientMode | string | null | undefined} mode
 * @param {boolean} isDark
 */
export function shouldShowSidebarLogoGradient(mode, isDark) {
  if (!mode || mode === SIDEBAR_LOGO_GRADIENT_MODES.NONE) return false;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.BOTH) return true;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.LIGHT) return !isDark;
  if (mode === SIDEBAR_LOGO_GRADIENT_MODES.DARK) return isDark;
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 * @param {boolean} isDark
 */
export function isSidebarLogoGradientEnabled(workspace, isDark) {
  if (!workspace) return false;
  return shouldShowSidebarLogoGradient(normalizeSidebarLogoGradientMode(workspace), isDark);
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 * @returns {string | null}
 */
export function getWorkspaceLogotypeUrl(workspace) {
  if (!workspace) return null;
  const raw = workspace.logo_mark_url || workspace.logo_url || null;
  return resolveWorkspaceMediaUrl(raw);
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 * @returns {string | null}
 */
export function getWorkspaceLogoUrl(workspace) {
  if (!workspace) return null;
  const raw = workspace.logo_url || workspace.logo_mark_url || null;
  return resolveWorkspaceMediaUrl(raw);
}

/**
 * @param {Record<string, unknown> | null | undefined} workspace
 * @returns {string | null}
 */
export function getWorkspaceIconUrl(workspace) {
  if (!workspace) return null;
  const raw =
    workspace.favicon_url || workspace.logo_mark_url || workspace.logo_url || null;
  return resolveWorkspaceMediaUrl(raw);
}

/**
 * @param {string} href
 * @returns {string | undefined}
 */
export function iconMimeFromHref(href) {
  const path = href.split("?")[0].toLowerCase();
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".ico")) return "image/x-icon";
  return undefined;
}
