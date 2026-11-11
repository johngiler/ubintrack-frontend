/** Evita imagen en caché tras regenerar etiqueta/QR (misma ruta de archivo). */
export function bustMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://local");
    parsed.searchParams.set("t", String(Date.now()));
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}t=${Date.now()}`;
  }
}
