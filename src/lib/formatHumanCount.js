/**
 * Formato compacto para contadores de navegación.
 * Hasta 999 se muestra el número entero; desde 1000 usa k (ej. 2k, 1.5k).
 *
 * @param {number | string | null | undefined} value
 * @returns {string | null}
 */
export function formatHumanCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n <= 999) return String(Math.floor(n));

  const thousands = n / 1000;
  if (thousands >= 100) return `${Math.floor(thousands)}k`;

  const rounded = Math.round(thousands * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}k`;
}
