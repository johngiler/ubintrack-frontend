"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/cn";

const DEFAULT_MESSAGE = "En proceso. Puedes continuar mientras se procesa.";

/**
 * Aviso persistente de trabajos async (Celery): spinner + barra indeterminada.
 * Se mantiene visible mientras haya jobs activos en la sección.
 */
export default function AsyncProcessBanner({
  jobs = [],
  message,
  className,
}) {
  const active = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  if (!active.length && !message) return null;

  const primary = active[0];
  const text =
    message ||
    primary?.message ||
    DEFAULT_MESSAGE;
  const extra =
    active.length > 1 ? ` · ${active.length} en proceso` : "";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mb-3 overflow-hidden rounded-xl border border-sky-200 bg-sky-50 text-sky-900",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-sky-600"
          aria-hidden
        />
        <span className="flex-1 font-medium">
          {text}
          {extra}
        </span>
      </div>
      <div className="relative h-1 w-full overflow-hidden bg-sky-100">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-sky-500"
          animate={{ x: ["-100%", "320%"] }}
          transition={{
            duration: 1.4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      </div>
    </div>
  );
}
