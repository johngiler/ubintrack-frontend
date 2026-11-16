"use client";

import { useEffect } from "react";
import { isAppShell } from "@/lib/inAppNav";

function allowPinch(target) {
  return target instanceof Element && Boolean(target.closest("[data-allow-pinch]"));
}

/**
 * Blocks pinch / double-tap page zoom in the PWA and native WebView.
 * iOS ignores user-scalable=no in Safari; gesture + touch-action cover that.
 */
export default function LockAppZoom() {
  useEffect(() => {
    if (!isAppShell()) return undefined;

    document.documentElement.classList.add("app-no-zoom");

    const preventGesture = (event) => {
      if (allowPinch(event.target)) return;
      event.preventDefault();
    };
    const preventPinchMove = (event) => {
      if (event.touches.length < 2) return;
      if (allowPinch(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });
    document.addEventListener("touchmove", preventPinchMove, { passive: false });

    return () => {
      document.documentElement.classList.remove("app-no-zoom");
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventPinchMove);
    };
  }, []);

  return null;
}
