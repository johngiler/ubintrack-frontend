"use client";

import Skeleton from "@/components/ui/Skeleton";

/**
 * variant:
 * - notification: punto + mensaje + autor + hora
 * - timeline: icono circular + título + dos líneas de detalle
 */
export default function WmsFeedSkeleton({ rows = 4, variant = "timeline", className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) =>
        variant === "notification" ? (
          <div key={i} className="flex gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
            <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ) : (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-[var(--border-subtle)] p-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
