"use client";

import { useEffect, useState } from "react";
import { PanelLeft, PanelLeftClose } from "lucide-react";

import { cn } from "@/lib/cn";

export function SidebarToggle({ collapsed, onClick, className }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const showExpandIcon = isDesktop && collapsed;
  const label = !isDesktop
    ? "Abrir menú lateral"
    : collapsed
      ? "Expandir menú lateral"
      : "Contraer menú lateral";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={isDesktop ? !collapsed : undefined}
      className={cn(
        "group flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground-muted)] shadow-sm ring-1 ring-[var(--border)] transition-all duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--brand-primary)] hover:ring-[color-mix(in_srgb,var(--brand-primary)_22%,transparent)] active:scale-95",
        className,
      )}
    >
      <span className="relative h-[18px] w-[18px]">
        <PanelLeftClose
          aria-hidden
          strokeWidth={2}
          className={cn(
            "absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ease-out",
            showExpandIcon
              ? "scale-75 opacity-0 -rotate-12"
              : "scale-100 opacity-100 rotate-0",
          )}
        />
        <PanelLeft
          aria-hidden
          strokeWidth={2}
          className={cn(
            "absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ease-out",
            showExpandIcon
              ? "scale-100 opacity-100 rotate-0"
              : "scale-75 opacity-0 rotate-12",
          )}
        />
      </span>
    </button>
  );
}
