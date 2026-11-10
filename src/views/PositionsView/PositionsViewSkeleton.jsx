"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function PositionsViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={1000}
      columns={[
        { kind: "short", min: 40, head: 24 },
        { kind: "stack", min: 160, head: 52 },
        { kind: "stack", min: 180, head: 96 },
        { kind: "badge", min: 120, head: 48 },
        { kind: "badge", min: 90, head: 56 },
        { kind: "badge", min: 90, head: 40 },
        { kind: "badge", min: 90, head: 52 },
        { kind: "actions", min: 150, head: 64 },
      ]}
    />
  );
}
