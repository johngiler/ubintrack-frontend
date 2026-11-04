/**
 * Identificador estable del tenant en el cliente (localStorage, carrito).
 * Debe alinearse con la resolución del backend (subdominio + TENANT_BASE_DOMAIN).
 */

/** Alineado al backend: no son slugs de owner. */
export const TENANT_RESERVED_SUBDOMAINS = new Set(["www", "api", "cdn"]);

/**
 * Extrae slug de `{slug}.{base}` cuando hay un solo subdominio.
 * @param {string} host
 * @param {string} base apex normalizado (p. ej. ubintrack.com)
 * @returns {string | null}
 */
function slugFromHostAndBase(host, base) {
  if (!host || !base) return null;
  if (host === base || host === `www.${base}`) return null;
  const suf = `.${base}`;
  if (!host.endsWith(suf)) return null;
  const sub = host.slice(0, -suf.length);
  if (!sub || sub.includes(".") || TENANT_RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

function envTenantSlugFallback() {
  const env = (process.env.NEXT_PUBLIC_WORKSPACE_SLUG || "").trim().toLowerCase();
  return env || "local";
}

export { envTenantSlugFallback };

/**
 * Resuelve el slug del workspace a partir del hostname (sin puerto).
 * @param {string} hostname
 * @returns {string}
 */
export function tenantSlugFromHostname(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .split(",")[0]
    .trim()
    .split(":")[0];
  if (!host) return envTenantSlugFallback();

  let base = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "").trim().toLowerCase();

  if (host.endsWith(".localhost") && host !== "localhost") {
    const sub = host.slice(0, -".localhost".length);
    if (sub && !sub.includes(".") && !TENANT_RESERVED_SUBDOMAINS.has(sub)) {
      return sub;
    }
  }

  if (!base && host.endsWith(".ubintrack.com")) {
    base = "ubintrack.com";
  }

  const fromHost = slugFromHostAndBase(host, base);
  if (fromHost) return fromHost;

  if (!base) {
    return envTenantSlugFallback();
  }

  if (host === base || host === `www.${base}`) {
    return envTenantSlugFallback();
  }

  return envTenantSlugFallback();
}

/**
 * @returns {string}
 */
export function clientTenantSlug() {
  if (typeof window === "undefined") {
    return envTenantSlugFallback();
  }
  return tenantSlugFromHostname(window.location.hostname);
}

/** Sufijo seguro para claves de `localStorage`. */
export function storageKeySuffix() {
  return clientTenantSlug().replace(/[^a-z0-9_-]/gi, "_");
}

/**
 * Cabecera para el API cuando el Host del backend no lleva subdominio (p. ej. 127.0.0.1:8001).
 * @param {string} [hostname] Host del navegador o de la petición Next (RSC); si se omite, solo aplica en cliente.
 */
export function workspaceSlugRequestHeaders(hostname) {
  let slug;
  if (hostname != null && String(hostname).trim() !== "") {
    slug = tenantSlugFromHostname(hostname);
  } else if (typeof window !== "undefined") {
    slug = clientTenantSlug();
  } else {
    return {};
  }
  if (!slug || slug === "local") return {};
  return { "X-Workspace-Slug": slug };
}

/**
 * Cabeceras de tenant para `fetch` en RSC y en cliente (usa `Host` de Next en servidor).
 * @returns {Promise<Record<string, string>>}
 */
export async function workspaceSlugHeadersForFetch() {
  if (typeof window !== "undefined") {
    return workspaceSlugRequestHeaders();
  }
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const raw = h.get("x-forwarded-host") || h.get("host") || "";
    const host = raw.split(",")[0].trim().split(":")[0];
    if (host) {
      return workspaceSlugRequestHeaders(host);
    }
  } catch {
    /* fuera de request Next */
  }
  const slug = envTenantSlugFallback();
  if (!slug || slug === "local") return {};
  return { "X-Workspace-Slug": slug };
}
