"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Pie «Cargar más» para grids / acordeones (PortPax InfiniteScrollFooter mode=button).
 */
export default function LoadMoreFooter({
  hasMore,
  loading = false,
  onLoadMore,
  loadedCount,
  totalCount,
  itemLabel = "ítems",
  disabled = false,
  className,
}) {
  if (!totalCount || totalCount <= 0) return null;
  // Listas cortas ya visibles enteras: no molestar con el pie.
  if (!hasMore && loadedCount >= totalCount && totalCount <= 12) return null;

  return (
    <div
      className={cn(
        "mt-3 flex flex-col items-center gap-2 px-2 pb-1",
        className,
      )}
    >
      {hasMore ? (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => {
            void onLoadMore?.();
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Cargando…
            </>
          ) : (
            "Cargar más"
          )}
        </button>
      ) : null}
      <p className="text-center text-[11px] text-[var(--foreground-muted)]">
        {loadedCount} de {totalCount} {itemLabel}
      </p>
    </div>
  );
}
