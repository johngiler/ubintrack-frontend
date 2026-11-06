"use client";

import { useEffect, useRef } from "react";

import { PRESENCE_IDLE_MS } from "@/lib/presence";

/**
 * Avisa activo/inactivo por el WebSocket.
 * Pestaña oculta → inactivo al momento. Actividad o pestaña visible → activo.
 */
export function usePresenceActivity(enabled, sendStatus) {
  const statusRef = useRef("active");
  const idleTimer = useRef(null);
  const sendRef = useRef(sendStatus);
  sendRef.current = sendStatus;

  useEffect(() => {
    if (!enabled) return undefined;

    function apply(next) {
      if (statusRef.current === next) return;
      statusRef.current = next;
      sendRef.current(next);
    }

    function clearIdleTimer() {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    }

    function armIdleTimer() {
      clearIdleTimer();
      idleTimer.current = setTimeout(() => {
        apply("idle");
      }, PRESENCE_IDLE_MS);
    }

    function onActivity() {
      if (typeof document !== "undefined" && document.hidden) return;
      apply("active");
      armIdleTimer();
    }

    function onVisibility() {
      if (document.hidden) {
        clearIdleTimer();
        apply("idle");
        return;
      }
      apply("active");
      armIdleTimer();
    }

    apply("active");
    armIdleTimer();

    const activityEvents = ["pointerdown", "keydown", "mousemove", "scroll", "touchstart"];
    for (const name of activityEvents) {
      window.addEventListener(name, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearIdleTimer();
      for (const name of activityEvents) {
        window.removeEventListener(name, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
