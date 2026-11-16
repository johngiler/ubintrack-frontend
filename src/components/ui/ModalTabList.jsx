"use client";

import { cn } from "@/lib/cn";

/**
 * Pestañas del modal (fuera de Modal.Body). Estilo subrayado, sin pill.
 */
export default function ModalTabList({ tabs = [], activeKey, onChange, className }) {
  return (
    <div
      className={cn(
        // overflow-x-auto sin overflow-y-hidden fuerza overflow-y:auto y el focus ring crea scrollbar.
        "flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--border-subtle)] px-5",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.key)}
            className={cn(
              "relative -mb-px shrink-0 cursor-pointer border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              "outline-none focus-visible:bg-[var(--surface-hover)]",
              active
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}
