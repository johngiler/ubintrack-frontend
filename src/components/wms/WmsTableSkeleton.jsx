"use client";

import Skeleton from "@/components/ui/Skeleton";

function Cell({ kind }) {
  if (kind === "stack") {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }
  if (kind === "badge") return <Skeleton className="h-5 w-16 rounded-full" />;
  if (kind === "actions") {
    return (
      <div className="flex items-center gap-1">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
    );
  }
  if (kind === "wide") return <Skeleton className="h-3.5 w-48" />;
  if (kind === "short") return <Skeleton className="h-3.5 w-12" />;
  return <Skeleton className="h-3.5 w-28" />;
}

/**
 * Tabla skeleton. `columns` describe cada columna de la vista real.
 * kind: text | stack | wide | short | badge | actions
 */
export default function WmsTableSkeleton({ columns = [], rows = 8, minWidth = 720 }) {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando">
      <table className="mb-0 w-full" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-3 text-left" style={{ minWidth: col.min }}>
                <Skeleton className="h-3" style={{ width: col.head || 56 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} className="border-b border-[var(--border-subtle)] last:border-b-0">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-4 py-3.5">
                  <Cell kind={col.kind} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
