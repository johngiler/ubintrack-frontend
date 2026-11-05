"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function TariffsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={700}
      columns={[
        { kind: "wide", min: 220, head: 56 },
        { kind: "short", min: 140, head: 52 },
        { kind: "short", min: 100, head: 52 },
        { kind: "short", min: 120, head: 80 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
