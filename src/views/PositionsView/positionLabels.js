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
  const hall = position.hall ? `Pasillo ${position.hall}` : "—";
  const rack = position.rack ? `Rack ${position.rack}` : "—";
  const level = position.level != null ? `Nivel ${position.level}${position.place ?? ""}` : "—";
  const cava = position.cava ? cavaTitleOf(position.cava.name, position.cava.code) : "—";
  return `${cava} / ${hall} / ${rack} / ${level}`;
}
