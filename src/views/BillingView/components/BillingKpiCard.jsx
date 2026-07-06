"use client";

import { Card } from "@/components/ui/Card";

export default function BillingKpiCard({ label, value, badge, color, icon: Icon }) {
  const resolvedColor = !color || color === "#0f172a" ? "var(--foreground)" : color;

  return (
    <Card className="h-full">
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[var(--foreground-muted)]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: resolvedColor }}>
          ${value}
        </p>
        {badge ? (
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${resolvedColor}20`, color: resolvedColor }}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {badge}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
