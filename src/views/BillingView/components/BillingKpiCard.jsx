"use client";

import { Card } from "@/components/ui/Card";

export default function BillingKpiCard({ label, value, badge, color = "#0f172a", icon: Icon }) {
  return (
    <Card className="h-full">
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
          ${value}
        </p>
        {badge ? (
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {badge}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
