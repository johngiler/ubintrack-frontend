"use client";

import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import ProgressRing from "./ProgressRing";

const TONE_MAP = {
  sky: "text-sky-600 dark:text-sky-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-500 dark:text-orange-400",
  slate: "text-slate-500 dark:text-slate-400",
};

function BreakdownCell({ label, value, subValue, tone = "slate" }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center border-slate-100 px-2 py-2.5 text-center not-last:border-r dark:border-[var(--border-subtle)]">
      <p className={`text-lg font-semibold tabular-nums ${TONE_MAP[tone] || "text-slate-800 dark:text-slate-200"}`}>
        {value ?? 0}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-[var(--foreground-muted)]">{label}</p>
      {subValue !== undefined && subValue !== null ? (
        <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">{subValue}</p>
      ) : null}
    </div>
  );
}

export default function KpiStatCard({
  title,
  total,
  icon: Icon,
  iconTone = "sky",
  breakdown,
  ringValue,
  href,
}) {
  const iconToneMap = {
    sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
    slate: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-400 dark:ring-violet-500/20",
  };

  const card = (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden",
        href &&
          "transition-shadow hover:shadow-[var(--shadow-md)] hover:ring-1 hover:ring-[var(--border)]",
      )}
    >
      <div className="flex h-[92px] shrink-0 items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[var(--foreground-muted)]">
            {title}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums leading-none text-slate-900 dark:text-[var(--foreground)]">
            {total ?? 0}
          </p>
        </div>
        {ringValue !== undefined && ringValue !== null ? (
          <ProgressRing value={ringValue} />
        ) : Icon ? (
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconToneMap[iconTone] || iconToneMap.sky}`}
          >
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
        ) : null}
      </div>
      {breakdown?.length ? (
        <div className="flex min-h-0 flex-1 border-t border-slate-100 bg-slate-50/50 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)]/40">
          {breakdown.map((item) => (
            <BreakdownCell key={item.label} {...item} />
          ))}
        </div>
      ) : null}
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block h-full cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      aria-label={`Ir a ${title}`}
    >
      {card}
    </Link>
  );
}
