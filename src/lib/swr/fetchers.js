import httpClient from "@/services/httpClient";

/**
 * GET JSON autenticado (Token + tenant headers vía httpClient).
 * Clave = ruta relativa al API, p. ej. `/api/notifications/?page=1`.
 */
export async function authJsonFetcher(path) {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("authJsonFetcher: la clave debe ser una ruta que empiece con /");
  }
  const { data } = await httpClient.get(path);
  return data;
}
