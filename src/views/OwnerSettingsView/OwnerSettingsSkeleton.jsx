"use client";

import Skeleton from "@/components/ui/Skeleton";

function SettingsCard({ titleWidth, fields }) {
  return (
    <div className="mb-4 rounded-2xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--surface)]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-[var(--border-subtle)]">
        <Skeleton className="h-5" style={{ width: titleWidth }} />
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerSettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <SettingsCard titleWidth={120} fields={4} />
      <SettingsCard titleWidth={160} fields={4} />
      <SettingsCard titleWidth={180} fields={4} />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
