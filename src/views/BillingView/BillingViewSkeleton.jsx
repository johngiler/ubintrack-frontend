"use client";

import Skeleton from "@/components/ui/Skeleton";
import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

function BillingKpiSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 dark:bg-[var(--surface)]">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-20" />
      <Skeleton className="mt-3 h-6 w-24 rounded-full" />
    </div>
  );
}

export default function BillingViewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <BillingKpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BillingKpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 dark:bg-[var(--surface)]">
          <Skeleton className="mb-4 h-4 w-52" />
          <Skeleton className="mx-auto h-64 w-64 rounded-full" />
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 dark:bg-[var(--surface)]">
          <Skeleton className="mb-4 h-4 w-56" />
          <div className="flex h-72 items-end gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="w-full rounded-t" style={{ height: 40 + ((i * 37) % 180) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillingClientsSkeleton() {
  return (
    <WmsTableSkeleton
      rows={8}
      minWidth={860}
      columns={[
        { kind: "text", min: 160, head: 56 },
        { kind: "short", min: 120, head: 100 },
        { kind: "short", min: 100, head: 60 },
        { kind: "short", min: 100, head: 52 },
        { kind: "short", min: 110, head: 72 },
        { kind: "short", min: 110, head: 64 },
        { kind: "actions", min: 80, head: 64 },
      ]}
    />
  );
}
