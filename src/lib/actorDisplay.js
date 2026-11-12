function looksLikeEmail(value) {
  return /^[^\s]+@[^\s]+$/.test(value || "");
}

function emailLocalName(email) {
  return (email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalizeFirst(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Quita el actor del inicio del texto (nombre o correo).
 * La UI ya lo muestra en una sublínea.
 */
export function withoutActorPrefix(text, actorDisplay) {
  let raw = String(text || "").trim();
  if (!raw) return "";

  raw = raw.replace(/^[^\s]+@[^\s]+\s+/, "");

  const name = (actorDisplay || "").trim();
  const safeName =
    name && !looksLikeEmail(name)
      ? name
      : name && looksLikeEmail(name)
        ? emailLocalName(name)
        : "";

  if (safeName && safeName !== "Sistema") {
    const escaped = safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    raw = raw.replace(new RegExp(`^${escaped}\\s+`, "i"), "");
  }

  return capitalizeFirst(raw.trim());
}

/** Nombre visible para la sublínea del actor. */
export function actorSubtitle(actorDisplay) {
  const name = (actorDisplay || "").trim();
  if (!name || name === "Sistema") return "";
  if (looksLikeEmail(name)) return emailLocalName(name);
  return name;
}

/** @deprecated usar withoutActorPrefix */
export function withActorName(text, actorDisplay) {
  return withoutActorPrefix(text, actorDisplay);
}
