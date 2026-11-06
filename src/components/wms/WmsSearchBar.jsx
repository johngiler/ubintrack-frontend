"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export default function WmsSearchBar({ id, value, onChange, onClear, placeholder, className }) {
  return (
    <div
      className={cn(
        "relative w-full p-0.5 sm:max-w-md sm:min-w-[320px] lg:min-w-[400px]",
        className,
      )}
    >
      <Input
        id={id}
        icon={Search}
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "h-9 bg-[var(--surface)] text-sm dark:bg-[var(--surface)]",
          value && "pr-10",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
