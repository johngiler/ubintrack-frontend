"use client";

import Skeleton from "@/components/ui/Skeleton";
import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

function KpiCardSkeleton({ withRing = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className={withRing ? "h-11 w-11 rounded-full" : "h-11 w-11 rounded-xl"} />
      </div>
      <div className="grid grid-cols-3 border-t border-slate-100 dark:border-[var(--border-subtle)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5 px-2 py-2.5 text-center">
            <Skeleton className="mx-auto h-5 w-8" />
            <Skeleton className="mx-auto h-2.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CavaCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)]">
      <div className="mb-3 flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-3 w-32" />
      <Skeleton className="mb-3 h-2 w-full rounded-full" />
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="mx-auto h-8 w-8" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardViewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton withRing />
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--surface)]">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-[var(--border-subtle)]">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="p-4">
          <Skeleton className="mb-4 h-3 w-28" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CavaCardSkeleton />
            <CavaCardSkeleton />
            <CavaCardSkeleton />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 dark:bg-[var(--surface)]">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--surface)]">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-[var(--border-subtle)]">
          <Skeleton className="h-4 w-44" />
        </div>
        <WmsTableSkeleton
          rows={5}
          minWidth={760}
          columns={[
            { kind: "text", min: 160, head: 56 },
            { kind: "wide", min: 220, head: 120 },
            { kind: "short", min: 80, head: 36 },
            { kind: "short", min: 90, head: 60 },
            { kind: "short", min: 80, head: 52 },
          ]}
        />
      </div>
    </div>
  );
}
