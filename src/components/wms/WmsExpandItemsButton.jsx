"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/cn";

function pluralize(count, singular) {
  return count === 1 ? singular : `${singular}s`;
}

/**
 * Botón estándar para expandir listas relacionadas en tablas WMS
 * (p. ej. "Ver 2 productos" en entradas, bins, salidas).
 */
export function WmsExpandItemsButton({
  count,
  expanded,
  onClick,
  itemLabel = "producto",
  suffix = null,
  className,
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100",
        className,
      )}
      onClick={onClick}
      aria-expanded={expanded}
    >
      {expanded ? (
        <ChevronUp className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      )}
      Ver {count} {pluralize(count, itemLabel)}
      {suffix}
    </button>
  );
}

export function WmsExpandItemsEmpty({ label = "Sin productos", className }) {
  return <span className={cn("text-sm text-slate-400", className)}>{label}</span>;
}
