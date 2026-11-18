/**
 * Helpers para guardar solo lo modificado en modales/formularios.
 * Regla: `.cursor/rules/frontend-modal-dirty-saves.mdc`
 */

export function stableStringify(value) {
  return JSON.stringify(value, (_, v) => (v === undefined ? null : v));
}

export function valuesEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

export function normalizeExtraFields(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => String(row?.name || "").trim())
    .map((row) => {
      const type = row.type || "normal";
      let value = row.value ?? "";
      if (type === "check") value = Boolean(value);
      else if (type === "normal") value = String(value).slice(0, 60);
      else if (type === "texto") {
        value = String(value).split("\n").slice(0, 6).join("\n");
      }
      return {
        name: String(row.name).trim(),
        type,
        value,
      };
    });
}

export function emptyToNull(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

export function numOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
