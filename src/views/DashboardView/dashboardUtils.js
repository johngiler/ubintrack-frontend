export function getColorByPercent(pct) {
  if (pct >= 80) return "#dc2626";
  if (pct < 20) return "#f97316";
  return "#16a34a";
}

export function getBarToneClass(pct) {
  if (pct >= 80) return "bg-red-500";
  if (pct < 20) return "bg-amber-500";
  return "bg-emerald-500";
}

export function getConditionBadgeVariant(condition) {
  if (condition === "Congelado") return "info";
  if (condition === "Refrigerado") return "primary";
  if (condition === "Seco") return "secondary";
  return "default";
}

/** Rango configurado en la cava (temp_min / temp_max). */
export function formatCavaTemperature(cava) {
  if (!cava) return "—";
  const min = cava.temp_min;
  const max = cava.temp_max;
  const hasMin = min !== null && min !== undefined && min !== "";
  const hasMax = max !== null && max !== undefined && max !== "";
  if (!hasMin && !hasMax) return "—";
  if (hasMin && hasMax) {
    if (Number(min) === Number(max)) return `${min}°C`;
    return `${min} / ${max}°C`;
  }
  return `${hasMin ? min : max}°C`;
}

export const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
