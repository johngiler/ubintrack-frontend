/**
 * Resuelve URLs de media del workspace para el navegador.
 * Prefiere rutas `/media/...` (proxy de Next) frente al host del API.
 */

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
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
