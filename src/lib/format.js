/** Tipos de documento WMS tras el slug de owner (COLDCAVE-TASK-… → TASK-…). */
const DOCUMENT_CODE_TYPES = new Set([
  "TASK",
  "ENTRADA",
  "SALIDA",
  "PRODUCTO",
]);

/**
 * Código corto para UI: quita el prefijo de owner/workspace.
 * COLDCAVE-TASK-0000000001 → TASK-0000000001
 * PROTENAPA-ENTRADA-00000010 → ENTRADA-00000010
 * BIN-… / posiciones no se tocan.
 */
export function formatDocumentCode(code) {
  const text = String(code || "").trim();
  if (!text) return "";
  const parts = text.split("-");
  if (parts.length >= 3 && DOCUMENT_CODE_TYPES.has(String(parts[1] || "").toUpperCase())) {
    return parts.slice(1).join("-");
  }
  return text;
}

export const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
