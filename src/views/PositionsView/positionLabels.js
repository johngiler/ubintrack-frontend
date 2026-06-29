export const statusLabels = {
  libre: "Libre",
  asignado: "Asignado",
  ocupado: "Ocupado",
};

export const statusBadgeVariant = {
  libre: "success",
  asignado: "warning",
  ocupado: "danger",
};

export const DEFAULT_HALLS = ["A", "B", "C", "D"];
export const DEFAULT_RACKS = Array.from({ length: 17 }, (_, index) => index + 1);
export const DEFAULT_PLACES = [
  { value: "A", label: "A - Adelante" },
  { value: "B", label: "B - Atrás" },
];

export function hallOption(value) {
  return { value, label: `Pasillo ${value}` };
}

export function rackOption(value) {
  return { value: String(value), label: `Rack ${value}` };
}

export function placeOption(value, label) {
  const known = DEFAULT_PLACES.find((item) => item.value === value);
  return known ?? { value, label: label ?? value };
}

export function buildHallOptions(extraValues = []) {
  const values = [...new Set([...DEFAULT_HALLS, ...extraValues].filter(Boolean))];
  return values.map(hallOption);
}

export function buildRackOptions(extraValues = []) {
  const values = [
    ...new Set([...DEFAULT_RACKS.map(String), ...extraValues.map(String)].filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));
  return values.map(rackOption);
}

export function buildPlaceOptions(extraValues = []) {
  const map = new Map(DEFAULT_PLACES.map((item) => [item.value, item]));
  extraValues.filter(Boolean).forEach((value) => {
    if (!map.has(value)) {
      map.set(value, placeOption(value));
    }
  });
  return [...map.values()];
}

export function parseHallInput(input) {
  const trimmed = String(input ?? "").trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length === 1) return trimmed;
  const match = trimmed.match(/PASILLO\s*([A-Z0-9])/i);
  return match ? match[1] : trimmed.slice(-1);
}

export function parseRackInput(input) {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return String(parseInt(digits, 10));
}

export function parsePlaceInput(input) {
  const trimmed = String(input ?? "").trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length === 1) return trimmed;
  const match = trimmed.match(/^([A-Z0-9])\s*[-–]/i) ?? trimmed.match(/^([A-Z0-9])/i);
  return match ? match[1].toUpperCase() : trimmed.slice(0, 1).toUpperCase();
}

export function formatLocation(position) {
  if (!position) return "—";
  const hall = position.hall ? `Pasillo ${position.hall}` : "—";
  const rack = position.rack ? `Rack ${position.rack}` : "—";
  const level = position.level != null ? `Nivel ${position.level}${position.place ?? ""}` : "—";
  const cava = position.cava?.name ?? "—";
  return `${cava} / ${hall} / ${rack} / ${level}`;
}
