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

export function cavaTitleOf(name, code) {
  const token = String(code || "").trim();
  const given = String(name || "").trim();
  if (given) {
    return token && !given.endsWith(token) ? `${given} ${token}` : given;
  }
  return token ? `Cava ${token}` : "—";
}

export function formatLocation(position) {
  if (!position) return "—";
  // hall ya es token (P1, T1, P1-P2); numérico legacy → «Pasillo N».
  const hallRaw = String(position.hall || "").trim();
  const hall = hallRaw
    ? /^\d+$/.test(hallRaw)
      ? `Pasillo ${hallRaw}`
      : hallRaw
    : "—";
  const rackRaw = String(position.rack || "").trim();
  const isFloor = !rackRaw;
  const rack = isFloor ? "Piso" : `Rack ${rackRaw}`;
  const level = isFloor
    ? position.place
      ? `#${position.place}`
      : "—"
    : position.level != null
      ? `Nivel ${position.level}${position.place ?? ""}`
      : "—";
  const cava = position.cava ? cavaTitleOf(position.cava.name, position.cava.code) : "—";
  return `${cava} / ${hall} / ${rack} / ${level}`;
}
