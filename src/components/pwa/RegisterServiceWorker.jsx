"use client";

import { useEffect } from "react";

/** Registers the minimal SW so Chromium offers «Install app». */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const { protocol, hostname } = window.location;
    const ok =
      protocol === "https:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (!ok) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Ignore registration failures (private mode, blocked, etc.).
    });
  }, []);

  return null;
}
