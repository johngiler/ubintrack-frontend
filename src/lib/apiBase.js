/**
 * URL base del API (NEXT_PUBLIC_API_URL). Compartido por `services/api` y `lib/mediaUrls`.
 *
 * Si en producción falta `NEXT_PUBLIC_API_URL`, las rutas `/media/...` relativas se resolvían contra
 * el host del portal (p. ej. acme.ubintrack.com) y las miniaturas devolvían 404. Fallback:
 * `https://api.${NEXT_PUBLIC_TENANT_BASE_DOMAIN}` cuando exista (alineado a `.env.production.example`).
 */
export function apiBase() {
  const env = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8001";
  }
  const tenant = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "")
    .trim()
    .toLowerCase();
  if (tenant) {
    return `https://api.${tenant}`;
  }
  return "";
}

/**
 * En el navegador, `*.localhost` llama al API por el mismo origen (`/api` de Next).
 * Ir directo a 127.0.0.1 deja la petición pendiente en Chrome y el panel no sale de "Cargando".
 * En el servidor y en producción se usa la URL absoluta del API.
 */
export function clientApiBase() {
  if (typeof window === "undefined") return apiBase();
  const host = window.location.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) return "";
  return apiBase();
}

/**
 * En local el navegador no llama `/api/...`: Chrome cacheó el 308/301 de esa ruta
 * y entra en ERR_TOO_MANY_REDIRECTS sin volver a preguntar al servidor.
 * `/apibff/` es el mismo reenvío, con una URL que no está en esa caché.
 */
export function rewriteLocalApiPath(url) {
  if (typeof url !== "string" || !url.startsWith("/api/")) return url;
  if (typeof window === "undefined" || clientApiBase() !== "") return url;
  return `/apibff/${url.slice("/api/".length)}`;
}
