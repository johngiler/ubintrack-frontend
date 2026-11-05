"use client";

import Skeleton from "@/components/ui/Skeleton";

/** Grilla de pares etiqueta/valor, como el detalle del bin. */
export default function WmsDetailSkeleton({ rows = 4, className = "" }) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 ${className}`}
      aria-busy="true"
      aria-label="Cargando"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className={`h-4 ${i % 2 === 0 ? "w-28" : "w-20"}`} />
        </div>
      ))}
    </div>
  );
}
