/** Matches compact layout (`max-width: 767px`). */
export const COMPACT_LAYOUT_BREAKPOINT_PX = 768;

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  const nav = window.navigator;
  if (nav.standalone) return true;
  return false;
}

export function isLikelyWebView() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  if (/\bwv\b/.test(ua) || /; wv\)/.test(ua)) return true;
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua)) return true;
  return false;
}

export function isAppShell() {
  if (typeof window === "undefined") return false;
  return (
    isStandaloneDisplay() ||
    isLikelyWebView() ||
    window.innerWidth < COMPACT_LAYOUT_BREAKPOINT_PX
  );
}
