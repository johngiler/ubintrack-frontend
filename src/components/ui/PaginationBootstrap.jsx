"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

export function Pagination({ children, className, size }) {
  return (
    <nav className={cn("inline-flex items-center gap-1", size === "sm" && "text-xs", className)}>
      {children}
    </nav>
  );
}

function PageBtn({ children, active, disabled, onClick, className, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
        active ? "btn-brand min-w-8 shadow-sm" : "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

Pagination.Prev = function PaginationPrev({ disabled, onClick, ...props }) {
  return (
    <PageBtn disabled={disabled} onClick={onClick} aria-label="Anterior" {...props}>
      <ChevronLeft className="h-4 w-4" />
    </PageBtn>
  );
};

Pagination.Next = function PaginationNext({ disabled, onClick, ...props }) {
  return (
    <PageBtn disabled={disabled} onClick={onClick} aria-label="Siguiente" {...props}>
      <ChevronRight className="h-4 w-4" />
    </PageBtn>
  );
};

Pagination.Item = function PaginationItem({ children, active, onClick, className, ...props }) {
  return (
    <PageBtn active={active} onClick={onClick} className={className} {...props}>
      {children}
    </PageBtn>
  );
};

Pagination.Ellipsis = function PaginationEllipsis() {
  return <span className="px-1 text-[var(--foreground-muted)]">…</span>;
};
