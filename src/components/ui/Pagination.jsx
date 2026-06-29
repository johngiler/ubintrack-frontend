"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/Button";

export function Pagination({ currentPage, totalPages, onPageChange, className }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Paginación">
      <IconButton
        variant="secondary"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </IconButton>
      {start > 1 ? (
        <>
          <PageBtn n={1} active={currentPage === 1} onClick={() => onPageChange(1)} />
          {start > 2 ? <span className="px-1 text-slate-400">…</span> : null}
        </>
      ) : null}
      {pages.map((n) => (
        <PageBtn key={n} n={n} active={currentPage === n} onClick={() => onPageChange(n)} />
      ))}
      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="px-1 text-slate-400">…</span> : null}
          <PageBtn n={totalPages} active={currentPage === totalPages} onClick={() => onPageChange(totalPages)} />
        </>
      ) : null}
      <IconButton
        variant="secondary"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </IconButton>
    </nav>
  );
}

function PageBtn({ n, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
        active ? "btn-brand min-w-8 shadow-sm" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {n}
    </button>
  );
}
