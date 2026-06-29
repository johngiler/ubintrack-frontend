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
