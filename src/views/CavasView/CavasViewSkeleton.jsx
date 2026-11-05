"use client";

import WmsTableSkeleton from "@/components/wms/WmsTableSkeleton";

export default function CavasViewSkeleton() {
  return (
    <WmsTableSkeleton
      minWidth={900}
      columns={[
        { kind: "text", min: 180, head: 56 },
        { kind: "text", min: 160, head: 60 },
        { kind: "badge", min: 120, head: 68 },
        { kind: "short", min: 110, head: 80 },
        { kind: "short", min: 90, head: 68 },
        { kind: "badge", min: 100, head: 48 },
        { kind: "actions", min: 120, head: 64 },
      ]}
    />
  );
}
