"use client";

import { cn } from "@/lib/cn";

export default function ReadOnlyDetail({ label, value, className, children }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {children ?? (
        <p className="mb-0 truncate text-sm font-medium text-slate-800">{value || "—"}</p>
      )}
    </div>
  );
}
