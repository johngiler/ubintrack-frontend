export function readThemeTokens() {
  if (typeof window === "undefined") {
    return {
      surface: "#ffffff",
      foreground: "#0f172a",
      foregroundMuted: "#64748b",
      border: "rgba(15, 23, 42, 0.08)",
      surfaceHover: "#f8fafc",
      card: "#ffffff",
      accent: "#0ea5e9",
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    surface: pick("--surface", "#ffffff"),
    foreground: pick("--foreground", "#0f172a"),
    foregroundMuted: pick("--foreground-muted", "#64748b"),
    border: pick("--border", "rgba(15, 23, 42, 0.08)"),
    surfaceHover: pick("--surface-hover", "#f8fafc"),
    card: pick("--card", "#ffffff"),
    accent: pick("--accent", "#0ea5e9"),
  };
}
